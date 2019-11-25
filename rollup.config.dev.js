import typescript from 'rollup-plugin-typescript2';

export default {

  input: 'src/index.ts',
  output: {
    name: 'JSPython-cli',
    file: 'bin/JSPython-cli',
    format: 'cjs',
    sourcemap: true,
    banner: '#!/usr/bin/env node'
  },
  plugins: [
    typescript()
  ],
  external: ['arg', 'fs', 'JSPython', 'json5'],
  watch: {
    exclude: ['node_modules/**'],
    include: 'src/**'
  }
};
