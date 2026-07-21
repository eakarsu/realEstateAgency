import { defineConfig, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

const projectJsx = {
  name: 'project-js-as-jsx',
  enforce: 'pre',
  async transform(code, id) {
    if (/\/src\/.*\.js$/.test(id)) {
      return transformWithOxc(code, id, { lang: 'jsx' })
    }
  }
}

export default defineConfig({
  plugins: [projectJsx, react({ include: /\.(js|jsx|ts|tsx)$/ })],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`,
        changeOrigin: true
      },
      '/uploads': {
        target: `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`,
        changeOrigin: true
      }
    }
  },
  preview: {
    proxy: {
      '/api': { target: `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`, changeOrigin: true },
      '/uploads': { target: `http://127.0.0.1:${process.env.BACKEND_PORT || 3001}`, changeOrigin: true }
    }
  }
})
