---
index: 1000
title: File upload
description:
  A File in the input is sent as multipart/form-data and the loader receives a
  real File — no upload API.
---

A file is just part of a point's input. Declare a schema field as a file
(`z.file()`, `z.instanceof(File)`, …), put a real `File` into the input on the
client, and the loader gets that `File` back on the server. Point0 assembles the
`multipart/form-data` request itself — there is no separate upload API.

```tsx
import { root } from '@/lib/root'
import * as z from 'zod'

export const ideaCreateMutation = root.lets
  .mutation()
  .input(
    z.object({
      title: z.string().min(1),
      image: z.file().optional(), // a file field, just like any other input field
    }),
  )
  .loader(async ({ input }) => {
    // on the server, input.image is a real File (a Blob subclass)
    const imageBase64 = input.image
      ? Buffer.from(await input.image.arrayBuffer()).toString('base64')
      : undefined
    const idea = await prisma.idea.create({
      data: { title: input.title, image: imageBase64 },
    })
    return { idea }
  })
  .mutation()
```

On the client you fill that field from an `<input type="file">` and pass it like
any other value:

```tsx
const mutation = ideaCreateMutation.useMutation()
const [image, setImage] = useState<File | undefined>(undefined)

// <input type="file" onChange={(e) => setImage(e.target.files?.[0] || undefined)} />

await mutation.mutateAsync({ title, image })
// the loader's input.image is a File with .name, .type, .size, .arrayBuffer() intact
```

(This is the canonical `examples/basic` flow — `src/lib/idea.ts` declares the
field, `src/pages/idea-create-update.tsx` wires the `<input type="file">`.)

## What counts as a file

A file field is any schema field that holds a `File` or a `Blob`. How you
declare it depends on your validation library:

```tsx
z.file() // zod
z.instanceof(File) // zod, also detected
v.file() // valibot
Type.String({ format: 'binary' }) // typebox
type({ file: 'File' }) // arktype
```

The schema only validates the value and feeds [OpenAPI](openapi) (see below); it
does **not** decide whether the request is multipart.

## How the request is encoded

The body format is chosen by looking at the input value, not the schema. If the
input contains any `File` or `Blob` anywhere, the whole body is sent as
`multipart/form-data`; otherwise it's JSON.

```tsx
mutation.mutate({ title: 'x', image: someFile }) // → multipart/form-data
mutation.mutate({ title: 'x' }) // → application/json (no file present)
```

Consequences:

- **Detection is recursive.** A file nested deep in the input
  (`{ profile: { avatar: File } }`, `{ files: [File, File] }`) still triggers
  multipart — the detector walks arrays and plain objects.
- **Don't set `Content-Type` yourself.** On the multipart branch Point0 sets no
  `Content-Type` header, so the runtime fills in
  `multipart/form-data; boundary=…` automatically. Setting it by hand breaks the
  boundary.
- **Flattening is automatic.** Declare your input with any nesting you like; on
  the multipart branch Point0 flattens it to bracket-notation keys
  (`profile[avatar]`, `files[0]`) with [`@1gr14/flat`](https://1gr14.dev/flat)
  before sending, and the server unflattens it back into the original shape for
  the loader. The `File`/`Blob` parts are appended raw; every other field is
  `JSON.stringify`'d into its form part.
- **The loader gets a genuine `File`.** Its `name`, `type`, `size`, and
  `arrayBuffer()` all survive the round-trip.

## Where the file lands on the server

The loader reads the file from the same place it reads the rest of the input —
which depends on the point type:

```tsx
// mutation: file is in input
.loader(async ({ input }) => { input.image /* the File */ })

// action: file is in body
.loader(async ({ body }) => { body.image /* the File */ })
```

Send files with a [mutation](mutation) (or an [action](action)), not a
[query](query). A query's input has to be serializable into a cache key, and a
`File` has no sensible serialization there. Uploading is a write, so it belongs
on a mutation. [Pages](page) and [layouts](layout) are `GET` and carry no body,
so they never take a file upload either.

## Mutations

The example at the top is a mutation — the common case. The file is part of
`.input`, you fill it on the client, the server loader consumes it. See
[Mutation](mutation) for the rest of the mutation surface.

## Actions

An [action](action) puts the file in `.body` instead of `.input`, and the loader
reads it from `body`:

```tsx
export const uploadAction = root.lets
  .action('POST', '/api/upload')
  .body(z.object({ file: z.file() }))
  .loader(async ({ body }) => {
    const bytes = await body.file.arrayBuffer()
    return { size: bytes.byteLength }
  })
  .action()
```

An action can also take a ready-made `FormData` as its body directly, bypassing
the schema-driven assembly — useful when you already hold a `FormData` (e.g.
from a `<form>`):

```tsx
const fd = new FormData()
fd.append('file', file)
await uploadAction.fetch({ body: fd }) // passed through as-is
```

The action body shape and the `FormData` pass-through run through the same
encoder and decoder as a mutation file — the encoder picks them up from
`input.body` and the server reads them back from the request body.

## Reading the file in the loader

The loader gets the standard web `File` (a `Blob` subclass), so use the web API:

```tsx
.loader(async ({ input }) => {
  const file = input.image
  file.name             // 'photo.png'
  file.type             // 'image/png'
  file.size             // bytes
  const buf = Buffer.from(await file.arrayBuffer()) // → Buffer, store / process it
})
```

`examples/basic` base64-encodes the buffer and stores it in the database; in a
real app you'd stream it to object storage instead.

## OpenAPI

When a point's input (or an action's body) schema contains a file, the generated
[OpenAPI](openapi) operation uses `multipart/form-data` and marks the field as a
binary string:

