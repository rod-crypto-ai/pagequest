"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Accessibility, BarChart3, BookOpen, ChevronRight, Home, Search, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { calculatePoints } from "@/lib/scoring.mjs";
import { demoBooks, demoQuestions } from "@/lib/demo-data";

type Screen = "home" | "books" | "quiz" | "results" | "adult";
const navigation: Array<{ id: Screen; label: string; icon: typeof Home }> = [
  { id: "home", label: "Home", icon: Home },
  { id: "books", label: "Find a book", icon: Search },
  { id: "results", label: "My progress", icon: BarChart3 },
  { id: "adult", label: "Adult preview", icon: ShieldCheck },
];

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [approved, setApproved] = useState(false);
  const filteredBooks = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? demoBooks.filter((book) => [book.title, book.author, book.isbn13, book.genre].join(" ").toLowerCase().includes(value)) : demoBooks;
  }, [query]);
  const correctCount = answers.reduce((count, answer, index) => count + (answer === demoQuestions[index]?.correctIndex ? 1 : 0), 0);
  const scorePercent = Math.round((correctCount / demoQuestions.length) * 100);
  const earnedPoints = calculatePoints({ basePoints: 5, scorePercent, passingScore: 70 });
  const question = demoQuestions[questionIndex];

  function goTo(next: Screen) { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function startQuiz() { setQuestionIndex(0); setSelected(null); setAnswers([]); goTo("quiz"); }
  function advanceQuiz() {
    if (selected === null) return;
    setAnswers((current) => [...current, selected]); setSelected(null);
    if (questionIndex === demoQuestions.length - 1) goTo("results"); else setQuestionIndex((current) => current + 1);
  }
  function readQuestion() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${question.prompt}. ${question.choices.join(". ")}`));
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
        <div className="search-hero"><h1 id="book-search-title">Which book did you finish?</h1><p>Search by title, author, or ISBN. Reviewed quizzes appear first.</p><label className="search-box"><Search aria-hidden="true" /><span className="sr-only">Search books</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “The Moonlit Map”" /></label></div>
        <p className="result-count">{filteredBooks.length} {filteredBooks.length === 1 ? "book" : "books"} found</p>
        <div className="catalog-grid">{filteredBooks.map((book) => <BookTile key={book.id} book={book} onOpen={book.quizReady ? startQuiz : undefined} />)}</div>
        {filteredBooks.length === 0 && <div className="empty-state"><BookOpen /><h2>No books found</h2><p>Check the spelling or try an ISBN.</p></div>}
      </section>}

      {screen === "quiz" && question && <section className="screen quiz-shell" aria-labelledby="question-title">
        <div className="quiz-heading"><div className="mini-book"><Image src="/assets/moonlit-map-cover.webp" width={48} height={64} alt="" /><div><strong>The Moonlit Map</strong><span>Question {questionIndex + 1} of {demoQuestions.length}</span></div></div><Button variant="outline" onClick={() => goTo("books")}>Exit quiz</Button></div>
        <Progress value={((questionIndex + 1) / demoQuestions.length) * 100} aria-label={`Question ${questionIndex + 1} of ${demoQuestions.length}`} />
        <article className="question-card"><span className="skill-label">{question.skill.replace("_", " ")}</span><h1 id="question-title">{question.prompt}</h1>
          {question.visual && <figure className="question-visual"><Image src="/assets/sequence-question.webp" width={1400} height={700} alt="Four scenes showing the friends' journey from finding a map to reaching an observatory" /><figcaption>Look closely at what happens in each scene.</figcaption></figure>}
          <div className="answer-grid">{question.choices.map((choice, index) => <button key={choice} className={`answer-card ${selected === index ? "selected" : ""}`} onClick={() => setSelected(index)} aria-pressed={selected === index}><span>{String.fromCharCode(65 + index)}</span>{choice}</button>)}</div>
          <footer className="quiz-footer"><button className="read-button" onClick={readQuestion}><Volume2 /> Read aloud</button><Button size="lg" disabled={selected === null} onClick={advanceQuiz}>{questionIndex === demoQuestions.length - 1 ? "See my results" : "Next question"}<ChevronRight /></Button></footer>
        </article>
      </section>}

      {screen === "results" && <section className="screen results-shell" aria-labelledby="results-title">
        <div className="celebration"><div className="score-ring"><strong>{answers.length ? scorePercent : 80}%</strong></div><h1 id="results-title">Strong reading, Maya!</h1><p>You followed the story and understood its important events.</p></div>
        <div className="stats-grid"><Stat label="Correct answers" value={answers.length ? `${correctCount} of ${demoQuestions.length}` : "4 of 5"} /><Stat label="Points earned" value={`+${answers.length ? earnedPoints.toFixed(1) : "4.0"}`} /><Stat label="Monthly goal" value="68%" /></div>
        <section className="skills-card"><h2>Your reading skills</h2><Skill label="Characters" value={100} /><Skill label="Sequence" value={75} /><Skill label="Inference" value={65} /><div className="result-actions"><Button variant="outline" onClick={() => goTo("home")}>Back home</Button><Button onClick={() => goTo("books")}>Choose another book</Button></div></section>
      </section>}

      {screen === "adult" && <section className="screen" aria-labelledby="review-title">
        <div className="adult-heading"><div><h1 id="review-title">Adult review</h1><p>Generated drafts stay private until an adult approves them.</p></div><Button onClick={() => setApproved(true)} disabled={approved}>{approved ? "Quiz approved" : "Approve quiz"}</Button></div>
        <div className="adult-grid"><article className="review-card"><div className="review-book"><Image src="/assets/moonlit-map-cover.webp" width={82} height={110} alt="The Moonlit Map cover" /><div><span className={`status-pill ${approved ? "approved" : ""}`}>{approved ? "Approved" : "Needs review"}</span><h2>The Moonlit Map</h2><p>Grades 3–5 · Version 1 · 5 questions</p></div></div>{demoQuestions.slice(0, 2).map((item, index) => <div className="review-question" key={item.id}><header><h3>{index + 1}. {item.prompt}</h3><span>Supported</span></header><p>Correct answer: {item.choices[item.correctIndex]}</p><div><Button variant="outline" size="sm">Edit</Button><Button variant="outline" size="sm">Replace</Button></div></div>)}</article><aside className="quality-card"><div className="confidence"><span>Source confidence</span><strong>94%</strong><small>Teacher-provided chapter notes</small></div><h2>Quality checks</h2><ul><li>Answers supported by source notes</li><li>No copied book passages</li><li>Reading level fits grades 3–5</li><li>No duplicate questions</li><li>Correct answers are evenly placed</li></ul><Button variant="outline" className="full-button" onClick={startQuiz}>Preview as student</Button></aside></div>
      </section>}
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => goTo(item.id)}><Icon /><span>{item.label.replace("Find a ", "")}</span></button>; })}</nav>
  </div>;
}

function BookArtwork({ cover, title }: { cover: string; title: string }) { return cover.startsWith("/") ? <Image src={cover} fill sizes="180px" alt={`${title} cover`} /> : <div className={`type-cover ${cover}`}>{title.split(" ").map((word) => <span key={word}>{word}</span>)}</div>; }
function BookRow({ book, onOpen }: { book: (typeof demoBooks)[number]; onOpen?: () => void }) { return <article className="book-row"><div className="book-cover"><BookArtwork cover={book.cover} title={book.title} /></div><div><span className={`status-pill ${book.quizReady ? "approved" : ""}`}>{book.quizReady ? "Quiz ready" : "Adult help needed"}</span><h3>{book.title}</h3><p>{book.genre} · Grades {book.gradeBand}</p>{onOpen && <button onClick={onOpen}>Start quiz <ChevronRight /></button>}</div></article>; }
function BookTile({ book, onOpen }: { book: (typeof demoBooks)[number]; onOpen?: () => void }) { return <article className="book-tile"><div className="book-cover"><BookArtwork cover={book.cover} title={book.title} /></div><span className={`status-pill ${book.quizReady ? "approved" : ""}`}>{book.quizReady ? "Quiz ready" : "Source needed"}</span><h2>{book.title}</h2><p>{book.author} · {book.genre}</p><Button variant={onOpen ? "default" : "outline"} className="full-button" onClick={onOpen}>{onOpen ? "Start quiz" : "Ask an adult"}</Button></article>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>; }
function Skill({ label, value }: { label: string; value: number }) { return <div className="skill-row"><strong>{label}</strong><Progress value={value} /><b>{value}%</b></div>; }
