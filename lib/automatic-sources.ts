import { z } from "zod";

export type AutomaticSource = {
  name: string;
  url: string;
  text: string;
  licenseNote: string;
};

const openLibrarySearchSchema = z.object({ docs: z.array(z.object({ key: z.string() }).passthrough()).default([]) });
const openLibraryWorkSchema = z.object({ description: z.union([z.string(), z.object({ value: z.string() })]).optional() }).passthrough();
const googleBooksSchema = z.object({ items: z.array(z.object({ volumeInfo: z.object({ description: z.string().optional(), infoLink: z.string().optional() }).passthrough() }).passthrough()).default([]) });
const wikipediaSchema = z.object({ query: z.object({ pages: z.record(z.string(), z.object({ title: z.string(), extract: z.string().optional(), fullurl: z.string().optional() }).passthrough()) }).optional() }).passthrough();
const gutendexSchema = z.object({
  results: z.array(z.object({
    id: z.number().int().positive(),
    title: z.string(),
    authors: z.array(z.object({ name: z.string() }).passthrough()).default([]),
    summaries: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    copyright: z.boolean().nullable(),
  }).passthrough()).default([]),
});

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleMatches(candidate: string, requested: string): boolean {
  const candidateTitle = normalize(candidate).split(" subtitle ")[0];
  const requestedTitle = normalize(requested).split(" subtitle ")[0];
  return candidateTitle === requestedTitle || candidateTitle.startsWith(`${requestedTitle} `) || requestedTitle.startsWith(`${candidateTitle} `);
}

function authorMatches(authors: Array<{ name: string }>, requested: string): boolean {
  const requestedTokens = normalize(requested).split(" ").filter((token) => token.length > 1);
  if (requestedTokens.length === 0) return true;
  return authors.some(({ name }) => {
    const candidateTokens = new Set(normalize(name).split(" ").filter((token) => token.length > 1));
    return requestedTokens.every((token) => candidateTokens.has(token));
  });
}

export function parseOpenLibrarySource(searchPayload: unknown, workPayload: unknown): AutomaticSource | null {
  const search = openLibrarySearchSchema.safeParse(searchPayload);
  const work = openLibraryWorkSchema.safeParse(workPayload);
  if (!search.success || !work.success || search.data.docs.length === 0 || !work.data.description) return null;
  const description = typeof work.data.description === "string" ? work.data.description : work.data.description.value;
  const text = cleanText(description);
  if (text.length < 120) return null;
  const key = search.data.docs[0].key;
  return { name: "Open Library", url: `https://openlibrary.org${key}`, text, licenseNote: "Open Library community record" };
}

export function parseGoogleBooksSource(payload: unknown): AutomaticSource | null {
  const parsed = googleBooksSchema.safeParse(payload);
  if (!parsed.success) return null;
  const volume = parsed.data.items.find((item) => (item.volumeInfo.description?.length ?? 0) >= 120);
  if (!volume?.volumeInfo.description) return null;
  return { name: "Google Books", url: volume.volumeInfo.infoLink ?? "https://books.google.com", text: cleanText(volume.volumeInfo.description), licenseNote: "Publisher-supplied catalog description" };
}

export function parseWikipediaSource(payload: unknown, requestedTitle: string): AutomaticSource | null {
  const parsed = wikipediaSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.query) return null;
  const requested = requestedTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
  const pages = Object.values(parsed.data.query.pages);
  const page = pages.find((item) => item.title.toLowerCase().replace(/[^a-z0-9]/g, "").includes(requested)) ?? pages[0];
  const text = page?.extract ? cleanText(page.extract).slice(0, 16_000) : "";
  if (!page || text.length < 500) return null;
  return { name: "Wikipedia", url: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, text, licenseNote: "CC BY-SA reference article; attribution required" };
}

export function parseGutendexSource(payload: unknown, requestedTitle: string, requestedAuthor: string): AutomaticSource | null {
  const parsed = gutendexSchema.safeParse(payload);
  if (!parsed.success) return null;
  const book = parsed.data.results.find((candidate) =>
    candidate.copyright === false
    && candidate.languages.includes("en")
    && titleMatches(candidate.title, requestedTitle)
    && authorMatches(candidate.authors, requestedAuthor)
    && candidate.summaries.some((summary) => cleanText(summary).length >= 120));
  if (!book) return null;
  const text = book.summaries.map(cleanText).filter((summary) => summary.length >= 120).join(" ").slice(0, 12_000);
  return {
    name: "Project Gutenberg",
    url: `https://www.gutenberg.org/ebooks/${book.id}`,
    text,
    licenseNote: "Public-domain catalog summary via Gutendex",
  };
}

export function formatAutomaticSources(sources: AutomaticSource[], maxTotalChars = 24_000): string {
  let remaining = maxTotalChars;
  const sections: string[] = [];
  for (const [index, source] of sources.entries()) {
    const label = `[Source ${index + 1}: ${source.name}]\n`;
    const text = source.text.slice(0, Math.max(0, remaining - label.length));
    if (!text) break;
    sections.push(`${label}${text}`);
    remaining -= label.length + text.length + 2;
    if (remaining <= 0) break;
  }
  return sections.join("\n\n");
}
