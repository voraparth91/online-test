"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface ExamTimerProps {
  startedAt: string;
  timeLimitMinutes: number;
  onTimeUp: () => void;
}

export function ExamTimer({
  startedAt,
  timeLimitMinutes,
  onTimeUp,
}: ExamTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor(
      (Date.now() - new Date(startedAt).getTime()) / 1000
    );
    return Math.max(0, timeLimitMinutes * 60 - elapsed);
  });

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isLow = secondsLeft < 300;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-md font-mono text-lg ${
        isLow
          ? "bg-red-100 text-red-700 border border-red-200"
          : "bg-blue-50 text-blue-700 border border-blue-200"
      }`}
    >
      <Clock className="h-5 w-5" />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}
