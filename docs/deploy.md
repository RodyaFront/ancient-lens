# Деплой в интернет

Ancient Lens отдаётся **статикой на Cloudflare Pages** (Workers Builds с `pages_build_output_dir`). Своего VPS нет. Матчи грузит браузер с OpenDota.

**Статус:** код готов к Pages. Публичный сайт — после Connect Git, билда и привязки `ancientlens.info`.

| Параметр          | Значение                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Хостинг           | [Cloudflare Pages](https://pages.cloudflare.com/), бесплатный тариф |
| Сборка            | `npm run generate` → `.output/public`                               |
| Config            | `wrangler.toml` (`pages_build_output_dir`), Nitro preset `static`   |
| Продакшен-домен   | `ancientlens.info` (+ опционально `www.ancientlens.info`)           |
| Целевой URL       | `https://ancientlens.info`                                          |
| Env               | `NUXT_PUBLIC_SITE_URL` и `NUXT_SITE_URL` = этот HTTPS URL           |
| Репозиторий       | `git@github.com:RodyaFront/ancient-lens.git`                        |
| Production branch | `main` (squash-merge; агент в `main` не пушит)                      |

Секреты (`CLOUDFLARE_API_TOKEN` и т.п.) **не** класть в git. Локальный `.cursor/mcp.json` тоже не коммитить.

---

## Что уже сделано в репозитории

- Статическая выкладка: `npm run generate` → `.output/public`. В `nuxt.config.ts` зафиксирован `nitro.preset: 'static'`, иначе Workers Builds из‑за `wrangler.toml` берёт `cloudflare-module`, и `wrangler pages deploy` падает на reserved binding `ASSETS`.
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

   | Поле                   | Значение                                   |
   | ---------------------- | ------------------------------------------ |
   | Framework preset       | Nuxt или None                              |
   | Build command          | `npm run generate`                         |
   | Deploy command         | `npx wrangler pages deploy .output/public` |
   | Build output directory | `.output/public`                           |
   | Node version           | `22`                                       |

5. Environment variables (Production и Preview) — после привязки домена:

   ```
   NUXT_PUBLIC_SITE_URL=https://ancientlens.info
   NUXT_SITE_URL=https://ancientlens.info
   ```

   До появления кастомного домена можно временно поставить `https://<project>.pages.dev` из шага 6, затем сменить на `ancientlens.info` и Redeploy.

6. Save and Deploy. Запомнить URL вида `https://ancient-lens.pages.dev`.

Проверка: открыть `pages.dev`, snapshot и live-матч с OpenDota.

### 2. Домен `ancientlens.info` (Custom Domains + DNS)

Нужна **зона Cloudflare** для `ancientlens.info` (домен добавлен в аккаунт Cloudflare).

#### Если nameservers указывают на Cloudflare (полный setup)

1. Workers & Pages → `ancient-lens` → **Custom domains** (или Settings → Domains & Routes) → Add → `ancientlens.info`.
2. Cloudflare сам создаст DNS-запись на apex (обычно CNAME/уплощённый alias на `*.pages.dev`). Сертификат выпустится сам.
3. Опционально добавь `www.ancientlens.info` тем же способом.
4. Чтобы `www` и apex вели себя одинаково: [Redirect Rule](https://developers.cloudflare.com/rules/url-forwarding/examples/redirect-www-to-root/) `www` → `https://ancientlens.info` (или наоборот). Для hostname, с которого редиректишь, нужна proxied DNS-запись (часто placeholder A `192.0.2.1` / AAAA `100::`, если Custom Domain только на одном имени).

У регистратора после full setup обычно **только** nameservers Cloudflare — A/CNAME для сайта правишь в Cloudflare DNS, не у регистратора.

#### Если DNS пока у регистратора (ещё не перенёс NS на Cloudflare)

1. Всё равно добавь зону `ancientlens.info` в Cloudflare → Onboard domain → скопируй выданные **nameservers**.
2. У регистратора домена поставь эти NS (вместо текущих). Дождись пропагации (минуты–часы).
3. Затем шаг Custom domains выше — записи создаст Cloudflare.

Пока NS не на Cloudflare, Custom Domain на Worker/Pages для этого apex **не привяжется** нормально: нужна active Cloudflare zone.

#### Временный fallback (DuckDNS)

`ancientlens.duckdns.org` можно оставить как запасной CNAME на `<project>.pages.dev`, пока бренд-домен не готов. В `NUXT_*SITE_URL` для продакшена уже `https://ancientlens.info`.

```bash
curl -I https://ancientlens.info
curl -I https://ancient-lens.pages.dev
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

- [ ] `https://ancientlens.info` открывается (или пока `pages.dev`).
- [ ] Snapshot и live ID с OpenDota.
- [ ] Иконки Steam CDN, VFX счёта, fire только на стороне победителя.
- [ ] `prefers-reduced-motion`: без WebGL.
- [ ] Canonical / sitemap смотрят на `https://ancientlens.info`, не на localhost.
