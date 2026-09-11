# PageQuest v0.2 Foundation

PageQuest is a visual reading-comprehension product for students in grades 1–8 and the adults who support them. This release converts the approved concept into a typed application foundation. It intentionally does not connect live book providers or AI generation yet.

## Included

- Responsive student home, book discovery, quiz, results, and adult review views
- Accessible keyboard controls, large tap targets, reduced-motion support, and browser read-aloud
- Strict quiz validation schema with evidence references and confidence fields
- Relational schema for organizations, users, books, sources, quizzes, attempts, and goals
- Version-aware quiz and attempt records
- Deterministic demo content using an original fictional book
- Tested scoring logic

## Local setup

Prerequisites: Node.js 22.13 or newer and pnpm 11.

```bash
pnpm install
pnpm test
pnpm run type-check
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

## Release boundaries

- v0.3: real Open Library and Google Books discovery
- v0.4: trusted-source quiz generation and adult approval
- v0.5: durable student attempt workflow

AI must never create book-specific questions from metadata or cover descriptions alone.
