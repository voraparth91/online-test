"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCandidateSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Forbidden");

  return { admin };
}

export async function createCandidate(formData: FormData) {
  const { admin } = await requireAdmin();

  const parsed = createCandidateSchema.safeParse({
    email: formData.get("email"),
    full_name: formData.get("full_name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name,
      role: "candidate",
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function updateCandidate(candidateId: string, formData: FormData) {
  const { admin } = await requireAdmin();

  const fullName = formData.get("full_name") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!fullName || fullName.trim().length === 0) {
    return { error: "Name is required" };
  }
  if (!username || username.trim().length === 0) {
    return { error: "Username is required" };
  }

  // Check username uniqueness (exclude current user)
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username.trim())
    .neq("id", candidateId)
    .single();

  if (existing) {
    return { error: "Username is already taken" };
  }

  // Update profile
  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: fullName.trim(),
      username: username.trim(),
    })
    .eq("id", candidateId);

  if (profileError) return { error: profileError.message };

  // Update password if provided
  if (password && password.length > 0) {
    if (password.length < 6) {
      return { error: "Password must be at least 6 characters" };
    }
    const { error: authError } = await admin.auth.admin.updateUserById(
      candidateId,
      { password }
    );
    if (authError) return { error: authError.message };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}

export async function deleteCandidate(candidateId: string) {
  const { admin } = await requireAdmin();

  const { error } = await admin.auth.admin.deleteUser(candidateId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/candidates");
  return { success: true };
}
