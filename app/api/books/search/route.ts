import { NextRequest, NextResponse } from "next/server";
import { mergeBookResults, normalizeGoogleBooks, normalizeOpenLibrary } from "@/lib/books";

export const runtime = "edge";

const SEARCH_TIMEOUT_MS = 6_000;

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "PageQuest/0.3 (book discovery)" },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Book provider returned ${response.status}`);
  return response.json();
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ error: "Enter at least two characters." }, { status: 400 });
  }
  if (query.length > 120) {
    return NextResponse.json({ error: "Search is too long." }, { status: 400 });
  }

  const openLibraryUrl = new URL("https://openlibrary.org/search.json");
  openLibraryUrl.searchParams.set("q", query);
  openLibraryUrl.searchParams.set("limit", "16");
  openLibraryUrl.searchParams.set("fields", "key,title,author_name,first_publish_year,isbn,cover_i,subject");

  const googleUrl = new URL("https://www.googleapis.com/books/v1/volumes");
  googleUrl.searchParams.set("q", query);
  googleUrl.searchParams.set("maxResults", "16");
  googleUrl.searchParams.set("printType", "books");
  googleUrl.searchParams.set("projection", "lite");
  const googleKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (googleKey) googleUrl.searchParams.set("key", googleKey);

  const [openLibrary, googleBooks] = await Promise.allSettled([
    fetchJson(openLibraryUrl).then(normalizeOpenLibrary),
    fetchJson(googleUrl).then(normalizeGoogleBooks),
  ]);
  const successful = [openLibrary, googleBooks]
    .filter((result): result is PromiseFulfilledResult<ReturnType<typeof normalizeOpenLibrary>> => result.status === "fulfilled")
    .map((result) => result.value);

  if (successful.length === 0) {
    return NextResponse.json({ error: "Book search is temporarily unavailable. Please try again." }, { status: 502 });
  }

  return NextResponse.json({
    books: mergeBookResults(successful),
    partial: successful.length < 2,
  }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
