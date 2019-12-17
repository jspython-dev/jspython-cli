import typescript from 'rollup-plugin-typescript2';
const pkg = require('./package.json');

export default {

  input: 'src/index.ts',
  output: {
    name: 'JSPython-cli',
    file: pkg.bin['jspython'],
    format: 'cjs',
    sourcemap: true,
    banner: '#!/usr/bin/env node'
  },
  plugins: [
    typescript()
  ],
  external: ['arg', 'fs', 'jspython-interpreter', 'json5', 'http', 'https'],
  watch: {
    exclude: ['node_modules/**'],
    include: 'src/**'
  }
};
