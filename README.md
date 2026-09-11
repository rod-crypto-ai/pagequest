# PageQuest v0.4 Automatic Quiz Drafts

PageQuest is a visual reading-comprehension product for students in grades 1–8 and the adults who support them. This release automatically finds usable reference material, validates its sufficiency, and builds an AI quiz draft without requiring teacher or parent notes.

## Included

- Responsive student home, book discovery, quiz, results, and adult review views
- Accessible keyboard controls, large tap targets, reduced-motion support, and browser read-aloud
- Strict quiz validation schema with evidence references and confidence fields
- Relational schema for organizations, users, books, sources, quizzes, attempts, and goals
- Version-aware quiz and attempt records
- Deterministic demo content using an original fictional book
- Tested scoring logic
- Live title, author, and ISBN search across Open Library and Google Books
- Provider fallback, result deduplication, loading, empty, and error states
- Normalized covers, authors, publication years, subjects, and stable identifiers
- Ten-question drafts generated from automatically retrieved Project Gutenberg, Open Library, Google Books, and Wikipedia reference material
- Strict structured-output validation and source-sufficiency rejection
- Automatic refusal when trustworthy source coverage is insufficient
- Adult approval gate plus an automatic local-development test path

## Local setup

Prerequisites: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm test
pnpm run type-check
pnpm run lint
pnpm run build
pnpm dev
```

## Database

The application uses Drizzle with the platform's edge relational database. Generate a migration after changing `db/schema.ts`:

```bash
pnpm run db:generate
```

Migrations define schema only. Runtime code must not create or alter tables.
Deterministic local demo records live in `db/seed.sql`; they are never part of production migrations.

## Book metadata

Open Library and public Google Books search work without secrets. A Google Books API key is optional and can improve quota reliability:

```bash
cp .env.example .env.local
```

Then set `GOOGLE_BOOKS_API_KEY` in `.env.local`. Never expose that key in browser code.

Public-domain books can also use catalog summaries from Gutendex. PageQuest uses the public endpoint by default in local and production environments. For sustained production traffic, run a Gutendex instance and provide its base URL as recommended by the project:

```bash
GUTENDEX_BASE_URL=https://gutendex.example.com
```

There is no legitimate general-purpose API that exposes the full text of most copyrighted books. PageQuest therefore uses Google Books and Open Library for broad book identification, adds public-domain catalog material when available, and refuses to generate a quiz when the lawful sources are too thin. Production coverage for newer copyrighted books will require licensed publisher, library, or study-guide content.

## Local quiz generation

Set `OPENAI_API_KEY` in `.env.local`. `OPENAI_MODEL` defaults to `gpt-5-mini`. In local development, selecting **Create quiz draft** automatically finds sources, generates the quiz, and opens it for testing without an approval step. Production still requires adult approval.

Generation is disabled in production unless `QUIZ_GENERATION_ENABLED=true`. Do not enable it publicly until authenticated adult authorization and rate limiting are implemented.

## Release boundaries

- v0.3: real Open Library and Google Books discovery
- v0.4: trusted-source quiz generation and adult approval (current)
- v0.5: durable student attempt workflow

AI must never create book-specific questions from metadata or cover descriptions alone.
