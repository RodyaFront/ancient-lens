# Ancient Lens

Production Vue 3 + Nuxt 4 application scaffold.

## Stack

| Layer                  | Choice                                               |
| ---------------------- | ---------------------------------------------------- |
| Runtime                | Node.js 22 LTS                                       |
| Framework              | Nuxt 4 + Vue 3 + Vue Router 5                        |
| Language               | TypeScript (strict)                                  |
| Server                 | Nitro                                                |
| State                  | Pinia                                                |
| Composables            | VueUse                                               |
| Validation             | Zod                                                  |
| Styles                 | Tailwind CSS v4 (`@tailwindcss/vite`) + SCSS tokens  |
| Fonts / icons / images | `@nuxt/fonts`, `@nuxt/icon`, `@nuxt/image`           |
| SEO                    | `@nuxtjs/seo` (sitemap, robots, OG, Schema.org)      |
| Security               | `nuxt-security` 2.5 (Node 22)                        |
| Quality                | ESLint, Prettier, Vitest, Vue Test Utils, Playwright |

Auth, database, and i18n are intentionally not included until the product needs them.

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Copy `.env.example` to `.env` and set `NUXT_PUBLIC_SITE_URL` for production.

## How we ship

GitHub Flow. `main` is always releasable; the agent never pushes it.

1. Branch from `origin/main`: `feat|fix|chore|refactor|docs|hotfix/<short-name>`
2. One branch / PR ≈ one topic
3. Before push: `npm run verify` (format, lint, typecheck, test, build)
4. Push the **feature branch only**, open a PR into `main`, squash-merge when CI `ci` is green

If the current branch already has work and a new topic starts: **commit and ship that branch first**, then create a new branch. Do not stash. Do not pile unrelated work onto the same branch.
