# Деплой в интернет

План выкладки Ancient Lens **без своего железа и без оплаты хостинга**. Брендовый домен — позже. Сейчас публичный адрес — DuckDNS.

**Статус:** план, сайт ещё не в проде.

| Параметр        | Значение                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| Хостинг         | [Cloudflare Pages](https://pages.cloudflare.com/) (бесплатный тариф)         |
| Где крутится    | CDN Cloudflare (edge), не VPS и не домашний ПК                               |
| Временный домен | `ancientlens.duckdns.org`                                                    |
| Целевой URL     | `https://ancientlens.duckdns.org`                                            |
| Репозиторий     | `git@github.com:RodyaFront/ancient-lens.git`                                 |
| Деплой          | push в `main` → сборка Pages (после того как ветка влита и проект подключён) |
| Env на хосте    | `NUXT_PUBLIC_SITE_URL=https://ancientlens.duckdns.org`                       |
|                 | `NUXT_SITE_URL=https://ancientlens.duckdns.org`                              |

Матчи **не** хостятся у нас: браузер ходит на `https://api.opendota.com`. На Cloudflare лежат HTML/JS/CSS, словари героев/предметов и статика.

Секреты (токен DuckDNS, API-ключи Cloudflare) **не** класть в git.

---

## Почему так, а не как marketplace

Creative Service Marketplace — Nuxt SSR + Postgres + Stripe, поэтому там Oracle VM, Docker и Nginx.

У Ancient Lens нет БД, сессий и загрузок. Свой Node-сервер для матчей не нужен. Отдельный VPS (в том числе вторая Oracle Always Free рядом с marketplace) — запасной путь, не цель.

Vercel / Railway / Render в план не входят: либо ограничения на «личный» тариф, либо бесплатный слот со временем кончается.

---

## Что должно быть в коде до первого деплоя

Сейчас `nuxt build` собирает **Node** (`nitro` preset `node-server`). Cloudflare Pages отдаёт **файлы**. Перед подключением репо:

1. Сборка статики: `npm run generate` (Nitro preset `static` / `cloudflare_pages` на CI Pages, не `node-server`).
2. В Cloudflare и локально для проверки:  
   `NUXT_PUBLIC_SITE_URL=https://ancientlens.duckdns.org`  
   `NUXT_SITE_URL=https://ancientlens.duckdns.org`
3. Одна страница `/` уже грузит матч в браузере — пререндер `/` достаточен. `?match=` остаётся клиентским query.
4. `GET /api/health` на статике не будет. E2E, которые бьют в health, перевести на проверку HTML `/` или убрать с прод-пути.
5. Если `nuxt generate` падает из‑за `nuxt-og-image` / sharp / playwright — отключить og-image до тех пор, пока не понадобятся картинки превью. В UI `defineOgImage` сейчас не используется.
6. CSP уже разрешает `connect-src` на `https://api.opendota.com` и картинки Steam CDN — это оставить.

Это отдельные коммиты (`feat` / `fix`), не смешивать с текстом этого файла.

---

## Шаги: первый выход в интернет

### 1. Cloudflare Pages

1. Аккаунт Cloudflare (бесплатный).
2. Workers & Pages → Create → Connect to Git → `RodyaFront/ancient-lens`.
3. Production branch: `main` (деплой только после squash-merge; агент в `main` не пушит).
4. Сборка (уточнить по факту первого билда, типично для Nuxt generate):

   | Поле             | Значение              |
   | ---------------- | --------------------- |
   | Framework preset | Nuxt / None           |
   | Build command    | `npm run generate`    |
   | Build output     | `.output/public`      |
   | Node version     | `22` (как в `.nvmrc`) |

5. Environment variables (Production): оба URL сайта как в таблице выше.
6. Дождаться деплоя. Временный адрес Cloudflare: `https://<project>.pages.dev`. Проверить открытие карточки и загрузку live-матча с OpenDota.

### 2. DuckDNS → этот проект

1. Хост уже создан: `ancientlens` → `ancientlens.duckdns.org`.
2. В панели DuckDNS для этой записи выставить **CNAME** на `<project>.pages.dev` (без `https://`, без пути). A-запись на чужой IP не нужна.
3. В Cloudflare Pages → Custom domains → добавить `ancientlens.duckdns.org`.
4. Подождать выпуск сертификата. Проверка:

```bash
curl -I https://ancientlens.duckdns.org
```

Ожидание: **HTTP 200**, TLS без предупреждения. Затем в браузере: поиск матча, snapshot, reveal счёта.

Если Custom domain у Pages не принимает `*.duckdns.org` (редко, из‑за DNS-провайдера), пока пользоваться `https://<project>.pages.dev`, а DuckDNS оставить на второй заход или на запасной Oracle-путь.

### 3. Повседневный релиз

Как в README (How we ship): feature-ветка → `npm run verify` → PR → squash-merge в `main`. Pages сам пересоберёт production.

Preview-деплои с PR (если включены) живут на `*.pages.dev`, не на DuckDNS.

---

## Когда появится свой домен

1. В Pages: Custom domains → новый домен (apex + `www` по желанию).
2. У регистратора — те DNS, что покажет Cloudflare (обычно CNAME/ANAME на Pages, либо NS на Cloudflare).
3. Env: оба `NUXT_*SITE_URL` на `https://<бренд>`.
4. Redeploy production, чтобы sitemap/canonical не смотрели на DuckDNS.
5. DuckDNS можно выключить или сделать редирект.

Код матча и OpenDota не меняются — только DNS и env.

---

## Запасной путь: Oracle Always Free

Только если статика на Pages не собирается (бинарники og-image/sharp) и чинить это дольше, чем поднять Node.

- Тот же tenancy, что marketplace (`RodyaHord`, Ashburn).
- Always Free Ampere сейчас **2 OCPU / 12 GB на аккаунт**. Marketplace уже занимает **1 OCPU / 6 GB**. Остаток — вторая VM **1 OCPU / 6 GB**, не делить одну машину с Postgres marketplace.
- Стек как у marketplace, но без Postgres: Docker → `node .output/server/index.mjs` → Nginx :80/:443.
- DuckDNS тогда **A-запись** на Reserved Public IP (не ephemeral).
- SSL: Let’s Encrypt на `ancientlens.duckdns.org`.
- Сборка на ARM без swap падает — 4G swap, как в runbook marketplace.

Это копия ops marketplace, урезанная под сайт без БД. На него не переходить, пока не исчерпан Cloudflare.

---

## Проверки после выкладки

- [ ] `https://ancientlens.duckdns.org` открывается, редиректа на `pages.dev` нет (или он осознанный).
- [ ] Пример-snapshot и live ID с OpenDota.
- [ ] Иконки героев/предметов с Steam CDN, VFX счёта в Chrome.
- [ ] `prefers-reduced-motion`: без WebGL-оверлея.
- [ ] В HTML/sitemap канонический URL — DuckDNS, не localhost.

Логи и токены — только в панели Cloudflare / DuckDNS, не в репозитории.