```jsonc
"requestBody": {
  "content": {
    "multipart/form-data": {
      "schema": {
        "type": "object",
        "required": ["file"],
        "properties": {
          "file": { "type": "string", "format": "binary", "contentEncoding": "binary" }
        }
      }
    }
  }
}
```

This is the **only** place the schema-level file detection is used — it does not
affect runtime encoding. For OpenAPI to detect the file, the matching
[`.schemaHelper`](stage-methods) must be registered on the root (e.g.
`.schemaHelper(zodSchemaHelper())`).

## Files in logs

A `File`/`Blob`/`FormData` is never logged raw. In [event](events) `meta` it's
replaced with a short placeholder, so payloads stay readable and bytes never
reach your logs:

```tsx
{ image: someFile } // logs as { image: '[File: photo.png (12345 bytes)]' }
new Blob([…])        // '[Blob: 12345 bytes]'
new FormData()       // '[FormData]'
```

## Security: the file is read on the server

The loader body and the imports it uses are cut from the client bundle, so file
handling, validation, and storage (and everything they pull in) never ship to
the browser. As with any endpoint, gate access with [`.with`](with) (for a
render gate) or in the loader via `.ctx`/`.use` (for a write gate) — see
[Mutation](mutation) authorization. Don't trust the client-declared file:
validate `type` / `size` in the loader.

## Reference

### The two detection helpers

There is **no** symbol named `isFile` — two distinct mechanisms exist:

| Helper                               | Level         | Used by                 | What it does                                                                                        |
| ------------------------------------ | ------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `isContainsBinary(value)`            | runtime value | the request encoder     | returns `true` if a `File`/`Blob` sits anywhere in the value (recursive); decides multipart vs JSON |
| `SchemaHelper.hasFileOrBlob(schema)` | schema        | [OpenAPI](openapi) only | per-library walk of the schema to detect a file field                                               |

Both are exported from `@point0/core`, but you rarely call either directly —
they run inside the framework.

Per-library `hasFileOrBlob` detection:

| Library     | Detected as a file                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| zod         | `def.type` is `'file'` / `'blob'`, or a `custom` check that passes a `File`/`Blob` probe (so `z.instanceof(File)` is caught) |
| valibot     | type `'file'` / `'blob'`                                                                                                     |
| typebox     | `type: 'string', format: 'binary'`                                                                                           |
| arktype     | a `'File'` / `'Blob'` node in the schema JSON                                                                                |
| yup         | a `/(file\|blob)/i`-named test that passes a `File`/`Blob` probe                                                             |
| superstruct | type `'file'` / `'blob'`                                                                                                     |

### Encoding rules

| Condition                        | Body                                            |
| -------------------------------- | ----------------------------------------------- |
| input contains any `File`/`Blob` | `multipart/form-data`, no manual `Content-Type` |
| input has no binary              | `application/json`                              |
| action body is a `FormData`      | passed through as-is                            |
| `undefined` field                | skipped, not appended                           |

The `transform` flag ([transformer](transformer), default on) round-trips
non-file form fields through JSON on both ends; with `transform: false` scalar
fields stay as strings. `File`/`Blob` parts are unaffected either way.

### Edge cases and gaps

- **Malformed multipart → empty input.** If the server can't parse the body, it
  falls back to `{}` and your schema validation produces the user-facing error.
- **Optional file left out.** An `undefined` file simply isn't sent; with no
  other binary present the request is plain JSON.
- **Nested and array files round-trip.** The recursive detector
  (`isContainsBinary`) walks objects and arrays, and the bracket-notation
  flatten/unflatten reassembles the deep shape for the loader.

## Size, type, and count limits

Point0 enforces no file size, MIME type, or file count limit of its own. Limits
come from three places:

- **Your schema** — refine the file field to reject what you don't want
  (`z.file().max(5_000_000)`, a `.refine(f => f.type === 'image/png')`, an array
  with `.max(n)` for a count cap). Schema validation runs on the server, so the
  check holds even against a hand-crafted request.
- **Your loader** — re-check `file.size` / `file.type` in the loader for
  anything the schema can't express, then store or reject.
- **The runtime** — the body is parsed by the runtime's `formData()` (Bun's, or
  the platform's), so whatever request-body ceiling that runtime imposes applies
  before your loader ever sees the file.
