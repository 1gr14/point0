# Handoff — point0 launch prep (paste this after /compact)

Продолжаем подготовку point0 к публичному запуску. Контекст ниже — всё, что
нужно знать. Полный план: `~/cc/opensource/1gr14/point0/backlog/launch-plan.md`.
Релиз-флоу: `dev/docs/releasing.md`. Локальный реестр:
`dev/docs/local-registry.md`.

## Где мы сейчас

- Работаем **в основном чекауте** `~/cc/opensource/1gr14/point0`, ветка `dev`,
  **без worktree** (Сергей это явно разрешил — правило про worktree тут не
  действует).
- Большой релиз-инжиниринговый рефактор **сделан, но НЕ закоммичен** (лежит
  поверх локального коммита `9cbed65a` на `dev`). Тот коммит был эпохи
  semantic-release; при коммите миграции, возможно, Сергей захочет его
  заскватить — не трогать без спроса.
- **Не коммитить / не пушить / не публиковать без явной просьбы.** Никаких
  `Co-Authored-By`. Отвечать по-русски.
- **Ближайший шаг, на котором остановились:** первый приватный релиз. Делается
  так: `bun run release 0.1.0` (промоутит CHANGELOG, версия не меняется) →
  коммит → пуш на `main` → CI публикует `@point0/*@0.1.0` приватно. Сергей
  должен сказать «делаем».

## Релиз-тулинг (главное решение сессии)

Слезли и с **semantic-release**, и с **changesets** — оба форсят `1.0.0` на
нашей связке (lockstep + 0.x + caret peer-deps): changesets — через fixed-группу
и через «peer dep вышел из диапазона → major». Теперь **два своих скрипта**:

- `scripts/release.ts` (`bun run release <patch|minor|x.y.z>`) — локально:
  ставит версию во все 9 пакетов lockstep, чинит внутренние диапазоны
  `@point0/*` → `^новая` (через `sync-versions`), промоутит `## Unreleased` в
  `CHANGELOG.md`. `patch`/`minor` от 0.x **никогда** не дают 1.0.0; явный выход
  из 0.x скрипт отказывает.
- `scripts/publish.ts` (`bun run publish:packages`) — в CI: идемпотентный
  `npm publish` (пропускает уже опубликованные версии и `private: true`).

## Архитектура (что построено)

- **Версии материализованы**: нигде нет `catalog:` / `workspace:*`, у каждого
  пакета реальные диапазоны. Таблица повторяющихся версий — в руте
  `workspaces.catalog` (как ДАННЫЕ). `scripts/sync-versions.ts`
  (`versions:write`/`versions:check`) держит их в синхроне; check в CI +
  pre-commit. Линковка воркспейсов работает по semver
  (`linkWorkspacePackages=true` в bunfig).
- **Локальная установка point0 в проекты** — Verdaccio: `bun run local-registry`
  поднимает реестр на :4873, публикует все 9; потребитель ставит через `.npmrc`
  (`@point0:registry=http://localhost:4873`). Автоматизировано в игриче/start0
  через `bun install-point0.js`.
- **Lockstep**: все 9 пакетов на одной версии (сейчас 0.1.0).
  Экзамплы/фикстуры/шаблон тоже сведены на 0.1.0 (была мусорная 1.0.0 — убита).
- **Пакеты (9):** публикуются 8 scoped `restricted` —
  `@point0/{core,engine,react-dom, compiler,cors,openapi,basic-auth,docs}`.
  Девятый — `create-point0-app` (**unscoped** → приватным быть не может →
  `"private": true`, на приватную неделю НЕ публикуется; на публичном запуске
  убрать private и публиковать public).
- **Типы**: `bun run types` = tsgo (быстрый), `types:6` = tsc.
- Аудит deps сделан: compiler получил `fast-glob`+`safe-stable-stringify`; из
  engine выпилены мёртвые `magic-string`/`p-retry`/`qs`; схема-адаптеры в core —
  optional `peerDependencies`.

## Три репозитория (у всех есть несcommitнутые изменения)

- **point0** `~/cc/opensource/1gr14/point0` — основной рефактор (см. выше).
- **игрич** `~/cc/projects/1gr14` — переведён на Verdaccio: `.npmrc`
  (gitignored), `@point0/*` → `^0.1.0`, `install-point0.js` переписан. Postgres
  БД `1gr14`. Порты 3194/8194.
- **start0** `~/cc/projects/start0` — то же; плюс фикс
  `src/test/setup/e2e.ts:14` (`app.server.js` → `index.server.js`, был баг
  харнесса). Postgres `myapp`/`myapp-test`, порты 3097/8097. `PLAN.md`
  восстановлен (я его раньше зря перезаписал).

## Проверено вручную (всё зелёное)

Локальный реестр → `bun install-point0.js` в обоих → сервера поднимаются,
главная грузится (200), полный тест-сьют start0 зелёный
(unit/dom/int/e2e:build). point0 рантайм + build-пайплайн валидированы.

## CI и GitHub-настройка

- `.github/workflows/ci.yml`: build → test (гейтит релиз; на `next` тесты
  скипаются repo-var `SKIP_TESTS_ON_NEXT=true`) → джоб `publish`
  (`bun run publish:packages`, `NODE_AUTH_TOKEN=secrets.NPM_TOKEN`). Экшены
  checkout@v6/setup-node@v6/upload@v7/download@v8, Node 24.
- Сергей уже завёл: секрет `NPM_TOKEN` (granular, @point0 read+write),
  переменную `SKIP_TESTS_ON_NEXT=true`. Токен отзовём после релиза.
- **Защита веток заблокирована** (приватный репо на бесплатном плане GitHub) —
  включим в день запуска (репо public) или при апгрейде плана. Цель:
  `main`+`next`, правила `non_fast_forward`
  - `deletion`, `dev` не трогать.

## Последовательность запуска

1. Приватная неделя: публикуем `@point0/*@0.1.0` приватно (token, без
   provenance, `restricted`). игрич/start0 берут из приватного npm (`^0.1.0`).
2. Деплой игрича на Railway (read-only npm token в env + `.npmrc`).
3. Публичный запуск: репо public; `publishConfig.access` → public у всех; снять
   `private` с create-app; перейти на OIDC Trusted Publisher → provenance (нужен
   public-репо + Node 24, уже стоит); выпустить свежую версию публично; защита
   веток; репоинт игрича на public.
4. Первый релиз start0 (после public point0).

## Открытый follow-up (после релиза point0, в backlog)

- Когда полностью устроит флоу — выпилить semantic-release из остальных либ
  (error0, route0, flat, blank0) и поставить тот же релиз-скрипт. Потом —
  поправить доки релизов в репо `agents` (`~/cc/agents/docs/1gr14/release.md`,
  `new.md`).

## Ключевые файлы

`scripts/{release,publish,sync-versions,local-registry}.ts`, `CHANGELOG.md`,
`bunfig.toml`, `.github/workflows/ci.yml`,
`dev/docs/{releasing,local-registry}.md`, `backlog/launch-plan.md`. Удалены:
`.releaserc.mjs`, semantic-release-деки, `.changeset`, старые transform-скрипты.
