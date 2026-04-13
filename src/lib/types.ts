export type UserRole = "admin" | "candidate";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  role: UserRole;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number | null;
  max_attempts: number | null;
  is_live: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  options: QuestionOption[];
  correct_option: string;
  sort_order: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  candidate_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_questions: number;
}

export interface AttemptAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
}

export interface ExamAttemptWithExam extends ExamAttempt {
  exams: Pick<Exam, "title">;
}

export interface ExamAttemptWithCandidate extends ExamAttempt {
  profiles: Pick<Profile, "full_name" | "email">;
}

export interface AttemptAnswerWithQuestion extends AttemptAnswer {
  questions: Pick<Question, "question_text" | "options" | "correct_option" | "sort_order">;
}
