import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createCandidateSchema = z.object({
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Name is required").max(200),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const createExamSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).default(""),
  time_limit_minutes: z.coerce.number().int().positive().nullable(),
  max_attempts: z.coerce.number().int().positive().nullable(),
});

export const updateExamSchema = createExamSchema.extend({
  is_live: z.boolean(),
});

export const questionOptionSchema = z.object({
  label: z.string().min(1),
  text: z.string().min(1, "Option text is required"),
});

export const createQuestionSchema = z.object({
  question_text: z.string().min(1, "Question text is required").max(2000),
  options: z
    .array(questionOptionSchema)
    .length(4, "Exactly 4 options required"),
  correct_option: z.enum(["A", "B", "C", "D"]),
});

export const submitAnswerSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.enum(["A", "B", "C", "D"]).nullable(),
});

export const submitExamSchema = z.object({
  attempt_id: z.string().uuid(),
  answers: z.array(submitAnswerSchema),
});
