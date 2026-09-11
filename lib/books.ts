import { z } from "zod";

export type BookSearchResult = {
  id: string;
  title: string;
  authors: string[];
  publishedYear: number | null;
  isbn13: string | null;
  coverUrl: string | null;
  subjects: string[];
  source: "open_library" | "google_books";
  sourceId: string;
};

const openLibraryResponseSchema = z.object({
  docs: z.array(z.object({
    key: z.string(),
    title: z.string(),
    author_name: z.array(z.string()).optional(),
    first_publish_year: z.number().int().optional(),
    isbn: z.array(z.string()).optional(),
    cover_i: z.number().int().optional(),
    subject: z.array(z.string()).optional(),
  }).passthrough()).default([]),
});

const googleBooksResponseSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    volumeInfo: z.object({
      title: z.string(),
      authors: z.array(z.string()).optional(),
      publishedDate: z.string().optional(),
      industryIdentifiers: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(),
      imageLinks: z.object({ thumbnail: z.string().optional() }).optional(),
      categories: z.array(z.string()).optional(),
    }).passthrough(),
  }).passthrough()).default([]),
});

export function normalizeIsbn(value: string | undefined): string | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9X]/gi, "").toUpperCase();
  return cleaned.length === 13 ? cleaned : null;
}

export function normalizeOpenLibrary(payload: unknown): BookSearchResult[] {
  const parsed = openLibraryResponseSchema.parse(payload);
  return parsed.docs.map((book) => {
    const isbn13 = book.isbn?.map(normalizeIsbn).find(Boolean) ?? null;
    const sourceId = book.key.replace(/^\/works\//, "");
    return {
      id: isbn13 ?? `ol:${sourceId}`,
      title: book.title,
      authors: book.author_name?.slice(0, 3) ?? [],
      publishedYear: book.first_publish_year ?? null,
      isbn13,
      coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
      subjects: book.subject?.slice(0, 3) ?? [],
      source: "open_library" as const,
      sourceId,
    };
  });
}

export function normalizeGoogleBooks(payload: unknown): BookSearchResult[] {
  const parsed = googleBooksResponseSchema.parse(payload);
  return parsed.items.map(({ id, volumeInfo }) => {
    const isbn13 = volumeInfo.industryIdentifiers
      ?.find((item) => item.type === "ISBN_13")?.identifier;
    const year = volumeInfo.publishedDate?.match(/^\d{4}/)?.[0];
    return {
      id: normalizeIsbn(isbn13) ?? `gb:${id}`,
      title: volumeInfo.title,
      authors: volumeInfo.authors?.slice(0, 3) ?? [],
      publishedYear: year ? Number(year) : null,
      isbn13: normalizeIsbn(isbn13),
      coverUrl: volumeInfo.imageLinks?.thumbnail?.replace(/^http:/, "https:") ?? null,
      subjects: volumeInfo.categories?.slice(0, 3) ?? [],
      source: "google_books" as const,
      sourceId: id,
    };
  });
}

export function mergeBookResults(resultSets: BookSearchResult[][], limit = 20): BookSearchResult[] {
  const seen = new Set<string>();
  const merged: BookSearchResult[] = [];
  for (const book of resultSets.flat()) {
    const key = book.isbn13 ?? `${book.title}|${book.authors[0] ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(book);
    if (merged.length === limit) break;
  }
  return merged;
}
