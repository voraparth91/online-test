import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExamAttemptWithCandidate } from "@/lib/types";

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("title")
    .eq("id", examId)
    .single();

  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("*, profiles(full_name, email)")
    .eq("exam_id", examId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Results: {exam?.title}</h1>
          <p className="text-gray-500">
            {attempts?.length ?? 0} completed attempt
            {(attempts?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href={`/admin/exams/${examId}`}>
          <Button variant="outline">Back to Exam</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!attempts || attempts.length === 0 ? (
            <p className="text-gray-500">No completed attempts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attempts as ExamAttemptWithCandidate[]).map((a) => {
                  const pct = Math.round(
                    ((a.score ?? 0) / a.total_questions) * 100
                  );
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.profiles?.full_name}
                      </TableCell>
                      <TableCell>
                        {a.score}/{a.total_questions}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={pct >= 70 ? "default" : "destructive"}
                        >
                          {pct}%
                        </Badge>
                      </TableCell>
                      <TableCell suppressHydrationWarning>
                        {new Date(a.submitted_at!).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/results/${a.id}`}>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
