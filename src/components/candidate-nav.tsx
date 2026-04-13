"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { LogOut, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="ghost" size="sm" type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
      {pending ? "Signing out..." : "Sign Out"}
    </Button>
  );
}

export function CandidateNav() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/candidate/dashboard" className="font-bold text-lg">
          Exam Platform
        </Link>
        <form action={logout}>
          <LogoutButton />
        </form>
      </div>
    </header>
  );
}
