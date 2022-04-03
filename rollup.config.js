import typescript from 'rollup-plugin-typescript2';
import copy from 'rollup-plugin-copy'

const pkg = require('./package.json');

const external = ['fs', 'jspython-interpreter'];

export default [{
  input: 'src/cli.ts',
  output: { file: pkg.bin['jspython'], format: 'cjs', sourcemap: false, compact: true, banner: '#!/usr/bin/env node' },
  plugins: [
    typescript({
      clean: true,
      tsconfigOverride: {
        compilerOptions: { declaration: false }
      }
    }),
    copy({
      targets: [
        { src: 'src/examples', dest: 'lib' }
      ]
    })
  ],
  external: ['arg', 'http', 'https', ...external]
}, {
  input: 'src/public-api.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs'
    }
  ],
  plugins: [
    typescript({
      clean: true
    })
  ],
  external
}];
