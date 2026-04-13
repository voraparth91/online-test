"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { startExamAttempt, submitExam, getExamForTaking } from "@/actions/exam-taking";
import type { Exam, Question } from "@/lib/types";
import { QuestionCard } from "@/components/question-card";
import { ExamTimer } from "@/components/exam-timer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TakeExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      // Fetch exam + questions via server action (correct_option never sent)
      const examResult = await getExamForTaking(examId);
      if (examResult.error || !examResult.exam) {
        setError(examResult.error ?? "Exam not found");
        setLoading(false);
        return;
      }

      setExam(examResult.exam);
      setQuestions(
        (examResult.questions ?? []).map((q: Omit<Question, "correct_option">) => ({
          ...q,
          correct_option: "", // Never sent from server
        }))
      );

      // Start or resume attempt
      const result = await startExamAttempt(examId);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setAttemptId(result.attemptId!);

      // Use existing attempt's started_at if resuming
      if (examResult.existingAttempt) {
        setStartedAt(examResult.existingAttempt.started_at);
      } else {
        setStartedAt(new Date().toISOString());
      }

      setLoading(false);
    }
    init();
  }, [examId]);

  function handleSelect(questionId: string, option: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  const handleSubmit = useCallback(async () => {
    if (!attemptId || submitting) return;
    setSubmitting(true);

    const answerList = questions.map((q) => ({
      question_id: q.id,
      selected_option: answers[q.id] ?? null,
    }));

    try {
      const result = await submitExam({ attempt_id: attemptId, answers: answerList });
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
      } else if (result?.redirectTo) {
        router.push(result.redirectTo);
      } else {
        // Fallback: if no redirect info, go to dashboard
        router.push("/candidate/dashboard");
      }
    } catch {
      // Server action may throw on redirect or network issues
      router.push("/candidate/dashboard");
    }
  }, [attemptId, answers, questions, submitting, router]);

  if (loading) return <p className="text-gray-500 p-8">Loading exam...</p>;
  if (error)
    return (
      <Alert variant="destructive" className="m-8">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!exam) return null;

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;

  return (
    <div className="space-y-6">
      {/* Sticky header with timer */}
      <div className="sticky top-0 z-10 bg-gray-50 border-b pb-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-4">
            {exam.time_limit_minutes && startedAt && (
              <ExamTimer
                startedAt={startedAt}
                timeLimitMinutes={exam.time_limit_minutes}
                onTimeUp={handleSubmit}
              />
            )}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Exam"}
            </Button>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i + 1}
            questionId={q.id}
            questionText={q.question_text}
            options={q.options}
            selectedOption={answers[q.id] ?? null}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Bottom submit */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <p className="text-sm text-gray-500">
            {answeredCount} of {questions.length} questions answered
          </p>
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            {submitting ? "Submitting..." : "Submit Exam"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
