"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, FileText, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/actions/auth";
import { useFormStatus } from "react-dom";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/exams", label: "Exams", icon: FileText },
];

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="ghost" className="w-full justify-start gap-3" type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {pending ? "Signing out..." : "Sign Out"}
    </Button>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Exam Platform</h1>
        <p className="text-sm text-gray-500">Admin Panel</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action={logout}>
        <LogoutButton />
      </form>
    </aside>
  );
}
