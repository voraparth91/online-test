import { describe, it, expect } from "vitest";
import {
  loginSchema,
  createCandidateSchema,
  createExamSchema,
  createQuestionSchema,
  submitExamSchema,
} from "../validations";

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("createCandidateSchema", () => {
  it("accepts valid candidate", () => {
    const result = createCandidateSchema.safeParse({
      email: "candidate@example.com",
      full_name: "John Doe",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCandidateSchema.safeParse({
      email: "candidate@example.com",
      full_name: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });
});

describe("createExamSchema", () => {
  it("accepts exam with nullable time limit", () => {
    const result = createExamSchema.safeParse({
      title: "Test Exam",
      description: "A test",
      time_limit_minutes: null,
      max_attempts: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts exam with time limit", () => {
    const result = createExamSchema.safeParse({
      title: "Test Exam",
      description: "",
      time_limit_minutes: 30,
      max_attempts: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe("createQuestionSchema", () => {
  it("accepts valid question", () => {
    const result = createQuestionSchema.safeParse({
      question_text: "What is insurance?",
      options: [
        { label: "A", text: "Risk transfer" },
        { label: "B", text: "Gambling" },
        { label: "C", text: "Banking" },
        { label: "D", text: "Trading" },
      ],
      correct_option: "A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 4 options", () => {
    const result = createQuestionSchema.safeParse({
      question_text: "What is insurance?",
      options: [
        { label: "A", text: "Risk transfer" },
        { label: "B", text: "Gambling" },
      ],
      correct_option: "A",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitExamSchema", () => {
  it("accepts valid submission", () => {
    const result = submitExamSchema.safeParse({
      attempt_id: "550e8400-e29b-41d4-a716-446655440000",
      answers: [
        {
          question_id: "550e8400-e29b-41d4-a716-446655440001",
          selected_option: "A",
        },
        {
          question_id: "550e8400-e29b-41d4-a716-446655440002",
          selected_option: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
