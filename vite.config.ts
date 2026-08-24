import { defineConfig } from 'vite';

export default defineConfig({
  // Relative assets keep production builds portable if the repository is renamed.
  base: './',
  build: {
    // Source maps were ~11 MB and are not useful to players in production.
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Keep Phaser and other dependencies in a stable cacheable chunk so
        // normal gameplay updates do not force players to redownload the engine.
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
