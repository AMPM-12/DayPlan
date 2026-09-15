import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Netlify sets COMMIT_REF to the exact commit being built — prefer it over
// a local `git rev-parse` since it's guaranteed to match what's actually
// deployed (a local checkout could be mid-rebase, detached, etc.). Falls
// back to git for local dev builds, and to "unknown" if neither is
// available (e.g. a shallow clone with no .git).
function resolveBuildCommit(): string {
  const fromEnv = process.env.COMMIT_REF
  if (fromEnv) return fromEnv.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

const BUILD_COMMIT = resolveBuildCommit()
const BUILD_TIME = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BUILD_COMMIT__: JSON.stringify(BUILD_COMMIT),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Daily Plan',
        short_name: 'Daily Plan',
        description: 'A calm, personal daily-plan timeline.',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // Adds a `push` (and `notificationclick`) listener to the generated
        // service worker without switching away from generateSW — see
        // public/push-handler.js.
        importScripts: ['push-handler.js'],
      },
    }),
  ],
})
