"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Accessibility, BarChart3, BookOpen, ChevronRight, Home, LoaderCircle, Search, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculatePoints } from "@/lib/scoring.mjs";
import { demoBooks, demoQuestions } from "@/lib/demo-data";
import type { BookSearchResult } from "@/lib/books";
import type { Quiz } from "@/lib/validation/quiz";

type Screen = "home" | "books" | "create" | "quiz" | "results" | "adult";
type DisplayBook = {
  id: string;
  title: string;
  author: string;
  isbn13: string | null;
  genre: string;
  gradeBand: string;
  cover: string;
  quizReady: boolean;
  source?: BookSearchResult["source"];
  publishedYear?: number | null;
};
type SourceCredit = { name: string; url: string; licenseNote: string };
const navigation: Array<{ id: Screen; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "books", label: "Find a book", icon: Search },
  { id: "results", label: "My progress", icon: BarChart3 },
  { id: "adult", label: "Adult preview", icon: ShieldCheck },
];

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");
  const [liveBooks, setLiveBooks] = useState<DisplayBook[] | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [searchMessage, setSearchMessage] = useState("");
  const [selectedBook, setSelectedBook] = useState<DisplayBook | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const gradeBand: Quiz["gradeBand"] = "3-5";
  const [generationState, setGenerationState] = useState<"idle" | "loading" | "error">("idle");
  const [generationMessage, setGenerationMessage] = useState("");
  const [generationSources, setGenerationSources] = useState<SourceCredit[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [approved, setApproved] = useState(false);
  const filteredBooks = useMemo<DisplayBook[]>(() => {
    if (liveBooks) return liveBooks;
    const value = query.trim().toLowerCase();
    return value ? demoBooks.filter((book) => [book.title, book.author, book.isbn13, book.genre].join(" ").toLowerCase().includes(value)) : [...demoBooks];
  }, [liveBooks, query]);
  const activeQuestions = generatedQuiz?.questions ?? demoQuestions;
  const activeBookTitle = generatedQuiz?.book.title ?? "The Moonlit Map";
  const correctCount = answers.reduce((count, answer, index) => count + (answer === activeQuestions[index]?.correctIndex ? 1 : 0), 0);
  const scorePercent = Math.round((correctCount / activeQuestions.length) * 100);
  const earnedPoints = calculatePoints({ basePoints: 5, scorePercent, passingScore: 70 });
  const question = activeQuestions[questionIndex];

  function goTo(next: Screen) { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function startQuiz() { setQuestionIndex(0); setSelected(null); setAnswers([]); goTo("quiz"); }
  function advanceQuiz() {
    if (selected === null) return;
    setAnswers((current) => [...current, selected]); setSelected(null);
    if (questionIndex === activeQuestions.length - 1) goTo("results"); else setQuestionIndex((current) => current + 1);
  }
  function readQuestion() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${question.prompt}. ${question.choices.join(". ")}`));
  }

  async function searchBooks(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) {
      setSearchState("error");
      setSearchMessage("Enter at least two characters.");
      return;
    }
    setSearchState("loading");
    setSearchMessage("");
    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(value)}`);
      const payload = await response.json() as { books?: BookSearchResult[]; error?: string; partial?: boolean };
      if (!response.ok || !payload.books) throw new Error(payload.error ?? "Search failed.");
      setLiveBooks(payload.books.map((book) => ({
        id: book.id,
        title: book.title,
        author: book.authors.join(", ") || "Author unavailable",
        isbn13: book.isbn13,
        genre: book.subjects[0] ?? "General",
        gradeBand: "To be reviewed",
        cover: book.coverUrl ?? "fallback",
        quizReady: false,
        source: book.source,
        publishedYear: book.publishedYear,
      })));
      setSearchMessage(payload.partial ? "Results loaded from one book provider; the other is temporarily unavailable." : "");
      setSearchState("idle");
    } catch (error) {
      setLiveBooks([]);
      setSearchState("error");
      setSearchMessage(error instanceof Error ? error.message : "Book search is temporarily unavailable.");
    }
  }

  function beginQuizDraft(book: DisplayBook) {
    setSelectedBook(book);
    setGeneratedQuiz(null);
    setApproved(false);
    setGenerationState("loading");
    setGenerationMessage("");
    setGenerationSources([]);
    goTo("create");
    void generateQuiz(book, process.env.NODE_ENV !== "production");
  }

  async function generateQuiz(book: DisplayBook, testDraft: boolean) {
    setGenerationState("loading");
    setGenerationMessage("");
    try {
      const response = await fetch("/api/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: { title: book.title, author: book.author, isbn13: book.isbn13 },
          gradeBand,
          testDraft,
        }),
      });
      const payload = await response.json() as { quiz?: Quiz; error?: string; sources?: SourceCredit[] };
      setGenerationSources(payload.sources ?? []);
      if (!response.ok || !payload.quiz) throw new Error(payload.error ?? "Quiz generation failed.");
      setGeneratedQuiz(payload.quiz);
      setGenerationState("idle");
      if (testDraft) startQuiz(); else goTo("adult");
    } catch (error) {
      setGenerationState("error");
      setGenerationMessage(error instanceof Error ? error.message : "Quiz generation failed.");
    }
  }

  return <div className="app-shell">
    <aside className="sidebar" aria-label="Main navigation">
      <button className="brand" onClick={() => goTo("home")}><span className="brand-mark"><BookOpen /></span><span>PageQuest</span></button>
      <nav className="sidebar-nav">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => goTo(item.id)}><Icon /><span>{item.label}</span></button>; })}</nav>
      <section className="goal-card" aria-label="September reading goal"><strong>September goal</strong><span>13.6 of 20 points</span><Progress value={68} /></section>
    </aside>
    <main className="content">
      <header className="topbar"><div><span>Welcome back</span><strong>Ready for your next story, Maya?</strong></div><div className="top-actions"><Button variant="outline" size="icon" aria-label="Read-aloud settings"><Volume2 /></Button><Button variant="outline" size="icon" aria-label="Accessibility settings"><Accessibility /></Button><span className="avatar" aria-label="Maya's fox avatar">🦊</span></div></header>

      {screen === "home" && <section className="screen" aria-labelledby="welcome-title">
        <div className="hero"><Image src="/assets/reading-hero.webp" fill priority sizes="(max-width: 700px) 100vw, 80vw" alt="Three children sharing a book in a warm library nook" /><div className="hero-shade" /><div className="hero-copy"><span className="eyebrow"><Sparkles /> Your next reading adventure</span><h1 id="welcome-title">Every book opens a new path.</h1><p>Finish a story, show what you understood, and move closer to your reading goal.</p><Button className="gold-button" size="lg" onClick={() => goTo("books")}>Find my book <ChevronRight /></Button></div></div>
        <div className="section-heading"><h2>Continue your quest</h2><button onClick={() => goTo("books")}>See all books</button></div>
        <div className="continue-grid">{demoBooks.slice(0, 3).map((book) => <BookRow key={book.id} book={book} onOpen={book.quizReady ? startQuiz : undefined} />)}</div>
      </section>}

      {screen === "books" && <section className="screen" aria-labelledby="book-search-title">
        <div className="search-hero"><h1 id="book-search-title">Which book did you finish?</h1><p>Search real library catalogs by title, author, or ISBN.</p><form className="search-box" onSubmit={searchBooks}><Search aria-hidden="true" /><label className="sr-only" htmlFor="book-query">Search books</label><input id="book-query" value={query} onChange={(event) => { setQuery(event.target.value); if (liveBooks) setLiveBooks(null); }} placeholder="Try “Charlotte’s Web”" autoComplete="off" /><Button type="submit" disabled={searchState === "loading"}>{searchState === "loading" ? <><LoaderCircle className="spin" /> Searching</> : "Search"}</Button></form></div>
        <div className="result-summary"><p className="result-count" aria-live="polite">{searchState === "loading" ? "Searching two trusted book catalogs…" : `${filteredBooks.length} ${filteredBooks.length === 1 ? "book" : "books"} found`}</p>{liveBooks && <button onClick={() => { setLiveBooks(null); setQuery(""); setSearchMessage(""); }}>Clear search</button>}</div>
        {searchMessage && <p className={`search-message ${searchState === "error" ? "error" : ""}`} role={searchState === "error" ? "alert" : "status"}>{searchMessage}</p>}
        {searchState === "loading" && <div className="search-loading" aria-hidden="true">{[1, 2, 3, 4].map((item) => <div className="book-skeleton" key={item}><span /><b /><i /></div>)}</div>}
        {searchState !== "loading" && <div className="catalog-grid">{filteredBooks.map((book) => <BookTile key={book.id} book={book} onOpen={book.quizReady ? startQuiz : undefined} onCreate={!book.quizReady ? () => beginQuizDraft(book) : undefined} />)}</div>}
        {searchState !== "loading" && filteredBooks.length === 0 && <div className="empty-state"><BookOpen /><h2>No books found</h2><p>Check the spelling, try the author’s name, or enter the ISBN.</p></div>}
      </section>}

      {screen === "create" && selectedBook && <section className="screen create-shell" aria-labelledby="create-title">
        <button className="back-link" onClick={() => goTo("books")}>← Back to books</button>
        <div className="create-heading"><div><span className="eyebrow"><Sparkles /> Automatic quiz builder</span><h1 id="create-title">PageQuest is building the quiz.</h1><p>It is finding usable story sources, checking whether they contain enough evidence, and creating ten questions without asking you to write notes.</p></div><div className="selected-book-chip"><strong>{selectedBook.title}</strong><span>{selectedBook.author}</span></div></div>
        <div className="auto-generation-card" aria-live="polite">
          {generationState === "loading" ? <><LoaderCircle className="spin auto-generation-icon" /><h2>Finding trustworthy story information…</h2><p>This can take several seconds. PageQuest will refuse to invent questions when the available sources are too thin.</p><ol><li className="active">Check public reference sources</li><li>Evaluate story coverage</li><li>Build and validate 10 questions</li></ol></> : <><BookOpen className="auto-generation-icon error-icon" /><h2>We couldn’t create a reliable quiz.</h2><p className="search-message error" role="alert">{generationMessage}</p>{generationSources.length > 0 && <SourceCredits sources={generationSources} />}<div className="generation-actions"><Button variant="outline" onClick={() => goTo("books")}>Choose another book</Button><Button onClick={() => generateQuiz(selectedBook, process.env.NODE_ENV !== "production")}>Try again</Button></div></>}
        </div>
      </section>}

      {screen === "quiz" && question && <section className="screen quiz-shell" aria-labelledby="question-title">
        <div className="quiz-heading"><div className="mini-book">{generatedQuiz ? <span className="mini-cover"><BookOpen /></span> : <Image src="/assets/moonlit-map-cover.webp" width={48} height={64} alt="" />}<div><strong>{activeBookTitle}</strong><span>Question {questionIndex + 1} of {activeQuestions.length}{generatedQuiz && !approved ? " · Test draft" : ""}</span></div></div><Button variant="outline" onClick={() => goTo("books")}>Exit quiz</Button></div>
        <Progress value={((questionIndex + 1) / activeQuestions.length) * 100} aria-label={`Question ${questionIndex + 1} of ${activeQuestions.length}`} />
        <article className="question-card"><span className="skill-label">{question.skill.replace("_", " ")}</span><h1 id="question-title">{question.prompt}</h1>
          {question.visual && !generatedQuiz && <figure className="question-visual"><Image src="/assets/sequence-question.webp" width={1400} height={700} alt="Four scenes showing the friends' journey from finding a map to reaching an observatory" /><figcaption>Look closely at what happens in each scene.</figcaption></figure>}
          <div className="answer-grid">{question.choices.map((choice, index) => <button key={choice} className={`answer-card ${selected === index ? "selected" : ""}`} onClick={() => setSelected(index)} aria-pressed={selected === index}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}</div>
          <footer className="quiz-footer"><button className="read-button" onClick={readQuestion}><Volume2 /> Read aloud</button><Button size="lg" disabled={selected === null} onClick={advanceQuiz}>{questionIndex === activeQuestions.length - 1 ? "See my results" : "Next question"}<ChevronRight /></Button></footer>
        </article>
      </section>}

      {screen === "results" && <section className="screen results-shell" aria-labelledby="results-title">
        <div className="celebration"><div className="score-ring"><strong>{answers.length ? scorePercent : 80}%</strong></div><h1 id="results-title">Strong reading, Maya!</h1><p>You followed the story and understood its important events.</p></div>
        <div className="stats-grid"><Stat label="Correct answers" value={answers.length ? `${correctCount} of ${activeQuestions.length}` : "4 of 5"} /><Stat label="Points earned" value={`+${answers.length ? earnedPoints.toFixed(1) : "4.0"}`} /><Stat label="Monthly goal" value="68%" /></div>
        <section className="skills-card"><h2>Your reading skills</h2><Skill label="Characters" value={100} /><Skill label="Sequence" value={75} /><Skill label="Inference" value={65} /><div className="result-actions"><Button variant="outline" onClick={() => goTo("home")}>Back home</Button><Button onClick={() => goTo("books")}>Choose another book</Button></div></section>
      </section>}

      {screen === "adult" && <section className="screen" aria-labelledby="review-title">
        <div className="adult-heading"><div><h1 id="review-title">Adult review</h1><p>{generatedQuiz ? "Check every answer against your notes before students can use this quiz." : "Generated drafts stay private until an adult approves them."}</p></div><div className="review-actions">{generatedQuiz && <Button variant="outline" onClick={() => goTo("create")}>Revise source</Button>}<Button onClick={() => setApproved(true)} disabled={approved}>{approved ? "Quiz approved" : "Approve quiz"}</Button></div></div>
        <div className="adult-grid"><article className="review-card"><div className="review-book">{generatedQuiz ? <span className="review-cover"><BookOpen /></span> : <Image src="/assets/moonlit-map-cover.webp" width={82} height={110} alt="The Moonlit Map cover" />}<div><span className={`status-pill ${approved ? "approved" : ""}`}>{approved ? "Approved" : "Needs review"}</span><h2>{activeBookTitle}</h2><p>Grades {(generatedQuiz?.gradeBand ?? "3-5").replace("-", "–")} · Version {generatedQuiz?.version ?? 1} · {activeQuestions.length} questions</p></div></div>{activeQuestions.map((item, index) => <div className="review-question" key={item.id}><header><h3>{index + 1}. {item.prompt}</h3><span>{Math.round(item.confidence * 100)}% source match</span></header><p><strong>Correct answer:</strong> {item.choices[item.correctIndex]}</p><p><strong>Evidence:</strong> {item.sourceReference} · {item.rationale}</p></div>)}</article><aside className="quality-card"><div className="confidence"><span>Average source confidence</span><strong>{Math.round(activeQuestions.reduce((sum, item) => sum + item.confidence, 0) / activeQuestions.length * 100)}%</strong><small>Automatically retrieved sources</small></div>{generationSources.length > 0 && <SourceCredits sources={generationSources} />}<h2>Approval checklist</h2><ul><li>Every answer matches a cited source</li><li>No copied book passages</li><li>Language fits the selected grade</li><li>Distractors are clearly incorrect</li><li>No confusing or duplicate items</li></ul><Button className="full-button" onClick={startQuiz} disabled={generatedQuiz ? !approved : false}>{generatedQuiz && !approved ? "Approve before student use" : "Preview as student"}</Button></aside></div>
      </section>}
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => goTo(item.id)}><Icon /><span>{item.label.replace("Find a ", "")}</span></button>; })}</nav>
  </div>;
}

