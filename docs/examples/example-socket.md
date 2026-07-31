---
index: 350
label: Socket
title: Socket Example
description:
  A chat, a live board, presence, and notifications — channels, spaces, and
  handlers in one small app.
example: examples/socket
---

`examples/socket` is a small app built around
[channels, spaces & handlers](socket): four pages, each one a complete socket
feature in a single file. The buttons above and below open the full source.

The shared piece is one **channel** (`src/lib/channel.tsx`): the connector reads
a nickname cookie and returns it as the connection identity — no cookie, and the
connect is denied with `preventRetry`, so a signed-out client stops knocking
until the sign-in calls `reconnectAll()`. The channel is `resumable: true`, and
one `<appChannel.Connection>` at the app root (`src/app.client.tsx`) holds the
socket for the whole app (`gate={false}` — the sign-in header renders before any
connect; each page holds its own live section with `gate` instead, so it shows
the channel's loading until the connect settles, then the interface or the
deny). Everything else lives in the page that uses it — the space, its handlers,
and its server code sit next to the component that renders them, and the
compiler strips each side out of the other bundle:

- **`pages/chat.tsx`** — topics with persisted messages (each topic is one room
  of the space): a `.joiner` that admits by topic name (with a clean deny), a
  `serverHandler` that writes to Prisma and pushes to the room, a buffering
  `clientHandler` (`resumable: true`), and the one-condition catch-up —
  `onEnter: ({ gapless }) => gapless || refetch()`.
- **`pages/presence.tsx`** — who is in the room right now: the
  [presence recipe](socket#presence) as written — the
  `pointSpaceJoinServerSuccess` / `pointSpaceLeaveServer` events compute the
  roster once and push it, a `.query()`-flavored handler serves the first paint,
  and the push lands via `setSocketQueryData` with zero refetches.
- **`pages/notifications.tsx`** — a personal room per user: an enroller-only
  space (no `.joiner` — nobody joins from the browser), pushed to from a plain
  HTTP mutation.
- **`pages/board.tsx`** — one shared, DB-less room: a global space
  (`joiner(() => ({}))`) and a bare space-wide push fanning every click out.

The engine side is one option — `server: { socket: true }` in `src/engine.ts` —
which also turns the socket **feature** on for the client bundle. There is no
backplane configured: a single process needs none (add
`backplane: process.env.REDIS_URL` when you run several — see
[the backplane](socket#where-its-stored--the-engine-serverbackplane)).

Sign-in is deliberately primitive — a nickname cookie, no passwords
(`src/lib/auth.tsx`): the point is what happens at connect time, not the auth
stack. The header's sign-in / sign-out buttons call `reconnectAll()` /
`disconnectAll()` — the client half of a login flow (`src/layouts/general.tsx`).

Run it like [basic](example-basic):

```sh
cd examples/socket
bun install
bun run setup
bun run dev
```

Open two browser windows side by side to see the pushes cross. The `tests/`
folder drives the same scenarios in a real browser with Playwright —
`chat.e2e.test.ts` (a cross-tab room push, the resume streams replaying a blip,
a reload showing the persisted history) and `presence.e2e.test.ts` (the roster
reacting to joins and leaves):

```sh
bun run test
```
