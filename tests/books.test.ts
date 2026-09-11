import { describe, expect, it } from "vitest";
import { mergeBookResults, normalizeGoogleBooks, normalizeIsbn, normalizeOpenLibrary } from "../lib/books";

describe("book discovery normalization", () => {
  it("normalizes ISBNs and rejects non-ISBN-13 values", () => {
    expect(normalizeIsbn("978-0-06-112495-2")).toBe("9780061124952");
    expect(normalizeIsbn("0061124958")).toBeNull();
  });

  it("normalizes Open Library results", () => {
    const [book] = normalizeOpenLibrary({ docs: [{ key: "/works/OL123W", title: "A Book", author_name: ["A. Writer"], isbn: ["9780000000002"], cover_i: 42 }] });
    expect(book).toMatchObject({ id: "9780000000002", sourceId: "OL123W", source: "open_library" });
    expect(book.coverUrl).toContain("/42-M.jpg");
  });

  it("normalizes Google Books and deduplicates editions by ISBN-13", () => {
    const [google] = normalizeGoogleBooks({ items: [{ id: "volume-1", volumeInfo: { title: "A Book", authors: ["A. Writer"], publishedDate: "2001-04", industryIdentifiers: [{ type: "ISBN_13", identifier: "9780000000002" }] } }] });
    const [open] = normalizeOpenLibrary({ docs: [{ key: "/works/OL123W", title: "A Book", author_name: ["A. Writer"], isbn: ["9780000000002"] }] });
    expect(mergeBookResults([[open], [google]])).toHaveLength(1);
  });
});
