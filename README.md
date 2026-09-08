# Ancient Lens

Dota 2 match review with a Ukrainian interface. Live stats come from OpenDota; the visual language follows `DESIGN.md` (tournament scorebook, not a marketing dashboard).

## Stack

| Layer         | Choice                                               |
| ------------- | ---------------------------------------------------- |
| Runtime       | Node.js 22 LTS                                       |
| Framework     | Nuxt 4 + Vue 3 + Vue Router 5                        |
| Language      | TypeScript (strict)                                  |
| Server        | Nitro                                                |
| State         | Pinia                                                |
| Composables   | VueUse                                               |
| Validation    | Zod                                                  |
| Styles        | Tailwind CSS v4 + match scoreboard CSS + SCSS tokens |
| Fonts / icons | `@nuxt/fonts`, `@nuxt/icon`                          |
| SEO           | `@nuxtjs/seo` (sitemap, robots, Schema.org)          |
| Security      | `nuxt-security` 2.5 (Node 22)                        |
| Quality       | ESLint, Prettier, Vitest, Vue Test Utils             |
| Hosting       | Cloudflare Pages (static `nuxt generate`)            |

## Scripts

```bash
npm install
npm run dev
npm run verify
```

`npm run verify` runs format, lint, typecheck, tests, and `nuxt generate` (the Cloudflare Pages artifact).

Copy `.env.example` to `.env` and set `NUXT_PUBLIC_SITE_URL` for production.

Public hosting (Cloudflare Pages, temporary DuckDNS `ancientlens.duckdns.org`) is in [docs/deploy.md](docs/deploy.md).

## Data

- Live GET requests go from the browser to `https://api.opendota.com/api/matches/{id}`. No credentials.
- Only the match ID is extracted from Dotabuff / OpenDota URLs.
- Hero and item dictionaries are bundled in `public/data/`. Icons load from Valve’s CDN; text fallbacks work when images fail.
- Verified match `8961419173` is bundled with a timestamp in `public/data/snapshot-meta.json`. It is shown as a snapshot and never silently substituted for live data.
- Missing numeric fields display an em dash; real zero stays zero. Stats are not invented.
- Saved matches are browser-local ID bookmarks. JSON exports include provider, retrieval time, and live/snapshot mode.
- Live requests time out after 25 seconds and can be cancelled. OpenDota CORS, indexing, and rate limits apply.

## How we ship

GitHub Flow. `main` is always releasable; the agent never pushes it.

1. Branch from `origin/main`: `feat|fix|chore|refactor|docs|hotfix/<short-name>`
2. One branch / PR ≈ one topic
3. Before push: `npm run verify`
4. Push the **feature branch only**, open a PR into `main`, squash-merge when CI `ci` is green

If the current branch already has work and a new topic starts: **commit and ship that branch first**, then create a new branch. Do not stash. Do not pile unrelated work onto the same branch.
