"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCandidate, updateCandidate, deleteCandidate } from "@/actions/candidates";
import type { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Profile | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  async function fetchCandidates() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "candidate")
      .order("created_at", { ascending: false });
    setCandidates(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCandidates();
  }, []);

  async function handleCreate(formData: FormData) {
    setError(null);
    const result = await createCandidate(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setDialogOpen(false);
    toast.success("Candidate created successfully");
    fetchCandidates();
  }

  async function handleEdit(formData: FormData) {
    if (!editingCandidate) return;
    setEditError(null);
    const result = await updateCandidate(editingCandidate.id, formData);
    if (result?.error) {
      setEditError(result.error);
      return;
    }
    setEditingCandidate(null);
    toast.success("Candidate updated");
    fetchCandidates();
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this candidate?")) return;
    setDeletingId(id);
    const result = await deleteCandidate(id);
    setDeletingId(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Candidate deleted");
    fetchCandidates();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Candidates</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Candidate</DialogTitle>
              <DialogDescription>
                Create a candidate account with username and password.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" type="text" placeholder="Login username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <SubmitButton className="w-full" pendingText="Creating...">Create Candidate</SubmitButton>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Candidates</CardTitle>
          <CardDescription>
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : candidates.length === 0 ? (
            <p className="text-gray-500">No candidates yet. Create one to get started.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.username}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell suppressHydrationWarning>
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingCandidate(c); setEditError(null); }}
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                        >
                          {deletingId === c.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {/* Edit Candidate Dialog */}
      <Dialog open={!!editingCandidate} onOpenChange={(open) => !open && setEditingCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update candidate details. Leave password blank to keep it unchanged.
            </DialogDescription>
          </DialogHeader>
          {editError && (
            <Alert variant="destructive">
              <AlertDescription>{editError}</AlertDescription>
            </Alert>
          )}
          {editingCandidate && (
            <form action={handleEdit} className="space-y-4" key={editingCandidate.id}>
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name</Label>
                <Input
                  id="edit_full_name"
                  name="full_name"
                  defaultValue={editingCandidate.full_name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_username">Username</Label>
                <Input
                  id="edit_username"
                  name="username"
                  defaultValue={editingCandidate.username}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_password">New Password (optional)</Label>
                <Input
                  id="edit_password"
                  name="password"
                  type="password"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <SubmitButton className="w-full" pendingText="Saving...">Save Changes</SubmitButton>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
