# SSR HTML responses lack `charset=utf-8` → intermittent mojibake on the client

**Status:** partially fixed (header added, see below) · **Area:** engine /
SSR response headers / document `<head>` assembly · **Impact:** any Point0 SSR
app can render non-ASCII characters (`—`, `'`, `"`, Cyrillic, emoji…) as garbage
(`â€"`, `â€™`, …) in the browser. Intermittent and content-dependent, so it
looks random and is easy to misdiagnose as a hydration/encoding bug in the app.

## Symptom

On the deployed 1gr14 site (`https://1gr14.dev/error0/latest/overview`), text
that is correct in the raw server payload shows up mangled in the browser:
em dashes become `â€"`, apostrophes become `â€™`, etc. It happens **"not always
but periodically"** — some pages/loads are fine, others are broken — and the
breakage tracks the rendered/hydrated DOM, not the source bytes (hence it reads
as "after hydration").

This is the classic UTF-8-read-as-Windows-1252 mojibake: `—` (U+2014) is the
UTF-8 byte sequence `E2 80 94`; decoded as Windows-1252 that's exactly `â€"`.

## Root cause

The bytes are **correct UTF-8 end to end** — server is innocent. The bug is that
the browser is left to **guess** the document encoding, and sometimes guesses
wrong:

1. **No transport charset.** The SSR HTML response sets
   `Content-Type: text/html` with **no `; charset=utf-8`**. Per the WHATWG HTML
   "encoding sniffing" algorithm, when the transport layer doesn't specify a
   charset the browser only **prescans the first 1024 bytes** of the document for
   a `<meta charset>`.

2. **`<meta charset>` is pushed far past byte 1024.**
   `overrideDocumentHtml` injects the dehydrated super-store script as the
   **first** child of `<head>` (via the `<!-- __POINT0_DEHYDRATED_SUPER_STORE__ -->`
   placeholder prepended at `render.ts`), and that script holds the entire page's
   dehydrated state (~200 KB on a docs page). So the document begins:

   ```html
   <!doctype html>
   <html lang="en" class="">
     <head><script id="__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__">
       window.__POINT0_DEHYDRATED_SUPER_STORE__ = "{...~200KB JSON...}";
     </script>
     ... and only ~207,900 bytes later: <meta charset="utf-8">
   ```

   The prescan never reaches the `<meta charset>`.

3. **Browser guesses.** With no header charset and no charset in the first 1 KB,
   the browser falls back to a content-based encoding detector (Chrome's
   `compact_enc_det`). Its guess depends on the byte statistics of the specific
   page → UTF-8 on some pages (correct), Windows-1252/Latin-1 on others (mojibake).
   That's the "periodically, not always."

Note: when the guess is wrong the **whole document** decodes wrong, including the
SSR text — strictly it's not "after hydration." It reads that way because (a) the
raw payload (view-source / network) is obviously fine while the rendered page is
broken, and (b) Chrome can do an initial paint with a tentative encoding and then
re-decode when it finally hits the late `<meta charset>`, producing a visible
flip around the hydration moment.

## Evidence (byte-level, from the live deploy)

```
$ curl -sSI https://1gr14.dev/error0/latest/overview | grep -i content-type
content-type: text/html                      # ← no charset

# "When instanceof isn't enough — mark" appears twice in the doc:
#  - rendered <a> in the markdown HTML
#  - inside the dehydrated-state JSON
# both have identical, correct UTF-8 bytes for the em dash:
... 65 6e 6f 75 67 68 20 e2 80 94 20 6d 61 72 6b ...   #  "enough <E2 80 94> mark"

# position of <meta charset> in the document:
$ grep -aob '<meta' page.html | head -1
207912:<meta                                 # ← way past the 1024-byte prescan window
```

So: server output is byte-perfect UTF-8; the only thing missing is an
authoritative "this is UTF-8" signal early enough for the browser.

## What's already done

Added an explicit `; charset=utf-8` to every response that serves an HTML
**document** (an explicit transport charset wins over prescan and content
detection unconditionally — `confidence: certain` in the spec, so this alone
fixes the reported bug). Uncommitted, in this repo:

- `packages/engine/src/fetcher.ts` — SSR stream response + both index-html
  fallbacks (the production path).
- `packages/engine/src/client.ts` — vite dev-server `/index.html` response.
- `packages/openapi/src/middleware.ts` — scalar + swagger HTML pages.

Not yet shipped: needs a Point0 release (next prerelease) + the site bumping
`@point0/engine` and redeploying before it's observable live.

## What's still worth doing (decide the best approach)

1. **Defense in depth — keep `<meta charset="utf-8">` within the first 1024
   bytes.** The header fix is sufficient, but relying solely on it is fragile (a
   proxy/CDN that rewrites or drops the header re-opens the hole, and any
   statically-served `index.html` path bypasses the fetcher). Options:
   - Force `<meta charset="utf-8">` to be the **first** child of `<head>` in
     `overrideDocumentHtml` (insert if missing, move to front if present),
     **before** the dehydrated-store placeholder. Smallest, safest.
   - Or inject the dehydrated-store script **after** the charset meta (needs a
     "place after `<meta charset>`" anchor; `prependHeadElement`'s `afterScriptId`
     only matches `<script>` today).
   - Consider whether the ~200 KB dehydrated-state script even belongs at the top
     of `<head>`. It only needs to be defined before the bootstrap module runs;
     moving it to the **end of `<body>`** (just before React's bootstrap modules)
     would keep `<head>` small, get the charset/meta/title in early, and improve
     first-parse latency. Verify the client entry still finds
     `window.__POINT0_DEHYDRATED_SUPER_STORE__` (`mount.ts` reads it on import).

2. **Make charset a single source of truth.** Right now charset lives in the
   app's `index.client.html`. Decide whether the engine should always guarantee
   it (both header + early meta) regardless of the app template, so apps can't
   accidentally drop it.

3. **Regression coverage.** A test asserting (a) the SSR response carries
   `content-type: text/html; charset=utf-8`, and (b) `<meta charset>` appears in
   the first 1024 bytes of the rendered document. Cheap and catches both the
   header and the ordering regressions.

## References

- HTML response headers (no charset, now fixed): `packages/engine/src/fetcher.ts`
  (SSR stream + index fallbacks), `packages/engine/src/client.ts:767`,
  `packages/openapi/src/middleware.ts:107`/`:116`.
- Dehydrated-store injected first in `<head>`:
  `packages/engine/src/render.ts:305` (placeholder prepend) →
  `packages/engine/src/render.ts:359` (script materialized with
  `uneval(superstore.stringify(...))`).
- Client reads the global on mount: `packages/react-dom/src/mount.ts:29`
  (`window.__POINT0_DEHYDRATED_SUPER_STORE__` → `superstore.prepare`).
- Spec: WHATWG HTML "determining the character encoding" / "prescan a byte
  stream to determine its encoding" (1024-byte limit; transport charset =
  confidence certain).
