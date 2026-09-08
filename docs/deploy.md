# Деплой в интернет

Ancient Lens отдаётся **статикой на Cloudflare Pages**. Своего VPS, Oracle VM и платы за хостинг нет. Матчи по-прежнему грузит браузер с OpenDota.

**Статус:** код готов к Pages. Публичный сайт появится после шагов в Cloudflare и DuckDNS (нужен твой логин).

| Параметр          | Значение                                                            |
| ----------------- | ------------------------------------------------------------------- |
| Хостинг           | [Cloudflare Pages](https://pages.cloudflare.com/), бесплатный тариф |
| Сборка            | `npm run generate` → `.output/public`                               |
| Config            | `wrangler.toml` (`pages_build_output_dir`), Nitro preset `static`   |
| Временный домен   | `ancientlens.duckdns.org`                                           |
| Целевой URL       | `https://ancientlens.duckdns.org`                                   |
| Env               | `NUXT_PUBLIC_SITE_URL` и `NUXT_SITE_URL` = этот HTTPS URL           |
| Репозиторий       | `git@github.com:RodyaFront/ancient-lens.git`                        |
| Production branch | `main` (squash-merge; агент в `main` не пушит)                      |

Секреты (токен DuckDNS, `CLOUDFLARE_API_TOKEN`) **не** класть в git.

---

## Что уже сделано в репозитории

- Статическая выкладка: `npm run generate` кладёт HTML/JS в `.output/public` (это и грузит Pages). Preset Nitro в репо остаётся обычным, чтобы `nuxt dev` и e2e могли поднять Node; на Cloudflare сервер не деплоится.
- `ogImage` выключен, модуль `@nuxt/image` снят — sharp/playwright не тащатся в прод.
- Sitemap / robots / CSP (`opendota` + Steam CDN) оставлены.
- GitHub Actions: `ci` гоняет `verify` (`generate` в конце). `pages.yml` — ручной `workflow_dispatch`: generate всегда; деплой через wrangler **только если** в repo задан Actions variable `CLOUDFLARE_ACCOUNT_ID` и secret `CLOUDFLARE_API_TOKEN`. Токены в файлах не выдуманы.
- Обычный путь в прод — **Connect Git** в панели Cloudflare, без GitHub token.

`GET /api/health` на Pages нет (нет Node). Для локальной разработки файл `server/api/health.get.ts` ещё лежит в репо.

---

## Что сделать тебе (логин)

### 1. Cloudflare Pages — Connect Git

1. https://dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git.
2. Репозиторий `RodyaFront/ancient-lens`.
3. Production branch: `main` (пока `main` без этого кода — можно временно указать `chore/cloudflare-pages` для первой выкладки, потом вернуть `main`).
4. Build settings:

   | Поле                   | Значение           |
   | ---------------------- | ------------------ |
   | Framework preset       | Nuxt или None      |
   | Build command          | `npm run generate` |
   | Build output directory | `.output/public`   |
   | Node version           | `22`               |

5. Environment variables (Production и Preview):

   ```
   NUXT_PUBLIC_SITE_URL=https://ancientlens.duckdns.org
   NUXT_SITE_URL=https://ancientlens.duckdns.org
   ```

6. Save and Deploy. Запомнить URL вида `https://ancient-lens.pages.dev`.

Проверка: открыть `pages.dev`, snapshot и live-матч с OpenDota.

### 2. DuckDNS CNAME (DNS позже, хост уже есть)

1. https://www.duckdns.org — запись `ancientlens`.
2. Включить **CNAME** на `<project>.pages.dev` из шага 1 (без `https://`, без слэша). A-запись на IP не нужна.
3. Cloudflare Pages → Custom domains → `ancientlens.duckdns.org`.
4. Дождаться сертификата.

```bash
curl -I https://ancientlens.duckdns.org
```

Ожидание: HTTP 200 и валидный TLS. Затем в браузере: поиск матча, reveal счёта, огонь только у победителя.

Если Pages не выпустит сертификат на `*.duckdns.org`, пользоваться `pages.dev`, пока не будет брендового домена.

### 3. Опционально: деплой из GitHub Actions

Не обязательно, если включён Connect Git.

1. Cloudflare → API Tokens → Create Token с правом Pages Edit.
2. GitHub repo → Settings → Secrets: `CLOUDFLARE_API_TOKEN`.
3. Settings → Variables: `CLOUDFLARE_ACCOUNT_ID`.
4. Actions → **pages** → Run workflow.

Пока variable пустой, workflow только собирает статику и **не** публикует.

---

## Повседневный релиз

Feature-ветка → `npm run verify` → PR → squash-merge в `main`. Pages пересобирает production.

---

## Свой домен потом

1. Pages → Custom domains → брендовый домен.
2. DNS у регистратора — как скажет Cloudflare.
3. Обновить оба `NUXT_*SITE_URL` и Redeploy.
4. DuckDNS выключить или редирект.

---

## Запасной путь (не используем)

Oracle Always Free / Docker / Nginx — только если Pages принципиально не соберётся. Сейчас сборка статическая, этот путь не нужен.

---

## Проверки после выкладки

- [ ] `https://ancientlens.duckdns.org` открывается.
- [ ] Snapshot и live ID с OpenDota.
- [ ] Иконки Steam CDN, VFX счёта, fire только на стороне победителя.
- [ ] `prefers-reduced-motion`: без WebGL.
- [ ] Canonical / sitemap смотрят на DuckDNS, не на localhost.
