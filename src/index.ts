import arg from 'arg';
import fs from 'fs';
import { jsPython, Interpreter, PackageLoader } from 'jspython-interpreter';
import { httpGet, httpPost, httpDelete, httpPut } from './http';

const pkg = require('../package.json');

export const interpreter: Interpreter = jsPython() as Interpreter;
interpreter.addFunction('httpGet', httpGet);
interpreter.addFunction('httpPost', httpPost);
interpreter.addFunction('httpDelete', httpDelete);
interpreter.addFunction('httpPut', httpPut);
run();

async function run() {
  const options = getOptionsFromArguments(process.argv);
  if (options.version) {
    console.log(`Version:\n${pkg.version}\n`);
  }

  if (options.file) {
    interpreter.registerPackagesLoader(packageLoader as PackageLoader);
    const scripts = fs.readFileSync(options.file, 'utf8');
    const res = await interpreter.evaluate(scripts);
    console.log('Execution result:\n', res);
    console.log('Finish');
  }
}

function getOptionsFromArguments(rawArgs: string[]) {
  const args = arg({
    '--file': String,
    '--version': Boolean,
    '-f': '--file',
    '-v': '--version'
  }, {
    argv: rawArgs.slice(2)
  });

  return {
    file: args['--file'] || (rawArgs.length === 3 && !rawArgs[2].startsWith('-') ? rawArgs[2] : ''),
    version: args['--version']
  };
}

/**@type {PackageLoader} */
function packageLoader(packageName: string): any {
    return require(packageName);
}
