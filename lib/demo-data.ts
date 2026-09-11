import type { Quiz } from "@/lib/validation/quiz";

export const demoBooks = [
  { id: "moonlit-map", title: "The Moonlit Map", author: "Elena Brooks", isbn13: "9780000000001", genre: "Adventure", gradeBand: "3–5", cover: "/assets/moonlit-map-cover.webp", quizReady: true },
  { id: "brave-seed", title: "The Brave Little Seed", author: "Jo Kim", isbn13: "9780000000002", genre: "Nature", gradeBand: "1–2", cover: "sun", quizReady: true },
  { id: "reef", title: "Secrets of the Reef", author: "Samira Cole", isbn13: "9780000000003", genre: "Science", gradeBand: "3–5", cover: "sea", quizReady: true },
  { id: "clockmakers-cat", title: "The Clockmaker's Cat", author: "Owen Vale", isbn13: "9780000000004", genre: "Mystery", gradeBand: "6–8", cover: "plum", quizReady: false },
] as const;

export const demoQuestions: Quiz["questions"] = [
  { id: "q1", prompt: "Why does Leo ask Nora to join him after he finds the map?", choices: ["She owns a brighter lantern.", "She understands maps and he trusts her judgment.", "She has already visited the observatory.", "She dares him to enter the forest."], correctIndex: 1, skill: "character", rationale: "Leo trusts Nora's map-reading ability.", sourceReference: "Teacher notes, chapter 2", confidence: 0.96 },
  { id: "q2", prompt: "What happens immediately before Leo and Nora enter the forest?", choices: ["They climb the observatory stairs.", "They hide the map under the table.", "They pack a lantern and share their plan.", "They watch the sunrise from the hill."], correctIndex: 2, skill: "sequence", rationale: "The preparations happen before the forest journey.", sourceReference: "Teacher notes, chapter 3", confidence: 0.95 },
  { id: "q3", prompt: "Which scene shows what happens third in their journey?", choices: ["Leo discovers the folded map.", "The friends study the map together.", "They follow the forest path with a lantern.", "They reach the hilltop observatory."], correctIndex: 2, skill: "sequence", rationale: "Following the path is the third event.", sourceReference: "Teacher notes, chapters 2–4", confidence: 0.98, visual: true },
  { id: "q4", prompt: "Why do the friends leave the marked trail?", choices: ["The wind blows their map away.", "They hear the observatory bell.", "A fallen tree blocks the path.", "They decide to return to the library."], correctIndex: 2, skill: "cause_effect", rationale: "The fallen tree forces them to change course.", sourceReference: "Teacher notes, chapter 5", confidence: 0.94 },
  { id: "q5", prompt: "What does Nora learn by the end of the story?", choices: ["Being careful means never taking risks.", "A mystery is easier when you ignore clues.", "Courage can include asking someone for help.", "Old maps always lead to treasure."], correctIndex: 2, skill: "inference", rationale: "Nora accepts help while facing her fear.", sourceReference: "Teacher notes, chapter 8", confidence: 0.91 },
];
