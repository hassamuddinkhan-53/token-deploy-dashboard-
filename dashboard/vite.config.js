import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Use the classic JSX runtime so Vite/Babel does not require
      // the automatic `react/jsx-runtime` imports when React package
      // may not yet be installed in development environments.
      jsxRuntime: 'classic'
    })
  ],
  server: {
    port: 5174
  }
})
