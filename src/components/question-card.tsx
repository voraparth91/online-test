"use client";

import type { QuestionOption } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionCardProps {
  index: number;
  questionId: string;
  questionText: string;
  options: QuestionOption[];
  selectedOption: string | null;
  onSelect: (questionId: string, option: string) => void;
}

export function QuestionCard({
  index,
  questionId,
  questionText,
  options,
  selectedOption,
  onSelect,
}: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          <span className="text-gray-400 mr-2">Q{index}.</span>
          {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedOption ?? ""}
          onValueChange={(val) => onSelect(questionId, val)}
        >
          {options.map((opt) => (
            <div key={opt.label} className="flex items-center space-x-3 py-2">
              <RadioGroupItem
                value={opt.label}
                id={`${questionId}-${opt.label}`}
              />
              <Label
                htmlFor={`${questionId}-${opt.label}`}
                className="text-sm font-normal cursor-pointer"
              >
                <span className="font-medium mr-1">{opt.label}.</span>
                {opt.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
