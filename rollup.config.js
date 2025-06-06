import { defineConfig } from 'rollup';
import terser from '@rollup/plugin-terser';  // <- default import
import babel from '@rollup/plugin-babel';

export default defineConfig({
  input: 'src/index.js',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
    }),
    // terser(),
  ],
  external: ['react'],
});
