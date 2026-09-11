import { NextRequest, NextResponse } from "next/server";
import { generationRequestSchema, generatedQuizOutputSchema, quizOutputJsonSchema, extractResponseText } from "@/lib/quiz-generation";
import { quizSchema } from "@/lib/validation/quiz";
import { formatAutomaticSources, parseGoogleBooksSource, parseOpenLibrarySource, parseWikipediaSource, type AutomaticSource } from "@/lib/automatic-sources";

export const runtime = "edge";

const SYSTEM_PROMPT = `You create reading-comprehension quizzes for children. Use ONLY the automatically retrieved sources supplied in the request. Never use outside knowledge, memories of the book, cover metadata, or invented details. If the sources do not support ten distinct questions with one unambiguous answer each, set sourceSufficient to false, explain why briefly, and return no questions. Otherwise return exactly ten paraphrased questions covering a useful mix of recall, sequence, character, setting, cause/effect, main idea, inference, and vocabulary. Avoid copied passages. Make distractors plausible but clearly wrong according to the sources. Cite the supporting source number in every sourceReference.`;

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "PageQuest/0.4 (automatic quiz sources)" }, signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error(`Source returned ${response.status}`);
  return response.json();
}

async function findAutomaticSources(book: { title: string; author: string; isbn13: string | null }): Promise<AutomaticSource[]> {
  const query = book.isbn13 || `${book.title} ${book.author}`;
  const openSearchUrl = new URL("https://openlibrary.org/search.json");
  openSearchUrl.searchParams.set("q", query);
  openSearchUrl.searchParams.set("limit", "1");
  openSearchUrl.searchParams.set("fields", "key");
  const googleUrl = new URL("https://www.googleapis.com/books/v1/volumes");
  googleUrl.searchParams.set("q", book.isbn13 ? `isbn:${book.isbn13}` : `intitle:${book.title} inauthor:${book.author}`);
  googleUrl.searchParams.set("maxResults", "5");
  googleUrl.searchParams.set("printType", "books");
  if (process.env.GOOGLE_BOOKS_API_KEY) googleUrl.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const wikipediaUrl = new URL("https://en.wikipedia.org/w/api.php");
  wikipediaUrl.searchParams.set("action", "query");
  wikipediaUrl.searchParams.set("generator", "search");
  wikipediaUrl.searchParams.set("gsrsearch", `intitle:\"${book.title}\" ${book.author}`);
  wikipediaUrl.searchParams.set("gsrlimit", "3");
  wikipediaUrl.searchParams.set("prop", "extracts|info");
  wikipediaUrl.searchParams.set("explaintext", "1");
  wikipediaUrl.searchParams.set("inprop", "url");
  wikipediaUrl.searchParams.set("format", "json");

  const [openResult, googleResult, wikipediaResult] = await Promise.allSettled([
    fetchJson(openSearchUrl).then(async (searchPayload) => {
      const key = (searchPayload as { docs?: Array<{ key?: string }> }).docs?.[0]?.key;
      if (!key?.startsWith("/works/")) return null;
      const workUrl = new URL(`https://openlibrary.org${key}.json`);
      return parseOpenLibrarySource(searchPayload, await fetchJson(workUrl));
    }),
    fetchJson(googleUrl).then(parseGoogleBooksSource),
    fetchJson(wikipediaUrl).then((payload) => parseWikipediaSource(payload, book.title)),
  ]);
  return [openResult, googleResult, wikipediaResult]
    .filter((result): result is PromiseFulfilledResult<AutomaticSource | null> => result.status === "fulfilled")
    .map((result) => result.value)
    .filter((source): source is AutomaticSource => source !== null);
}

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
    return NextResponse.json({ error: "Check the selected book details.", issues: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.testDraft && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Draft testing is disabled in production." }, { status: 403 });
  }

  const sources = await findAutomaticSources(parsed.data.book);
  const sourceText = formatAutomaticSources(sources);
  if (sourceText.length < 600) {
    return NextResponse.json({ error: "PageQuest could not find enough trustworthy story information to build this quiz automatically.", sources: sources.map(({ name, url, licenseNote }) => ({ name, url, licenseNote })) }, { status: 422 });
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Book: ${parsed.data.book.title}\nAuthor: ${parsed.data.book.author}\nGrade band: ${parsed.data.gradeBand}\n\nAUTOMATIC SOURCES:\n${sourceText}` },
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
    sourceType: "open_reference",
    sourceSufficient: true,
    version: 1,
    questions: generated.data.questions,
  });
  return NextResponse.json({ quiz, status: "review_required", testDraft: parsed.data.testDraft, sources: sources.map(({ name, url, licenseNote }) => ({ name, url, licenseNote })) });
}
