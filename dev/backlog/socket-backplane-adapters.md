---
title: Ещё бэкплейн-адаптеры — pg (node-postgres), Bun.sql при появлении LISTEN
description:
  Отложенные кандидаты в @point0/engine/backplane/* — добавлять по спросу; ядро
  (postgres.js + ioredis + node-redis + bun-redis) уже отгружено.
---

Готовые адаптеры
`@point0/engine/backplane/{postgres,ioredis,node-redis,bun-redis}` сделаны (см.
[socket.md](../docs/socket.md) → «Ready-made backplane adapters»). Сюда — что
сознательно отложено:

- **`backplane/pg` (node-postgres).** Тоже push (`LISTEN`/`NOTIFY`), но `pg` не
  реконнектит и не восстанавливает LISTEN-соединение сам — адаптеру нужен свой
  resilient-слой (выделенный client из Pool, reconnect с backoff, re-LISTEN
  всего сета; каркас — `createResilientRedisSubscriber`-паттерн из
  bun-redis.ts). Хэширование каналов / spill / KV-таблицы — переиспользовать из
  postgres-адаптера (вынести общий postgres-кор, если делать). Добавлять по
  спросу: postgres.js покрывает постгрес-кейс дешевле, а у кого `pg` уже стоит —
  ставит `postgres` рядом, это один пакет.
- **`bunSqlBackplane` — ждёт LISTEN в Bun.sql.** Bun's built-in `Bun.SQL` не
  умеет `LISTEN`/`NOTIFY`-подписки (проверено по bun-types на 1.3.14 — api
  отсутствует), поэтому нулевисимостного постгрес-адаптера пока нет. Появится
  LISTEN — адаптер становится лучшей дефолтной дорогой для постгрес-стека (ноль
  зависимостей, как URL-шорткат у Redis) и, возможно, URL-шорткат расширяется на
  `postgres://…`.
- **Поллинг-бэкплейны НЕ делать** (решение Сергея 2026-07-31): поллинг шины =
  задержка на каждом межпроцессном сообщении, «тормознутые сокеты». Поэтому
  Prisma-адаптера нет и не планируется (Prisma не умеет LISTEN в принципе);
  prisma-стек закрывается postgres.js-адаптером на тот же DATABASE_URL (прямое
  подключение, не transaction-pooler).
