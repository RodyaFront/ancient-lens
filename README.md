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
