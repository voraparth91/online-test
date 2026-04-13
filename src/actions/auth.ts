"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema } from "@/lib/validations";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Look up the email by username
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("username", parsed.data.username)
    .single();

  if (!profile) {
    return { error: "Invalid username or password" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Invalid username or password" };
  }

  // Get user role for redirect
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication failed" };
  }

  const { data: userProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userProfile?.role === "admin") {
    redirect("/admin/dashboard");
  } else {
    redirect("/candidate/dashboard");
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
