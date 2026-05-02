---
index: 200
title: Getting Started
description: How to create your first Point0 application
---

Run `bunx @point0/create-app@latest my-app` to create a new Point0 application.

Then run `cd my-app` to navigate to the application directory.

Then run `bun run dev` to start the development server.

Then open [http://localhost:3000](http://localhost:3000) to see the application.

```tsx
import { createApp } from '@point0/core'

// fake code, just test markdown
const app = createApp({
  routes: [{ path: '/', component: Home }],
})

app.mount('#app')
```
