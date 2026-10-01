import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    // Only our own code is obfuscated, and only in production builds.
    obfuscator({
      apply: 'build',
      include: [/src\/.*\.(ts|tsx)$/],
      exclude: [/node_modules/],
      options: {
        compact: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        stringArray: true,
        stringArrayThreshold: 0.75,
        stringArrayEncoding: ['base64'],
        controlFlowFlattening: false,
        deadCodeInjection: false,
        selfDefending: false,
        debugProtection: false,
      },
    }),
  ],
  build: { sourcemap: false },
});