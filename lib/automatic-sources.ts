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

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

export function formatAutomaticSources(sources: AutomaticSource[]): string {
  return sources.map((source, index) => `[Source ${index + 1}: ${source.name}]\n${source.text}`).join("\n\n");
}
