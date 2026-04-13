"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { LogOut } from "lucide-react";

export function CandidateNav() {
  return (
    <header className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/candidate/dashboard" className="font-bold text-lg">
          Exam Platform
        </Link>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </form>
      </div>
    </header>
  );
}
