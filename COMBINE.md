# combine (base: main @ ab5647b4 v0.2.3, started 2026-07-10)

Party ref: `local:/Users/iserdmi/.agents-party/combine-0-3-6cd8cf.sqlite` (host)

## point0 worktrees / branches

| branch           | topic / session                                 | forked from     | committed?           | status                                                                          |
| ---------------- | ----------------------------------------------- | --------------- | -------------------- | ------------------------------------------------------------------------------- |
| constants        | protocol.ts wire-контракт, headers lowercase    | ab5647b4 (main) | 1 commit → 758bb9a7  | MERGED (ff; types+testf green — watcher.unit сегфолт Бана, соло-перегон 7 pass) |
| coverage         | Codecov + scripts/size.ts, CI wiring            | ab5647b4 (main) | 3 commits → 798d9ff8 | MERGED (ff, types+testf green)                                                  |
| navigate-scale   | пусто — верификационный воркритри route0-агента | ab5647b4 (main) | нет диффа            | drop (нечего вливать)                                                           |
| use-location-rsc | ? (zz-probe test — уточнить у агента)           | ab5647b4 (main) | NO — 2 dirty         | in-progress — вливаем ПОСЛЕДНИМ (ещё дорабатывает)                              |

route0-агент: репо route0, uncommitted фикс TS2590 (дистрибутивный
CallableRoute) + сортировка роутов + 9 тестов; 227 pass, types/lint зелёные;
релиз 0.1.3 по отмашке Сергея; каталог-бамп route0 в point0 — только ПОСЛЕ
публикации 0.1.3. Бенч-сессия ждёт 0.1.3. coverage-агент: не трогает
packages/\*/src (кроме compiler/tsconfig.json paths-фикс); пересечения:
scripts/test.ts, ci.yml/check.yml/ci-decide.ts, bunfig.toml, package.json,
AGENTS.md. Точечные тесты зелёные. Порядок: coverage вливаем ПЕРВЫМ (ff),
constants ребейзится следом.

OUT OF SCOPE (Сергей 2026-07-10): realtime, object-notation — работают своим
темпом, в этот combine НЕ входят.

## Working agreement (Сергей 2026-07-10)

- Ребейз на combine делает САМ агент-владелец в своём воркритри (он знает свой
  код) — не координатор.
- После ребейза владелец гоняет свои основные тесты (минимальная проверка что
  ничего не сломалось), отписывается на пати.
- Координатор забирает готовое строго fast-forward'ом в combine и гоняет общий
  types+testf.

## Other repos in scope

| repo                                  | what                                              | state                                              |
| ------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| route0 (~/cc/opensource/1gr14/route0) | distributive CallableRoute fix → release 0.1.3    | uncommitted: src/index.ts + test                   |
| игрич site (~/cc/projects/1gr14)      | env/dodopayments/policy/terms/special uncommitted | забрать в проходку                                 |
| all libs CI                           | npm@12 ломает provenance — единый стиль пина npm  | error0/route0/flat/blank0/1gr14/cursor-pair/point0 |
| all libs                              | TS7 RC → TS7 stable                               | везде                                              |
| point0 catalog                        | @1gr14/\* deps ^0.1.0 → бамп на последние         | root package.json workspaces.catalog               |

## Plan

1. Перекличка на пати — агенты представляются, коммитят своё на своих ветках.
2. Вливаю по одному (rebase-then-ff), с беглым ревью diff'а перед каждым
   вливанием.
3. Тесты централизованно в combine (types + testf) после каждого вливания;
   падения — владельцу.
4. Кросс-либные задачи (TS7, npm12, catalog bump) — после стабилизации combine.
5. route0 release 0.1.3 ДО проходки point0 (point0 может подтянуть новый
   route0).
6. Финал: landing combine → main + проходка (1gr14-passthrough) + забрать сайт
   игрича.
7. По ходу: заметки для улучшения скилла combine (см. Notes).

## Notes for combine-skill improvements

- Финал должен ОБЯЗАТЕЛЬНО включать уборку: удалить влитые воркритри и ветки,
  предварительно проверив что ничего не потеряно (нет dirty-файлов, все коммиты
  — ancestors влитого). Сейчас в доке это «offer cleanup» опционально в конце —
  сделать явным шагом чек-листа.
- Пати — стандартная часть флоу: создать сразу на кикоффе, топик-сообщение с
  объяснением задачи, агенты представляются сами (чей воркритри, что сделано,
  коммиты, тесты).
- Ребейзят сами агенты-владельцы в своих ветках (знают свой код), после ребейза
  сами гоняют свои минимальные тесты; координатор забирает строго ff и гоняет
  общий прогон централизованно (не по сто раз).
- Ожидать некоммитнутый код в воркритри — это норма (правило Сергея); коммит на
  своей ветке по команде координатора.
- Координатор бегло ревьюит diff каждой ветки перед вливанием (не слепой ff) —
  понимать, как части связаны.
- point0 бутстрап: после build нужен ПОВТОРНЫЙ bun install (иначе point0:
  command not found в setup).
