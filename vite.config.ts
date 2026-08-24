import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this repository from /Service-Rush/.
  // Keep the production base explicit so module and asset URLs resolve reliably.
  base: '/Service-Rush/',
  build: {
    sourcemap: false,
  },
});
