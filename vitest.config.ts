import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'lib/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // topics.ts ist mit server-only markiert; im Test ist das ein No-op.
      'server-only': path.resolve(__dirname, 'lib/test/server-only-stub.ts'),
    },
  },
})
