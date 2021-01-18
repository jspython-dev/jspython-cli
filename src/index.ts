import arg from 'arg';
import fs from 'fs';
import { jsPython, Interpreter, PackageLoader } from 'jspython-interpreter';

const pkg = require('../package.json');
const appConfig = require(`${process.cwd().split('\\').join('/')}/jspy.config.js`) 
  || require(`${process.cwd().split('\\').join('/')}/jspy.config.json`)
  || {};

const context: any = {
  asserts: [],
  params: {}
}
export const interpreter: Interpreter = jsPython() as Interpreter;
interpreter.addFunction('assert', (condition: boolean, name?: string, description?: string) => {
  context.asserts.push({ condition, name, description });
});
interpreter.addFunction('showAsserts', () => {
  console.table(context.asserts);
});
interpreter.addFunction('params', (name: string) => {
  const value = context.params[name];
  return value === undefined ? null : value;
});

run();

async function run() {
  const options = getOptionsFromArguments(process.argv);
  if (options.version) {
    console.log(interpreter.jsPythonInfo());
    console.log(`JSPython cli v${(pkg ||{}).version}\n`);
  }

  if (options.output) {
    var util = require('util');
    var logFile = fs.createWriteStream(options.output, { flags: 'w' });
    var logStdout = process.stdout;

    console.log = function () {
      const req = new RegExp('\\x1b\\[\\d\\dm', 'g');
      logFile.write(util.format.apply(null, Array.from(arguments).map(a => a && a.replace ? a.replace(req, '') : a)) + '\n');
      logStdout.write(util.format.apply(null, arguments) + '\n');
    }
    console.error = console.log;
  }

  if (options.file) {
    interpreter.registerPackagesLoader(packageLoader as PackageLoader);
    const scripts = fs.readFileSync(options.file, 'utf8');
    context.asserts.length = 0;
    console.log(interpreter.jsPythonInfo())
    console.log(`> ${options.file}`)
    const res = await interpreter.evaluate(scripts, appConfig, undefined, options.file);
    if (res !== null) {
      console.log(res);
    }
  }
}

function getOptionsFromArguments(rawArgs: string[]) {
  const args = arg({
    '--file': String,
    '--version': Boolean,
    '--output': String,
    '-f': '--file',
    '-v': '--version',
    '-o': '--output'
  }, {
    argv: rawArgs.slice(2),
    permissive: true
  });

  const params = args._.reduce((obj: { [key: string]: any }, a: string) => {
    const kv = a.replace('--', '');
    let [key, val]: any = kv.split('=');
    if (kv === key) {
      val = true;
    }
    obj[key] = val;
    return obj;
  }, {});

  const res = {
    file: args['--file'] || (rawArgs.length === 3 && !rawArgs[2].startsWith('-') ? rawArgs[2] : ''),
    version: args['--version'],
    output: args['--output']
  };

  context.params = { ...res, ...params };

  return res;
}

/**@type {PackageLoader} */
function packageLoader(packageName: string): any {
  try {
    if (['fs', 'path', 'readline', 'timers', 'child_process', 'util', 'zlib', 'stream', 'net', 'https', 'http', 'events', 'os', 'buffer']
      .includes(packageName)) {
      return require(packageName)
    }

    if (packageName.toLowerCase().endsWith('.js') || packageName.toLowerCase().endsWith('.json')) {
      return require(`${process.cwd().split('\\').join('/')}/${packageName}`)
    }

    return require(`${process.cwd().split('\\').join('/')}/node_modules/${packageName}`);
  }
  catch (err) {
    console.log('Import Error: ', err);
    throw err;
  }
}
