import { describe, it, expect } from "vitest";
import { scoreExam } from "../scoring";

describe("scoreExam", () => {
  it("scores all correct answers", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
      { id: "q3", correct_option: "C" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: "B" },
      { question_id: "q3", selected_option: "C" },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(3);
    expect(result.details.every((d) => d.is_correct)).toBe(true);
  });

  it("scores all wrong answers", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "C" },
      { question_id: "q2", selected_option: "D" },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(0);
    expect(result.details.every((d) => !d.is_correct)).toBe(true);
  });

  it("scores unanswered questions as wrong", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: null },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(1);
    expect(result.details[0].is_correct).toBe(true);
    expect(result.details[1].is_correct).toBe(false);
  });

  it("handles mixed correct and wrong", () => {
    const questions = [
      { id: "q1", correct_option: "A" },
      { id: "q2", correct_option: "B" },
      { id: "q3", correct_option: "C" },
      { id: "q4", correct_option: "D" },
    ];
    const answers = [
      { question_id: "q1", selected_option: "A" },
      { question_id: "q2", selected_option: "A" },
      { question_id: "q3", selected_option: "C" },
      { question_id: "q4", selected_option: "A" },
    ];
    const result = scoreExam(questions, answers);
    expect(result.score).toBe(2);
  });
});
