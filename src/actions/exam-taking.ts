"use server";

import { createClient } from "@/lib/supabase/server";
import { submitExamSchema } from "@/lib/validations";
import { scoreExam } from "@/lib/scoring";
import { revalidatePath } from "next/cache";

export async function getExamForTaking(examId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("is_live", true)
    .single();

  if (!exam) return { error: "Exam not found or not live" };

  // Fetch questions WITHOUT correct_option — server strips it
  const { data: questions } = await supabase
    .from("questions")
    .select("id, exam_id, question_text, options, sort_order")
    .eq("exam_id", examId)
    .order("sort_order");

  // Fetch in-progress attempt if any
  const { data: existingAttempt } = await supabase
    .from("exam_attempts")
    .select("id, started_at")
    .eq("exam_id", examId)
    .eq("candidate_id", user.id)
    .is("submitted_at", null)
    .single();

  return {
    exam,
    questions: (questions ?? []).map((q) => ({
      id: q.id,
      exam_id: q.exam_id,
      question_text: q.question_text,
      options: q.options,
      sort_order: q.sort_order,
    })),
    existingAttempt,
  };
}

export async function startExamAttempt(examId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Check if exam is live
  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .eq("is_live", true)
    .single();

  if (!exam) return { error: "Exam not found or not live" };

  // Check for in-progress attempt
  const { data: existing } = await supabase
    .from("exam_attempts")
    .select("id")
    .eq("exam_id", examId)
    .eq("candidate_id", user.id)
    .is("submitted_at", null)
    .single();

  if (existing) {
    return { attemptId: existing.id };
  }

  // Check max attempts
  if (exam.max_attempts) {
    const { count } = await supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", examId)
      .eq("candidate_id", user.id)
      .not("submitted_at", "is", null);

    if (count !== null && count >= exam.max_attempts) {
      return { error: "Maximum attempts reached" };
    }
  }

  // Get question count
  const { count: questionCount } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("exam_id", examId);

  // Create new attempt
  const { data: attempt, error } = await supabase
    .from("exam_attempts")
    .insert({
      exam_id: examId,
      candidate_id: user.id,
      total_questions: questionCount ?? 0,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  return { attemptId: attempt.id };
}

export async function submitExam(formData: {
  attempt_id: string;
  answers: { question_id: string; selected_option: string | null }[];
}) {
  const parsed = submitExamSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Verify attempt belongs to user and is not submitted
  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("id", parsed.data.attempt_id)
    .eq("candidate_id", user.id)
    .is("submitted_at", null)
    .single();

  if (!attempt) return { error: "Attempt not found or already submitted" };

  // Fetch correct answers (server-side only)
  const { data: questions } = await supabase
    .from("questions")
    .select("id, correct_option")
    .eq("exam_id", attempt.exam_id);

  if (!questions) return { error: "Failed to fetch questions" };

  // Score the exam
  const { score, details } = scoreExam(questions, parsed.data.answers);

  // Insert answers
  const answerRows = details.map((d) => ({
    attempt_id: attempt.id,
    question_id: d.question_id,
    selected_option: d.selected_option,
    is_correct: d.is_correct,
  }));

  const { error: answerError } = await supabase
    .from("attempt_answers")
    .insert(answerRows);

  if (answerError) return { error: answerError.message };

  // Update attempt with score and submission time
  const { error: updateError } = await supabase
    .from("exam_attempts")
    .update({
      submitted_at: new Date().toISOString(),
      score,
    })
    .eq("id", attempt.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/candidate/dashboard");
  return { success: true, redirectTo: `/candidate/results/${attempt.id}` };
}
