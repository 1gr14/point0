# HMR State Preservation Fix

## Problem Analysis

### What Was Happening

When Hot Module Replacement (HMR) occurred on a page component (like `ideas.view.tsx`), the React component state (e.g., `count` from `useState`) was being lost and reset to its initial value.

### Root Cause

The issue had multiple layers:

1. **Page Definition in `ideas.tsx`:**

   ```tsx
   .page(({ data }) => <IdeasView data={data} />)
   ```

   This creates an **arrow function** that wraps `IdeasView`.

2. **On HMR:**

   - When `ideas.view.tsx` updates → `IdeasView` is hot-reloaded
   - Since `ideas.tsx` imports `IdeasView` → `ideas.tsx` also hot-reloads
   - The entire page point is recreated with a **new arrow function instance**
   - This new function is stored in `point._page`

3. **Component Tree Structure:**

   ```
   PageWrapperComponent
     └─ PageComponent
        └─ [Arrow Function] ← NEW FUNCTION REFERENCE ON HMR
           └─ IdeasView ← Stable, but never reached
   ```

4. **React's Perspective:**
   - React uses `React.createElement(point._page, { data, location })`
   - `point._page` is the arrow function, which has a **new reference** after HMR
   - React sees this as a **completely different component type**
   - React unmounts the old component and mounts the new one
   - **State is lost** during unmount/remount

### Why This Matters

React Fast Refresh preserves state for components that maintain the same "signature" across reloads. The signature includes:

- Component name
- Hook calls (order and types)
- Component reference/identity

When the wrapping arrow function changes, React can't preserve state because the component identity has changed, even though the underlying `IdeasView` is stable.

## Solution

### The Fix

Implemented an **HMR-aware component cache** that maintains stable component identities across hot module reloads.

### How It Works

1. **Global Cache (`_hmrComponentCache`):**

   ```typescript
   const _hmrComponentCache = new Map<
     string,
     {
       component: React.ComponentType<any>
       componentRef: { current: any }
     }
   >()
   ```

2. **HMR-Safe Wrapper Function:**

   ```typescript
   function _getOrCreateHMRSafeWrapper<TProps>(
     cacheKey: string,
     component: React.ComponentType<TProps>,
     displayNamePrefix = 'HMRSafeWrapper',
   ): React.ComponentType<TProps>
   ```

3. **How It Works:**

   - **First call:** Creates a stable wrapper component and a ref pointing to the current component version
   - **Subsequent calls (HMR):** Reuses the same wrapper but updates the ref to point to the new component
   - The wrapper always renders using `componentRef.current`, which points to the latest version
   - React sees the **same component** (the wrapper) across HMR updates

4. **Cache Key:**
   ```typescript
   const cacheKey = `page:${point._baseId}:${point._getRouteDefinition()}`
   ```
   - Uses route definition and base ID
   - Stable across HMR updates
   - Unique per page/layout

### Implementation Details

**In `_getWrappedPageComponent`:**

```typescript
const pageComponentDefined: PageComponent<TOutputData, TRoute> = point._page ?? (() => null as never)

const cacheKey = `page:${point._baseId}:${point._getRouteDefinition()}`

const HMRSafePageComponent = _getOrCreateHMRSafeWrapper<PageComponentProps<TOutputData, TRoute>>(
  cacheKey,
  pageComponentDefined,
  'HMRSafePage',
)

function PageComponent({ data, location }: PageComponentProps<TOutputData, TRoute>): React.ReactElement {
  // ... heads management ...
  return React.createElement(HMRSafePageComponent, { data, location })
}
```

**Similar changes in `_getWrappedLayoutComponent`** for layout components.

## Component Tree After Fix

```
PageWrapperComponent
  └─ PageComponent
     └─ HMRSafeWrapper (STABLE across HMR)
        └─ [Arrow Function] (via ref.current, updated on HMR)
           └─ IdeasView (receives updates, preserves state!)
```

## Benefits

1. ✅ **State Preservation:** Component state survives HMR updates
2. ✅ **No API Changes:** Existing code works without modifications
3. ✅ **Universal:** Works for both pages and layouts
4. ✅ **Performance:** Minimal overhead, uses ref indirection
5. ✅ **Type Safe:** Full TypeScript support maintained
6. ✅ **React Fast Refresh Compatible:** Works with React's HMR system

## Usage

No changes needed in user code! The fix is transparent:

```tsx
// In ideas.tsx
export const ideasPage = generalLayout
  .route(routes.ideas)
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ...data, ideas, ideasCount: ideas.length, env: ctx.env.NODE_ENV }
  })
  .page(({ data }) => <IdeasView data={data} />) // ← Works automatically!

// In ideas.view.tsx
export const IdeasView = ({ data }) => {
  const [count, setCount] = useState(() => 0) // ← State preserved on HMR!
  // ...
}
```

## Testing

To verify the fix works:

1. Run the dev server: `bun run dev`
2. Navigate to `/ideas`
3. Click the counter to increment it (e.g., count = 5)
4. Edit `ideas.view.tsx` (change text, add styles, etc.)
5. Save the file and wait for HMR
6. **Expected:** Counter remains at 5
7. **Before fix:** Counter would reset to 0

## Technical Notes

- The cache is global and persists across HMR updates
- Each page/layout gets a unique cache key based on route + baseId
- The wrapper component uses a ref to always render the latest version
- React sees the wrapper as the same component across HMR updates
- This allows React Fast Refresh to preserve component state

## Related Files

- `src/core/index.tsx` - Main implementation
- `examples/ssr-spa/src/pages/ideas.view.tsx` - Example component with state
- `examples/ssr-spa/src/pages/ideas.tsx` - Example page definition
