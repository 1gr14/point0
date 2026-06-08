// Marker module — recognized by the compiler/engine, no runtime value of its own.
//
//   import '@point0/core/cold'
//
// Declares this file (and its downward static-import subtree) COLD for server dev: it is part of the
// server's boot/runtime side effects (crons, workers, queues, warmup, DB client singletons) and must
// NOT be hot-swapped. Editing a cold file triggers a full server restart instead of a module re-import;
// at build time the cold subtree is externalized (loaded once as a singleton) rather than re-importable.
// Everything not reached as cold stays hot (re-imported on change). Mirrors `@point0/core/client-only`.

export {}
