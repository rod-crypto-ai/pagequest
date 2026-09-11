import { NextRequest, NextResponse } from "next/server";
import { generationRequestSchema, generatedQuizOutputSchema, quizOutputJsonSchema, extractResponseText } from "@/lib/quiz-generation";
import { quizSchema } from "@/lib/validation/quiz";

export const runtime = "edge";

const SYSTEM_PROMPT = `You create reading-comprehension quizzes for children. Use ONLY the source notes supplied by the adult. Never use outside knowledge, memories of the book, cover metadata, or invented details. If the notes do not support ten distinct questions with one unambiguous answer each, set sourceSufficient to false, explain why briefly, and return no questions. Otherwise return exactly ten paraphrased questions covering a useful mix of recall, sequence, character, setting, cause/effect, main idea, inference, and vocabulary. Avoid copied passages. Make distractors plausible but clearly wrong according to the notes. Cite the supporting paragraph number in every sourceReference.`;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && process.env.QUIZ_GENERATION_ENABLED !== "true") {
    return NextResponse.json({ error: "Quiz generation is not enabled for this environment." }, { status: 503 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Add at least 600 characters of source notes and check the book details.", issues: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.testDraft && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Draft testing is disabled in production." }, { status: 403 });
  }

  const numberedSource = parsed.data.sourceText
    .split(/\n\s*\n/)
    .map((paragraph, index) => `[Paragraph ${index + 1}] ${paragraph.trim()}`)
    .join("\n\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Book: ${parsed.data.book.title}\nAuthor: ${parsed.data.book.author}\nGrade band: ${parsed.data.gradeBand}\n\nSOURCE NOTES:\n${numberedSource}` },
      ],
      text: { format: { type: "json_schema", name: "pagequest_quiz", strict: true, schema: quizOutputJsonSchema } },
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    return NextResponse.json({ error: "The quiz service could not complete this request." }, { status: 502 });
  }
  const outputText = extractResponseText(payload);
  if (!outputText) return NextResponse.json({ error: "The quiz service returned no usable output." }, { status: 502 });

  let decoded: unknown;
  try {
    decoded = JSON.parse(outputText);
  } catch {
    return NextResponse.json({ error: "The generated quiz was not valid JSON." }, { status: 502 });
  }
  const generated = generatedQuizOutputSchema.safeParse(decoded);
  if (!generated.success) return NextResponse.json({ error: "The generated quiz failed validation." }, { status: 502 });
  if (!generated.data.sourceSufficient) {
    return NextResponse.json({ error: generated.data.insufficiencyReason || "The notes do not contain enough detail for a reliable quiz." }, { status: 422 });
  }

  const quiz = quizSchema.parse({
    book: { title: parsed.data.book.title, author: parsed.data.book.author, ...(parsed.data.book.isbn13 ? { isbn13: parsed.data.book.isbn13 } : {}) },
    gradeBand: parsed.data.gradeBand,
    sourceType: "teacher_notes",
    sourceSufficient: true,
    version: 1,
    questions: generated.data.questions,
  });
  return NextResponse.json({ quiz, status: "review_required", testDraft: parsed.data.testDraft });
}
