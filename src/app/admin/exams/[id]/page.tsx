"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateExam } from "@/actions/exams";
import { createQuestion, updateQuestion, deleteQuestion } from "@/actions/questions";
import type { Exam, Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";

export default function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: examId } = use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  async function fetchData() {
    const supabase = createClient();
    const [{ data: examData }, { data: questionsData }] = await Promise.all([
      supabase.from("exams").select("*").eq("id", examId).single(),
      supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examId)
        .order("sort_order"),
    ]);
    setExam(examData);
    setQuestions(questionsData ?? []);
    setLoading(false);
  }

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchData();
  }, [examId]);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function handleUpdateExam(formData: FormData) {
    const result = await updateExam(examId, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Exam updated");
    }
    fetchData();
  }

  async function handleCreateQuestion(formData: FormData) {
    const result = await createQuestion(examId, formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setDialogOpen(false);
    toast.success("Question added");
    fetchData();
  }

  async function handleEditQuestion(formData: FormData) {
    if (!editingQuestion) return;
    const result = await updateQuestion(examId, editingQuestion.id, formData);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setEditingQuestion(null);
    toast.success("Question updated");
    fetchData();
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Delete this question?")) return;
    setDeletingId(questionId);
    const result = await deleteQuestion(examId, questionId);
    setDeletingId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Question deleted");
    fetchData();
  }

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (!exam) return <p className="text-red-500">Exam not found.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit Exam</h1>

      {/* Exam Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleUpdateExam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={exam.title} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={exam.description}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
                <Input
                  id="time_limit_minutes"
                  name="time_limit_minutes"
                  type="number"
                  min="1"
                  defaultValue={exam.time_limit_minutes ?? ""}
                  placeholder="No limit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_attempts">Max Attempts</Label>
                <Input
                  id="max_attempts"
                  name="max_attempts"
                  type="number"
                  min="1"
                  defaultValue={exam.max_attempts ?? ""}
                  placeholder="Unlimited"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <input
                  type="hidden"
                  name="is_live"
                  value={exam.is_live ? "true" : "false"}
                />
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant={exam.is_live ? "default" : "secondary"}>
                    {exam.is_live ? "Live" : "Draft"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={toggling}
                    onClick={async () => {
                      setToggling(true);
                      const fd = new FormData();
                      fd.set("title", exam.title);
                      fd.set("description", exam.description);
                      if (exam.time_limit_minutes)
                        fd.set("time_limit_minutes", String(exam.time_limit_minutes));
                      if (exam.max_attempts)
                        fd.set("max_attempts", String(exam.max_attempts));
                      fd.set("is_live", exam.is_live ? "false" : "true");
                      await updateExam(examId, fd);
                      toast.success(
                        exam.is_live ? "Exam set to draft" : "Exam is now live"
                      );
                      fetchData();
                      setToggling(false);
                    }}
                  >
                    {toggling ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      exam.is_live ? "Set to Draft" : "Make Live"
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <SubmitButton pendingText="Saving...">Save Settings</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Questions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Questions ({questions.length})
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Question</DialogTitle>
            </DialogHeader>
            <form action={handleCreateQuestion} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question_text">Question</Label>
                <Textarea id="question_text" name="question_text" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_a">Option A</Label>
                <Input id="option_a" name="option_a" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_b">Option B</Label>
                <Input id="option_b" name="option_b" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_c">Option C</Label>
                <Input id="option_c" name="option_c" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="option_d">Option D</Label>
                <Input id="option_d" name="option_d" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correct_option">Correct Answer</Label>
                <Select name="correct_option" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SubmitButton className="w-full" pendingText="Adding...">Add Question</SubmitButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="text-base">
                  Q{i + 1}. {q.question_text}
                </CardTitle>
                <CardDescription>
                  Correct answer: {q.correct_option}
                </CardDescription>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingQuestion(q)}
                >
                  <Pencil className="h-4 w-4 text-gray-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteQuestion(q.id)}
                  disabled={deletingId === q.id}
                >
                  {deletingId === q.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-500" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt) => (
                  <div
                    key={opt.label}
                    className={`p-2 rounded text-sm ${
                      opt.label === q.correct_option
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <span className="font-medium">{opt.label}.</span> {opt.text}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Edit Question Dialog */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <form action={handleEditQuestion} className="space-y-4" key={editingQuestion.id}>
              <div className="space-y-2">
                <Label htmlFor="edit_question_text">Question</Label>
                <Textarea
                  id="edit_question_text"
                  name="question_text"
                  defaultValue={editingQuestion.question_text}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_option_a">Option A</Label>
                <Input
                  id="edit_option_a"
                  name="option_a"
                  defaultValue={editingQuestion.options.find((o) => o.label === "A")?.text}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_option_b">Option B</Label>
                <Input
                  id="edit_option_b"
                  name="option_b"
                  defaultValue={editingQuestion.options.find((o) => o.label === "B")?.text}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_option_c">Option C</Label>
                <Input
                  id="edit_option_c"
                  name="option_c"
                  defaultValue={editingQuestion.options.find((o) => o.label === "C")?.text}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_option_d">Option D</Label>
                <Input
                  id="edit_option_d"
                  name="option_d"
                  defaultValue={editingQuestion.options.find((o) => o.label === "D")?.text}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_correct_option">Correct Answer</Label>
                <Select name="correct_option" defaultValue={editingQuestion.correct_option} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SubmitButton className="w-full" pendingText="Saving...">Save Changes</SubmitButton>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
