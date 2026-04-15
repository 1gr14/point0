// TODO: we need creat-app cli

//  we should add it as bin to package json

// we should allow pass --vite flag to use vite.
// In this case after copying code:
remove right from package json: "bun-plugin-tailwind"
uncomment viteConfig in packages/create-app/template/src/engine.ts
uncommend in packages/create-app/template/src/index.html <!-- <link rel="stylesheet" href="/styles/tailwind.css" /> -->
in indexhtml replkace "./index.client.ts" with "/index.client.ts"


// else if vite not provided
remove right from package json all deps with "vite" in name
remove viteConfig from packages/create-app/template/src/engine.ts
remove comment in packages/create-app/template/src/index.html <!-- <link rel="stylesheet" href="/styles/tailwind.css" /> -->

// if flags not provided, then iteractive mode, where we ask user what he wants to use vite or not, prepare that later may be more questions

// we should check if un installed
// if bun not installed we ask user to install it
// if yes then run npm install -g bun

// do not write your own helpers, use existing best libraries for cli commands ineractive and flags, find most nice cariant!