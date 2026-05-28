export const bundlers = process.env.FOCUS_VITE ? ['vite'] : process.env.FOCUS_BUN ? ['bun'] : ['bun', 'vite']
