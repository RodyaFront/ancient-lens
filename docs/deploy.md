# Деплой в интернет

Ancient Lens отдаётся **статикой на Cloudflare Pages** (Workers Builds с `pages_build_output_dir`). Своего VPS нет. Матчи грузит браузер с OpenDota.

**Статус:** код готов к Pages. Публичный сайт — после Connect Git, билда и привязки `ancientlens.info`.

| Параметр          | Значение                                                              |
| ----------------- | --------------------------------------------------------------------- |
| Хостинг           | [Cloudflare Pages](https://pages.cloudflare.com/), бесплатный тариф   |
| Сборка            | `npm run generate` → `.output/public`                                 |
| Config            | `wrangler.toml` (`[assets]` → `.output/public`), Nitro `static` на CI |
| Продакшен-домен   | `ancientlens.info` (+ опционально `www.ancientlens.info`)             |
| Целевой URL       | `https://ancientlens.info`                                            |
| Env               | `NUXT_PUBLIC_SITE_URL` и `NUXT_SITE_URL` = этот HTTPS URL             |
| Репозиторий       | `git@github.com:RodyaFront/ancient-lens.git`                          |
| Production branch | `main` (squash-merge; агент в `main` не пушит)                        |

Секреты (`CLOUDFLARE_API_TOKEN` и т.п.) **не** класть в git. Локальный `.cursor/mcp.json` тоже не коммитить.

---

## Что уже сделано в репозитории

- Статическая выкладка: `npm run generate` → `.output/public`. На Workers Builds (`WORKERS_CI=1`) / Pages (`CF_PAGES=1`) Nitro берёт preset `static` (иначе из‑за `wrangler.toml` — `cloudflare-module` и падение deploy на reserved `ASSETS`). Локально и в e2e preset не форсится, чтобы оставался Node-сервер. Можно задать `NITRO_PRESET=static` вручную.
- Deep links на матчи (`/match/:id`, `/uk/match/:id`) не пререндерятся. В `wrangler.toml` у `[assets]` стоит `not_found_handling = "single-page-application"`, иначе hard refresh / прямой URL даёт CDN 404.
- `ogImage` выключен, модуль `@nuxt/image` снят — sharp/playwright не тащатся в прод.
- Sitemap / robots / CSP (`opendota` + Steam CDN) оставлены.
- GitHub Actions: `ci` гоняет `verify` (`generate` в конце). `pages.yml` — ручной `workflow_dispatch`: generate всегда; деплой через wrangler **только если** в repo задан Actions variable `CLOUDFLARE_ACCOUNT_ID` и secret `CLOUDFLARE_API_TOKEN`.
- Обычный путь в прод — **Connect Git** в панели Cloudflare, без GitHub token.

`GET /api/health` на Pages нет (нет Node). Для локальной разработки файл `server/api/health.get.ts` ещё лежит в репо.

---

## Что сделать тебе (логин)

### 1. Cloudflare — Connect Git / Workers Builds

Проект уже может быть создан как Workers Builds `ancient-lens` (не классический «только Pages»).

1. https://dash.cloudflare.com → Workers & Pages → `ancient-lens` (или Create → Connect to Git).
2. Репозиторий `RodyaFront/ancient-lens`.
3. Production branch: пока `main` без этого кода — временно укажи `chore/cloudflare-pages` для первой выкладки, после merge в `main` верни `main`.
4. Build settings:

   | Поле                   | Значение                      |
   | ---------------------- | ----------------------------- |
   | Framework preset       | Nuxt или None                 |
   | Build command          | `npm run generate`            |
   | Deploy command         | `npx wrangler deploy`         |
   | Build output directory | `.output/public` (в wrangler) |
   | Node version           | `22`                          |

   **Важно для Workers Builds:** не используй `npx wrangler pages deploy …`. Токен Builds умеет Workers Scripts, не Cloudflare Pages API — будет `Authentication error [code: 10000]`. Нужен `npx wrangler deploy`. В `wrangler.toml` — `[assets] directory = ".output/public"`, не `pages_build_output_dir`.

   На CI Nitro берёт `static` через `WORKERS_CI` / `CF_PAGES` (иначе из‑за wrangler снова возможен `cloudflare-module` + reserved `ASSETS`).

5. Environment variables (Production и Preview) — после привязки домена:

   ```
   NUXT_PUBLIC_SITE_URL=https://ancientlens.info
   NUXT_SITE_URL=https://ancientlens.info
   ```

   До появления кастомного домена можно временно поставить `https://ancient-lens.<subdomain>.workers.dev` из шага 6, затем сменить на `ancientlens.info` и Redeploy.

6. Save and Deploy. Запомнить URL вида `https://ancient-lens.<subdomain>.workers.dev` (или preview URL из лога билда). Классический `*.pages.dev` появляется только у старых Pages-проектов.

### 2. Домен `ancientlens.info` (Custom Domains + DNS)

Нужна **зона Cloudflare** для `ancientlens.info` (домен добавлен в аккаунт Cloudflare).

#### Если nameservers указывают на Cloudflare (полный setup)

1. Добавь зону `ancientlens.info` в Cloudflare (Domains → Onboard), если ещё нет.
2. Workers & Pages → `ancient-lens` → **Settings** → **Domains & Routes** → **Add** → **Custom Domain** → `ancientlens.info` (и при желании `www.ancientlens.info`).
3. Cloudflare сам создаст DNS-запись в зоне и выпустит сертификат. Не создавай вручную конфликтующий CNAME на тот же hostname до Add Custom Domain.
4. Apex (`ancientlens.info`) требует, чтобы домен был зоной Cloudflare (nameservers на CF). Subdomain без зоны CF возможен через CNAME на `*.workers.dev` / target из дашборда, но для брендового apex — full setup.
5. `www` ↔ apex: [Redirect Rule](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/) + proxied placeholder A `192.0.2.1` / AAAA `100::` на hostname, с которого редиректишь (если Custom Domain только на одном имени).

У регистратора после full setup обычно **только** nameservers Cloudflare — A/CNAME для сайта правишь в Cloudflare DNS, не у регистратора.

#### Если DNS пока у регистратора (ещё не перенёс NS на Cloudflare)

1. Всё равно добавь зону `ancientlens.info` в Cloudflare → Onboard domain → скопируй выданные **nameservers**.
2. У регистратора домена поставь эти NS (вместо текущих). Дождись пропагации (минуты–часы).
3. Затем шаг Custom domains выше — записи создаст Cloudflare.

Пока NS не на Cloudflare, Custom Domain на Worker/Pages для этого apex **не привяжется** нормально: нужна active Cloudflare zone.

#### Временный fallback (DuckDNS)

`ancientlens.duckdns.org` можно оставить как запасной CNAME на workers.dev / pages target, пока бренд-домен не готов. В `NUXT_*SITE_URL` для продакшена уже `https://ancientlens.info`.

```bash
curl -I https://ancientlens.info
```

Ожидание: HTTP 200 и валидный TLS. Затем в браузере: поиск матча, reveal счёта, огонь только у победителя.

### 3. Опционально: деплой из GitHub Actions

Не обязательно, если включён Connect Git.

1. Cloudflare → API Tokens → Create Token с правом Pages Edit.
2. GitHub repo → Settings → Secrets: `CLOUDFLARE_API_TOKEN`.
3. Settings → Variables: `CLOUDFLARE_ACCOUNT_ID`.
4. Actions → **pages** → Run workflow.

Пока variable пустой, workflow только собирает статику и **не** публикует.

---

## Повседневный релиз

Feature-ветка → `npm run verify` → PR → squash-merge в `main`. Pages/Workers Builds пересобирает production.

---

## Запасной путь (не используем)

Oracle Always Free / Docker / Nginx — только если Pages принципиально не соберётся. Сейчас сборка статическая, этот путь не нужен.

---

## Проверки после выкладки

- [ ] `https://ancientlens.info` открывается (или пока workers.dev URL из билда).
- [ ] Snapshot и live ID с OpenDota.
- [ ] Иконки Steam CDN, VFX счёта, fire только на стороне победителя.
- [ ] `prefers-reduced-motion`: без WebGL.
- [ ] Canonical / sitemap смотрят на `https://ancientlens.info`, не на localhost.
