"use server";

import { createClient } from "@/lib/supabase/server";
import { createQuestionSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  return { supabase };
}

export async function createQuestion(examId: string, formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = createQuestionSchema.safeParse({
    question_text: formData.get("question_text"),
    options: [
      { label: "A", text: formData.get("option_a") },
      { label: "B", text: formData.get("option_b") },
      { label: "C", text: formData.get("option_c") },
      { label: "D", text: formData.get("option_d") },
    ],
    correct_option: formData.get("correct_option"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data: existing } = await supabase
    .from("questions")
    .select("sort_order")
    .eq("exam_id", examId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

  const { error } = await supabase.from("questions").insert({
    exam_id: examId,
    question_text: parsed.data.question_text,
    options: parsed.data.options,
    correct_option: parsed.data.correct_option,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/exams/${examId}`);
  return { success: true };
}

export async function deleteQuestion(examId: string, questionId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/exams/${examId}`);
  return { success: true };
}
