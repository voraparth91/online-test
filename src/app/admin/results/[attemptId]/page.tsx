import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ResultQuestionCard } from "@/components/result-question-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { AttemptAnswerWithQuestion, ExamAttemptWithCandidate } from "@/lib/types";

export default async function AdminAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("exam_attempts")
    .select("*, exams(title), profiles(full_name, email)")
    .eq("id", attemptId)
    .not("submitted_at", "is", null)
    .single();

  if (!attempt) redirect("/admin/dashboard");

  const { data: answers } = await supabase
    .from("attempt_answers")
    .select("*, questions(question_text, options, correct_option, sort_order)")
    .eq("attempt_id", attemptId)
    .order("questions(sort_order)");

  const percentage = Math.round(
    ((attempt.score ?? 0) / attempt.total_questions) * 100
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attempt Detail</h1>
        <Link href={`/admin/exams/${attempt.exam_id}/results`}>
          <Button variant="outline">Back to Results</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{(attempt as ExamAttemptWithCandidate & { exams: { title: string } }).exams?.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-gray-500">Candidate</p>
              <p className="font-medium">
                {(attempt as ExamAttemptWithCandidate & { exams: { title: string } }).profiles?.full_name} (
                {(attempt as ExamAttemptWithCandidate & { exams: { title: string } }).profiles?.email})
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">
                {attempt.score}/{attempt.total_questions}
              </p>
              <p className="text-sm text-gray-500">Score</p>
            </div>
            <div className="text-center">
              <p
                className={`text-3xl font-bold ${
                  percentage >= 70 ? "text-green-600" : "text-red-600"
                }`}
              >
                {percentage}%
              </p>
              <p className="text-sm text-gray-500">Percentage</p>
            </div>
            <div>
              <p className="text-sm text-gray-500" suppressHydrationWarning>
                {new Date(attempt.submitted_at!).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {(answers as AttemptAnswerWithQuestion[])?.map((a, i) => (
          <ResultQuestionCard
            key={a.id}
            index={i + 1}
            questionText={a.questions.question_text}
            options={a.questions.options}
            selectedOption={a.selected_option}
            correctOption={a.questions.correct_option}
            isCorrect={a.is_correct ?? false}
          />
        ))}
      </div>
    </div>
  );
}
