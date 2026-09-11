import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().min(1), prompt: z.string().min(8).max(500),
  choices: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  correctIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  skill: z.enum(["recall", "sequence", "character", "setting", "cause_effect", "main_idea", "inference", "vocabulary"]),
  rationale: z.string().min(1).max(500), sourceReference: z.string().min(1), confidence: z.number().min(0).max(1), visual: z.boolean().optional(),
}).superRefine((question, context) => {
  if (new Set(question.choices.map((choice) => choice.trim().toLowerCase())).size !== 4) context.addIssue({ code: z.ZodIssueCode.custom, path: ["choices"], message: "Answer choices must be unique" });
});
export const quizSchema = z.object({
  book: z.object({ title: z.string().min(1), author: z.string().min(1), isbn13: z.string().regex(/^\d{13}$/).optional() }),
  gradeBand: z.enum(["1-2", "3-5", "6-8"]), sourceType: z.enum(["public_domain", "teacher_notes", "authorized_guide", "approved_quiz"]),
  sourceSufficient: z.literal(true), version: z.number().int().positive(), questions: z.array(questionSchema).min(5).max(15),
});
export type Quiz = z.infer<typeof quizSchema>;
