# PageQuest v0.4 Source-Grounded Quiz Drafts

PageQuest is a visual reading-comprehension product for students in grades 1–8 and the adults who support them. This release adds source-grounded AI quiz drafts and adult review while preserving real book discovery.

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
- Ten-question drafts generated only from adult-provided source notes
- Strict structured-output validation and source-sufficiency rejection
- Adult approval gate plus a local-development-only test bypass

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

## Local quiz generation

Set `OPENAI_API_KEY` in `.env.local`. `OPENAI_MODEL` defaults to `gpt-5-mini`. The local development build shows a test-draft option so a developer can take a generated quiz without approving it first.

Generation is disabled in production unless `QUIZ_GENERATION_ENABLED=true`. Do not enable it publicly until authenticated adult authorization and rate limiting are implemented.

## Release boundaries

- v0.3: real Open Library and Google Books discovery
- v0.4: trusted-source quiz generation and adult approval (current)
- v0.5: durable student attempt workflow

AI must never create book-specific questions from metadata or cover descriptions alone.
