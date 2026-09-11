import { describe, expect, it } from "vitest";
import { extractResponseText, generatedQuizOutputSchema, generationRequestSchema } from "../lib/quiz-generation";

const question = {
  id: "q1",
  prompt: "Why did the main character return to the garden?",
  choices: ["To find a key", "To meet a friend", "To hide a map", "To water a tree"] as [string, string, string, string],
  correctIndex: 0 as const,
  skill: "cause_effect" as const,
  rationale: "The notes state that the character returned for the missing key.",
  sourceReference: "Paragraph 4",
  confidence: 0.96,
};

describe("quiz generation boundaries", () => {
  it("rejects thin source material", () => {
    const result = generationRequestSchema.safeParse({ book: { title: "Book", author: "Writer", isbn13: null }, gradeBand: "3-5", sourceText: "Short summary", testDraft: true });
    expect(result.success).toBe(false);
  });

  it("requires ten questions when a source is sufficient", () => {
    expect(generatedQuizOutputSchema.safeParse({ sourceSufficient: true, insufficiencyReason: "", questions: Array.from({ length: 10 }, (_, index) => ({ ...question, id: `q${index + 1}` })) }).success).toBe(true);
    expect(generatedQuizOutputSchema.safeParse({ sourceSufficient: true, insufficiencyReason: "", questions: [question] }).success).toBe(false);
  });

  it("requires zero questions when a source is insufficient", () => {
    expect(generatedQuizOutputSchema.safeParse({ sourceSufficient: false, insufficiencyReason: "Missing the ending.", questions: [] }).success).toBe(true);
    expect(generatedQuizOutputSchema.safeParse({ sourceSufficient: false, insufficiencyReason: "Missing the ending.", questions: [question] }).success).toBe(false);
  });

  it("extracts REST Responses API output text", () => {
    expect(extractResponseText({ output: [{ content: [{ type: "output_text", text: "{\"ok\":true}" }] }] })).toBe("{\"ok\":true}");
  });
});
