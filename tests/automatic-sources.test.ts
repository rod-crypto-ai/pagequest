import { describe, expect, it } from "vitest";
import { formatAutomaticSources, parseGoogleBooksSource, parseGutendexSource, parseOpenLibrarySource, parseWikipediaSource } from "../lib/automatic-sources";

describe("automatic quiz sources", () => {
  it("parses an Open Library work description", () => {
    const source = parseOpenLibrarySource({ docs: [{ key: "/works/OL1W" }] }, { description: { value: "A detailed description ".repeat(10) } });
    expect(source?.name).toBe("Open Library");
    expect(source?.url).toContain("/works/OL1W");
  });

  it("ignores thin Google Books descriptions", () => {
    expect(parseGoogleBooksSource({ items: [{ volumeInfo: { description: "Too short" } }] })).toBeNull();
  });

  it("selects and attributes a substantial Wikipedia article", () => {
    const source = parseWikipediaSource({ query: { pages: { "1": { title: "Charlotte's Web", extract: "Story details. ".repeat(60), fullurl: "https://en.wikipedia.org/wiki/Charlotte%27s_Web" } } } }, "Charlotte's Web");
    expect(source?.licenseNote).toContain("CC BY-SA");
  });

  it("uses a matching public-domain Gutendex summary", () => {
    const source = parseGutendexSource({ results: [{ id: 1342, title: "Pride and Prejudice", authors: [{ name: "Austen, Jane" }], summaries: ["Elizabeth Bennet navigates family expectations, mistaken judgments, and a changing relationship with Mr. Darcy. ".repeat(3)], languages: ["en"], copyright: false }] }, "Pride and Prejudice", "Jane Austen");
    expect(source?.name).toBe("Project Gutenberg");
    expect(source?.url).toBe("https://www.gutenberg.org/ebooks/1342");
  });

  it("rejects copyrighted or mismatched Gutendex records", () => {
    const payload = { results: [{ id: 1, title: "A Different Book", authors: [{ name: "Author, Other" }], summaries: ["A substantial summary. ".repeat(12)], languages: ["en"], copyright: false }, { id: 2, title: "Pride and Prejudice", authors: [{ name: "Austen, Jane" }], summaries: ["A substantial summary. ".repeat(12)], languages: ["en"], copyright: true }] };
    expect(parseGutendexSource(payload, "Pride and Prejudice", "Jane Austen")).toBeNull();
  });

  it("labels every source before sending it to the model", () => {
    const text = formatAutomaticSources([{ name: "Reference", url: "https://example.com", text: "Story", licenseNote: "Open" }]);
    expect(text).toContain("[Source 1: Reference]");
  });

  it("caps the combined source context", () => {
    const text = formatAutomaticSources([{ name: "One", url: "https://example.com/one", text: "a".repeat(100), licenseNote: "Open" }, { name: "Two", url: "https://example.com/two", text: "b".repeat(100), licenseNote: "Open" }], 80);
    expect(text.length).toBeLessThanOrEqual(80);
    expect(text).not.toContain("Source 2");
  });
});
