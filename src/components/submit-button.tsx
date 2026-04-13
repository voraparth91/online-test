"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}

export function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className={className}
      disabled={disabled || pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
