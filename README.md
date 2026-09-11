# PageQuest v0.3 Book Discovery

PageQuest is a visual reading-comprehension product for students in grades 1–8 and the adults who support them. This release adds real book discovery while preserving the tested v0.2 foundation. Quiz generation remains intentionally separate from metadata search.

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

## Release boundaries

- v0.3: real Open Library and Google Books discovery (current)
- v0.4: trusted-source quiz generation and adult approval
- v0.5: durable student attempt workflow

AI must never create book-specific questions from metadata or cover descriptions alone.
