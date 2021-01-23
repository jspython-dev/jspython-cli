import arg from 'arg';
import fs from 'fs';
import { jsPython, Interpreter, PackageLoader } from 'jspython-interpreter';

const pkg = require('../package.json');

const context: any = {
  asserts: [],
  params: {}
}

const appFolder = process.cwd().split('\\').join('/');

const initialScope: Record<string, any> = {
  app: {}
};

const interpreter: Interpreter = jsPython() as Interpreter;

run();

async function initialize() {
  // process app.json (if exists)
  // add configuration to the 'app'
  if (fs.existsSync(`${appFolder}/app.json`)) {
    const app = require(`${appFolder}/app.json`);
    initialScope.app = Object.assign(initialScope.app || {}, app);
  }

  // process app.js (if exists)
  //  - run _init
  //  - delete _ init
  //  - run _initAsync
  //  - delete _initAsync
  //  - load content into 'app'
  if (fs.existsSync(`${appFolder}/app.js`)) {
    const app = require(`${appFolder}/app.js`);

    if (typeof app._init == 'function') {
      app._init();
      delete app._init;
    }

    if (typeof app._initAsync == 'function') {
      await app._initAsync();
      delete app._initAsync;
    }

    Object.assign(initialScope, app);
  }

  initialScope.assert = (condition: boolean, name?: string, description?: string) => context.asserts.push({ condition, name, description });
  initialScope.showAsserts = () => console.table(context.asserts);
  initialScope.params = (name: string) => {
    const value = context.params[name];
    return value === undefined ? null : value;
  }
}

async function run() {
  await initialize();

  const options = getOptionsFromArguments(process.argv);
  if (options.version) {
    console.log(interpreter.jsPythonInfo());
    console.log(`JSPython cli v${(pkg || {}).version}\n`);
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
    const res = await interpreter.evaluate(scripts, initialScope, options.entryFunction || undefined, options.file);
    if (res !== null) {
      console.log(res);
    }
  }
}

function getOptionsFromArguments(rawArgs: string[]) {
  const args = arg({
    '--file': String,
    '--entryFunction': String,
    '--version': Boolean,
    '--output': String,
    '-f': '--file',
    '-ef': '--entryFunction',
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
    output: args['--output'],
    entryFunction: args['--entryFunction']
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
