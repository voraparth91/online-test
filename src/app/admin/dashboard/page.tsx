import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, ClipboardCheck } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: candidateCount },
    { count: examCount },
    { count: attemptCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "candidate"),
    supabase.from("exams").select("*", { count: "exact", head: true }),
    supabase
      .from("exam_attempts")
      .select("*", { count: "exact", head: true })
      .not("submitted_at", "is", null),
  ]);

  const stats = [
    {
      label: "Total Candidates",
      value: candidateCount ?? 0,
      icon: Users,
    },
    {
      label: "Total Exams",
      value: examCount ?? 0,
      icon: FileText,
    },
    {
      label: "Completed Attempts",
      value: attemptCount ?? 0,
      icon: ClipboardCheck,
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
