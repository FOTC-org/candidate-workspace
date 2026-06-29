# UserHub Web (`apps/web`)

Next.js (App Router) + Tailwind CSS frontend. Coding standards: `.github/instructions/nextjs.instructions.md`.

## Architecture

Composition flows top-down: **`page.tsx` → `<Feature>PageForm` → sections → atomic elements** (see §2 of the standards).

```
src/
├── app/               ← routing: page/layout/loading/error/not-found per segment
│   ├── (auth)/        ← login, register
│   └── (protected)/   ← users (ADMIN only), profile
├── components/
│   ├── core/          ← shared components (navigation, table, ...)
│   └── <feature>/     ← components per feature (hooks/, models/, types.ts)
├── hooks/             ← global hooks
├── lib/api/           ← API layer (one function = one endpoint, typed)
└── types/             ← shared types
```

The `users` segment is the reference implementation of `loading.tsx` / `error.tsx` / `not-found.tsx` — replicate this pattern in new segments.

## Run standalone

```bash
cp .env.example .env
pnpm dev               # requires the API running on :3001
```

App: http://localhost:3000

## Tests

```bash
pnpm test              # Vitest + Testing Library
```
