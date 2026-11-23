// Vite is only the dev server here: GitHub Pages serves the repository root
// as-is, so nothing from `vite build` reaches visitors.
export default {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
  },
}
