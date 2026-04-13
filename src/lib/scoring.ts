interface QuestionKey {
  id: string;
  correct_option: string;
}

interface AnswerInput {
  question_id: string;
  selected_option: string | null;
}

interface ScoredAnswer {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean;
}

export function scoreExam(
  questions: QuestionKey[],
  answers: AnswerInput[]
): { score: number; details: ScoredAnswer[] } {
  const answerMap = new Map(
    answers.map((a) => [a.question_id, a.selected_option])
  );

  const details: ScoredAnswer[] = questions.map((q) => {
    const selected = answerMap.get(q.id) ?? null;
    return {
      question_id: q.id,
      selected_option: selected,
      is_correct: selected !== null && selected === q.correct_option,
    };
  });

  const score = details.filter((d) => d.is_correct).length;
  return { score, details };
}
