import { describe, expect, it } from "vitest";
import { formatAutomaticSources, parseGoogleBooksSource, parseOpenLibrarySource, parseWikipediaSource } from "../lib/automatic-sources";

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

  it("labels every source before sending it to the model", () => {
    const text = formatAutomaticSources([{ name: "Reference", url: "https://example.com", text: "Story", licenseNote: "Open" }]);
    expect(text).toContain("[Source 1: Reference]");
  });
});
