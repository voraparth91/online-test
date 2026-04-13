"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createExamSchema, updateExamSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Use admin client to check role (bypasses RLS session issues)
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  return { admin, user };
}

export async function createExam(formData: FormData) {
  const { admin, user } = await requireAdmin();

  const parsed = createExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    time_limit_minutes: formData.get("time_limit_minutes") || null,
    max_attempts: formData.get("max_attempts") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { data, error } = await admin
    .from("exams")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  redirect(`/admin/exams/${data.id}`);
}

export async function updateExam(examId: string, formData: FormData) {
  const { admin } = await requireAdmin();

  const parsed = updateExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    time_limit_minutes: formData.get("time_limit_minutes") || null,
    max_attempts: formData.get("max_attempts") || null,
    is_live: formData.get("is_live") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await admin
    .from("exams")
    .update(parsed.data)
    .eq("id", examId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath("/admin/exams");
  return { success: true };
}

export async function deleteExam(examId: string) {
  const { admin } = await requireAdmin();

  const { error } = await admin.from("exams").delete().eq("id", examId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/exams");
  return { success: true };
}