function BookArtwork({ cover, title }: { cover: string; title: string }) { return cover.startsWith("/") ? <Image src={cover} fill sizes="180px" alt={`${title} cover`} /> : cover.startsWith("https://") ? <Image src={cover} fill sizes="(max-width: 700px) 45vw, 220px" alt={`${title} cover`} referrerPolicy="no-referrer" /> : <div className={`type-cover ${cover}`}>{title.split(" ").map((word, index) => <span key={`${word}-${index}`}>{word}</span>)}</div>; }
function BookRow({ book, onOpen }: { book: DisplayBook; onOpen?: () => void }) { return <article className="book-row"><div className="book-cover"><BookArtwork cover={book.cover} title={book.title} /></div><div><span className={`status-pill ${book.quizReady ? "approved" : ""}`}>{book.quizReady ? "Quiz ready" : "Adult help needed"}</span><h3>{book.title}</h3><p>{book.genre} · Grades {book.gradeBand}</p>{onOpen && <button onClick={onOpen}>Start quiz <ChevronRight /></button>}</div></article>; }
function BookTile({ book, onOpen, onCreate }: { book: DisplayBook; onOpen?: () => void; onCreate?: () => void }) { return <article className="book-tile"><div className="book-cover"><BookArtwork cover={book.cover} title={book.title} /></div><span className={`status-pill ${book.quizReady ? "approved" : ""}`}>{book.quizReady ? "Quiz ready" : "Quiz not created"}</span><h2>{book.title}</h2><p>{book.author}{book.publishedYear ? ` · ${book.publishedYear}` : ""}</p><small>{book.isbn13 ? `ISBN ${book.isbn13}` : book.source === "open_library" ? "Open Library record" : book.source === "google_books" ? "Google Books record" : book.genre}</small><Button variant={onOpen ? "default" : "outline"} className="full-button" onClick={onOpen ?? onCreate}>{onOpen ? "Start quiz" : "Create quiz draft"}</Button></article>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>; }
function Skill({ label, value }: { label: string; value: number }) { return <div className="skill-row"><strong>{label}</strong><Progress value={value} /><b>{value}%</b></div>; }
function SourceCredits({ sources }: { sources: SourceCredit[] }) { return <section className="source-credits"><h3>Sources checked</h3>{sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><strong>{source.name}</strong><span>{source.licenseNote}</span></a>)}</section>; }
