import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy'

const pkg = require('./package.json');

export default {
  input: pkg.main,
  output: { file: pkg.bin['jspython'], format: 'cjs', sourcemap: true, compact: true, banner: '#!/usr/bin/env node' },
  plugins: [
    typescript({
      clean: true
    }),
    copy({
      targets: [
        { src: 'src/examples', dest: 'dist' }
      ]
    })
  ],
  external: ['arg', 'fs', 'jspython-interpreter', 'http', 'https']
};
