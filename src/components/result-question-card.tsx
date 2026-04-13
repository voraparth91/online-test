import type { QuestionOption } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle } from "lucide-react";

interface ResultQuestionCardProps {
  index: number;
  questionText: string;
  options: QuestionOption[];
  selectedOption: string | null;
  correctOption: string;
  isCorrect: boolean;
}

export function ResultQuestionCard({
  index,
  questionText,
  options,
  selectedOption,
  correctOption,
  isCorrect,
}: ResultQuestionCardProps) {
  return (
    <Card className={isCorrect ? "border-green-200" : "border-red-200"}>
      <CardHeader className="flex flex-row items-start gap-3 pb-2">
        {isCorrect ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <CardTitle className="text-base font-medium">
          <span className="text-gray-400 mr-2">Q{index}.</span>
          {questionText}
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-11">
        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = opt.label === selectedOption;
            const isCorrectOpt = opt.label === correctOption;

            let className = "p-2 rounded text-sm border ";
            if (isCorrectOpt) {
              className += "bg-green-50 border-green-200 text-green-800";
            } else if (isSelected && !isCorrectOpt) {
              className += "bg-red-50 border-red-200 text-red-800";
            } else {
              className += "bg-gray-50 border-gray-200 text-gray-600";
            }

            return (
              <div key={opt.label} className={className}>
                <span className="font-medium">{opt.label}.</span> {opt.text}
                {isCorrectOpt && (
                  <span className="ml-2 text-xs font-medium">(Correct)</span>
                )}
                {isSelected && !isCorrectOpt && (
                  <span className="ml-2 text-xs font-medium">(Your answer)</span>
                )}
              </div>
            );
          })}
        </div>
        {!selectedOption && (
          <p className="text-sm text-gray-400 mt-2">Not answered</p>
        )}
      </CardContent>
    </Card>
  );
}
