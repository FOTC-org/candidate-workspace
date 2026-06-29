---
description: "Frontend standards Next.js (App Router) + Tailwind — component decomposition, feature-folder structure, Server/Client Components, native loading/error states"
applyTo: "apps/web/**"
---

# Frontend standards — Next.js (App Router) + Tailwind

> These rules are **non-negotiable** and reflect the team's code style. Code that works but violates the standards below is treated as a defect. Default patterns from documentation and tutorials are NOT acceptable when they conflict with these rules.

## 1. Directory structure and naming

```
src/
├── app/                          ← routing (App Router): page/layout/loading/error
│   └── users/
│       ├── page.tsx              ← thin: composes the feature's components (~30 lines)
│       ├── loading.tsx
│       ├── error.tsx
│       └── not-found.tsx
├── components/
│   ├── core/                     ← shared (DataTable, Link, Toaster...)
│   └── users/                    ← components per feature
│       ├── users-page-form.tsx   ← section layout + optional Provider
│       ├── filters/
│       ├── table/
│       ├── hooks/                ← feature-local hooks (+ index.ts)
│       ├── context/              ← feature-local context
│       ├── models/               ← feature enums/constants (+ index.ts)
│       └── types.ts              ← feature domain types
├── hooks/                        ← global hooks (use-*.ts)
├── lib/                          ← utils, API layer (lib/api/)
└── types/                        ← shared types
```

- **Files: always `kebab-case.tsx`** (`users-page-form.tsx`, `use-users-filters.tsx`). Components (functions): `PascalCase` with a full semantic name (`UsersDataTable`, not `Table`).
- Barrel exports (`index.ts`) **selectively** — only in directories from which many things are imported (`hooks/`, `models/`); not in every folder.
- Imports from outside the current folder via the `@/` alias (`@/hooks/use-search`); within a folder — relative (`./table`).

## 2. Component decomposition (hard requirement)

Composition always flows top-down: **`page.tsx` → `<Feature>PageForm` → sections → atomic elements.**

- `page.tsx` is thin: metadata + composition of the feature's components. Zero logic.
- **A typical component file: 30–100 lines. A file above ~150 lines MUST be split** into smaller components/subdirectories (exceptions: complex filter forms, context providers).
- When a component has subcomponents, it gets its own directory (`table/users-table.tsx` + `table/users-data-table.tsx` + `table/table.constants.tsx` for column definitions).
- Table column definitions, UI configuration constants → a separate `*.constants.tsx` file, not inline in the component.

## 3. Components — code shape

- Props via an `interface` with the `Props` suffix, **in the same file, directly above the component**:

  ```tsx
  export interface UsersDataTableProps {
    rows: UserRow[];
    lpOffset: number;
  }

  export function UsersDataTable({ rows, lpOffset }: UsersDataTableProps): React.JSX.Element {
  ```

- **Explicit return type `React.JSX.Element`** for every component.
- Import React as a namespace: `import * as React from 'react'`; hooks called as `React.useState`, `React.useCallback`, `React.useMemo`.
- Functions declared with `export function` (not `const X = () =>`).

## 4. Logic vs presentation

- **Hooks = logic, components = JSX.** Business logic (filters, export, transformations) is extracted into custom hooks: global ones in `src/hooks/use-*.ts`, feature-local ones in `components/<feature>/hooks/`.
- State shared within a feature → React Context in `components/<feature>/context/` following the pattern: Provider with `React.useMemo` on the value + a dedicated consumption hook `use<Name>()`.
- Feature domain types in the feature's `types.ts`; enums in `models/`; context types with the `Value` suffix (`UsersFiltersContextValue`).

## 5. Server Components vs Client Components (Next.js specifics)

- **Everything is a Server Component by default.** Data fetching in Server Components (`async` components, functions from `lib/api/`).
- `"use client"` ONLY for components requiring interactivity (event handlers, `useState`/`useEffect`, browser APIs), isolated to the smallest leaf component.
- FORBIDDEN: `"use client"` at the `page.tsx`/`layout.tsx` level; fetching domain data in `useEffect`.
- Mutations: Server Actions or API calls from leaf Client Components.
- Components NEVER build requests manually — they import ready-made functions from the `lib/api/` layer (one function = one endpoint, typed response).

## 6. Loading / error states — native Next.js files

- Every route segment that fetches data MUST have:
  - `loading.tsx` (skeleton/spinner) — NOT manual `isLoading` flags in state,
  - `error.tsx` (client boundary with `reset()`),
  - `not-found.tsx` where the resource may not exist (`notFound()` from `next/navigation`).
- Granular streaming via `<Suspense>` where part of the page can load later.
- Empty state rendered explicitly in the list/table component (a readable message), not a blank screen.

## 7. Forms and validation

- Forms: **`react-hook-form` + `zod`** (`zodResolver`).
- Zod schema + inferred type in the feature's `types.ts`:
  ```ts
  export const userFilterSchema = z.object({ email: z.string().optional() });
  export type UserFilterValues = z.infer<typeof userFilterSchema>;
  ```

## 8. Styling and quality

- Tailwind CSS as the only styling system. FORBIDDEN: inline styles (`style={{...}}`), separate `.css` files per component (besides `globals.css`).
- Component variants via class composition (`clsx`/`cva`), not by duplicating components.
- TypeScript `strict`. FORBIDDEN: `any`, `@ts-ignore` (exceptionally `@ts-expect-error` with a justification).
- Types shared with the API in one place (`packages/` or `src/types/`) — no copying definitions between apps.
- Language of code, names, and comments: **English**. No `console.log` and no dead code.

## 9. Tests

- Components with conditional logic (roles, empty states, errors) MUST have tests (Testing Library). Purely presentational components may go without tests.
- Custom hooks with business logic MUST have tests (happy path + edge cases).
