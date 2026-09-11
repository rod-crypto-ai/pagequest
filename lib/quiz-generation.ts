import { z } from "zod";
import { generatedQuestionSchema } from "./validation/quiz";

export const generationRequestSchema = z.object({
  book: z.object({
    title: z.string().min(1).max(300),
    author: z.string().min(1).max(300),
    isbn13: z.string().regex(/^\d{13}$/).nullable(),
  }),
  gradeBand: z.enum(["1-2", "3-5", "6-8"]),
  testDraft: z.boolean().default(false),
});

export const generatedQuizOutputSchema = z.object({
  sourceSufficient: z.boolean(),
  insufficiencyReason: z.string().max(300),
  questions: z.array(generatedQuestionSchema).max(10),
}).superRefine((result, context) => {
  if (result.sourceSufficient && result.questions.length !== 10) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["questions"], message: "A sufficient source must produce exactly 10 questions." });
  }
  if (!result.sourceSufficient && result.questions.length !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["questions"], message: "An insufficient source must not produce questions." });
  }
});

export const quizOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sourceSufficient", "insufficiencyReason", "questions"],
  properties: {
    sourceSufficient: { type: "boolean" },
    insufficiencyReason: { type: "string" },
    questions: {
      type: "array",
      minItems: 0,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "prompt", "choices", "correctIndex", "skill", "rationale", "sourceReference", "confidence"],
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          choices: { type: "array", minItems: 4, maxItems: 4, items: { type: "string" } },
          correctIndex: { type: "integer", minimum: 0, maximum: 3 },
          skill: { type: "string", enum: ["recall", "sequence", "character", "setting", "cause_effect", "main_idea", "inference", "vocabulary"] },
          rationale: { type: "string" },
          sourceReference: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

export function extractResponseText(payload: unknown): string | null {
  const parsed = z.object({
    output: z.array(z.object({
      content: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()).optional(),
    }).passthrough()).optional(),
  }).passthrough().safeParse(payload);
  if (!parsed.success) return null;
  for (const item of parsed.data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return null;
}
