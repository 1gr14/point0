# combine (base: main @ ab5647b4 v0.2.3, started 2026-07-10)

Party ref: `local:/Users/iserdmi/.agents-party/combine-0-3-6cd8cf.sqlite` (host)

## point0 worktrees / branches

| branch           | topic / session                                                  | forked from     | committed?           | status                                                                          |
| ---------------- | ---------------------------------------------------------------- | --------------- | -------------------- | ------------------------------------------------------------------------------- |
| constants        | protocol.ts wire-контракт, headers lowercase                     | ab5647b4 (main) | 1 commit → 758bb9a7  | MERGED (ff; types+testf green — watcher.unit сегфолт Бана, соло-перегон 7 pass) |
| coverage         | Codecov + scripts/size.ts, CI wiring                             | ab5647b4 (main) | 3 commits → 798d9ff8 | MERGED (ff, types+testf green)                                                  |
| navigate-scale   | пусто — верификационный воркритри route0-агента                  | ab5647b4 (main) | нет диффа            | drop (нечего вливать)                                                           |
| use-location-rsc | getLocation() в лоадерах/RSC + 2 бага (Referer/undefined-origin) | ab5647b4 (main) | 1 commit → 5098ffc4  | MERGED (ff; полный прогон build+setup+types+testf зелёный)                      |

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

| repo                                  | what                                                        | state                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| route0 (~/cc/opensource/1gr14/route0) | CallableRoute fix + TS7 + npm@11 → release 0.1.3            | ГОТОВО (227 pass), uncommitted, ждёт отмашки Сергея                                                                                 |
| игрич site (~/cc/projects/1gr14)      | DodoPayments BRAND_ID-фильтр вебхука + policy/terms/special | заберём в проходку (сайтовая работа, от point0 не зависит)                                                                          |
| all libs CI                           | npm@11-пин единым стилем                                    | DONE во всех 7 (uncommitted); point0 release.yml был запинен                                                                        |
| all libs                              | TS7 RC → stable ^7.0.2 (алиас typescript-7)                 | DONE в error0/flat/blank0/cursor-pair/create-start0/1gr14/route0, всё зелёное, uncommitted; в point0 алиаса нет (tsgo) — не трогали |
| point0 catalog                        | @1gr14 бамп                                                 | error0 ^0.4.7 + flat ^0.1.4 закоммичено на combine (d3bc5430); route0 — после публикации 0.1.3                                      |

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
