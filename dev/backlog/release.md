# Проходка после мега-сессии 2026-07-31/08-01 — чеклист

Всё из этой сессии лежит незакоммиченным в point0 / игрич / start0 / 7 либах.
Карточка живёт до конца проходки; выполненное вычёркивать.

## До коммита

- [ ] `bun run format` по всему point0 — prettier 3.9 сменил стиль юнионов,
      `format:check` сейчас красный по ~15 файлам (стиль, не код).
- [ ] **`patches/playwright-core@1.62.1.patch` — untracked, `git add`
      обязательно**: старый `@1.60.0.patch` удалён, без нового у всех падает
      `bun install`. Остальные новые файлы (бэклог-карточки, тесты,
      `dev-entries.int.test.ts`) тоже untracked — не потерять.
- [ ] Сайт: `bun install-point0.js npm` (сейчас на локальном Verdaccio).
      Миграция на `from.clientIp` типизируется только против нового point0 —
      бамп сайта на новую версию едет в той же проходке.
- [ ] e2e игрича и start0 (в сессии не гонялись — нужна живая БД; про stale
      pgboss-схему: `DROP SCHEMA pgboss CASCADE` на тест-базе).
- [ ] Полный `testf` недостоверен на загруженной машине (падают случайные наборы
      30s-таймаутами; всё соло зелёное) — арбитр CI. Флак `socket-client.int`
      под нагрузкой — наблюдать в CI.
- [ ] Мёртвые классы `ml-[-4]`/`mt-[-2]` (nav-siblings.tsx, sidebar.tsx на
      сайте) — невалидный CSS с рождения; фикс = видимое изменение вёрстки,
      решить отдельно.

## Release notes / CHANGELOG — поведенческие изменения

- `from.ips` сменил порядок: клиент-первый, peer ПОСЛЕДНИМ (+ новый
  `from.clientIp`, экспорт `isPublicIp`/`normalizeIp` из
  `@point0/core/request0`).
- `point0 dev` по умолчанию поднимает только `main`-энтри (+ `devEntries`,
  `--entry '*'`, чистый выход энтри = «finished», не ошибка).
- Loaderless-страница на `data`-запрос отвечает 400 (было 500) — код
  `POINT_NO_SERVER_LOADER`.
- `keepScroll` на navigate/Link/redirect; `pageChunkHydrationTimeoutMs` в
  `mount()`; барьер гидрации (фикс мигающего лоадера).
- События: `pointHandlerSendClient*`/`pointHandlerSendServer*`,
  `pointHandlerServerLateError`; `POINT0_SERIALIZE_FAILED`.
- Депсы: redis/ioredis v5||v6, playwright 1.62.1, @types/node 26, @scalar/types
  0.17 (peer `^0.17.0` у openapi), expo SDK 57, prettier 3.9.

## Первый релиз по новой модели (tag after green) — наблюдать руками

`gh run watch` на релизном пуше; доказывается только первым живым релизом:

- [ ] npm Trusted Publisher / OIDC на branch-триггере (claims без тега).
- [ ] Пуш тега дефолтным `GITHUB_TOKEN` (`contents: write`; орг-ограничения
      могут резать — тогда джоба падает ПОСЛЕ публикации, ре-ран долечит тег).
- [ ] «Protected main» ruleset не блокирует создание тега ботом.
- [ ] `npm view` E404 → publish на новом пакете; сериализация двух быстрых
      релизных пушей (concurrency group `release`).
- [ ] `0.0.0`-сентинел blank0: первый пуш в его main печатает «nothing to
      publish», не падает.

## После деплоя игрича — только на живом сайте

- [ ] **Логин через Telegram** (better-auth-telegram 2.0) — работает только на
      живом сайте, локально не проверить.
- [ ] Docker-сборка с sharp 0.35 (сам деплой Railway и есть проверка; при
      желании `docker compose build` локально до).
- [ ] Гео/страна и рейт-лимит Ask-AI на реальном Railway-чейне — теперь через
      `from.clientIp` (сверить, что страна определяется, лимит пер-визиторный).
- [ ] Sentry: внешние пробы loaderless-эндпоинтов теперь 400 — прилетают как
      обычные ошибки (фильтров нет, осознанно).

## start0 отдельным заходом после принятия диффа

- [ ] `bun run lint` (с `--fix`) — пересортирует ~840 классов в вендоренном
      `src/components/ui/**` (новый алгоритм eslint-plugin-tailwindcss 4.2) —
      отдельный коммит «sync classname order».

## Expo (не блокирует проходку)

- [ ] Ручной `expo start` после SDK 57 (Metro/симулятор локально не гонялись).
