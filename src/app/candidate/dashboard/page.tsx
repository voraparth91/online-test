import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, FileText, CheckCircle2 } from "lucide-react";
import type { Exam, ExamAttemptWithExam } from "@/lib/types";

export default async function CandidateDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch live exams
  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .eq("is_live", true)
    .order("created_at", { ascending: false });

  // Fetch this candidate's completed attempts
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, exams(title)")
    .eq("candidate_id", user!.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  // Count attempts per exam
  const attemptCounts: Record<string, number> = {};
  if (attempts) {
    for (const a of attempts) {
      attemptCounts[a.exam_id] = (attemptCounts[a.exam_id] || 0) + 1;
    }
  }

  // Check for in-progress attempts
  const { data: inProgressAttempts } = await supabase
    .from("exam_attempts")
    .select("*, exams(title)")
    .eq("candidate_id", user!.id)
    .is("submitted_at", null);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">My Dashboard</h1>

      {/* In-progress exams */}
      {inProgressAttempts && inProgressAttempts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inProgressAttempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span>{(a as ExamAttemptWithExam).exams?.title ?? "Exam"}</span>
                <Link href={`/candidate/exam/${a.exam_id}`}>
                  <Button size="sm">Continue</Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available exams */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Available Exams</h2>
        {!exams || exams.length === 0 ? (
          <p className="text-gray-500">No exams available right now.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(exams as Exam[]).map((exam) => {
              const usedAttempts = attemptCounts[exam.id] || 0;
              const canTake =
                !exam.max_attempts || usedAttempts < exam.max_attempts;

              return (
                <Card key={exam.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{exam.title}</CardTitle>
                    {exam.description && (
                      <CardDescription>{exam.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      {exam.time_limit_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {exam.time_limit_minutes} min
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {usedAttempts}
                        {exam.max_attempts ? `/${exam.max_attempts}` : ""}{" "}
                        attempts
                      </span>
                    </div>
                    {canTake ? (
                      <Link href={`/candidate/exam/${exam.id}`}>
                        <Button className="w-full">
                          {usedAttempts > 0 ? "Retake Exam" : "Start Exam"}
                        </Button>
                      </Link>
                    ) : (
                      <Badge variant="secondary" className="w-full justify-center py-2">
                        Max attempts reached
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Separator />

      {/* Past attempts */}
      <section>
        <h2 className="text-lg font-semibold mb-4">My Results</h2>
        {!attempts || attempts.length === 0 ? (
          <p className="text-gray-500">No completed exams yet.</p>
        ) : (
          <div className="space-y-3">
            {(attempts as ExamAttemptWithExam[]).map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{a.exams?.title ?? "Exam"}</p>
                    <p className="text-sm text-gray-500" suppressHydrationWarning>
                      {new Date(a.submitted_at!).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {a.score}/{a.total_questions}
                      </p>
                      <p className="text-sm text-gray-500">
                        {Math.round(((a.score ?? 0) / a.total_questions) * 100)}%
                      </p>
                    </div>
                    <Link href={`/candidate/results/${a.id}`}>
                      <Button variant="outline" size="sm">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
