import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets keep production builds portable if the repository is renamed.
  base: './',
  build: {
    sourcemap: true,
  },
});
