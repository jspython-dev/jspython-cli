import arg from 'arg';
import fs from 'fs';
import { jsPython, Interpreter, PackageLoader } from 'jspython-interpreter';
var util = require('util');

const pkg = require('../package.json');

const context: any = {
  asserts: [],
  params: {}
}

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });

const initialScope: Record<string, any> = {
  app: {}
};

const rootFolder = process.cwd().split('\\').join('/');
const interpreter: Interpreter = jsPython() as Interpreter;
const options = getOptionsFromArguments(process.argv);

function trimChar(text: string, charToRemove: string): string {
  while (text.charAt(0) == charToRemove) {
    text = text.substring(1);
  }

  while (text.charAt(text.length - 1) == charToRemove) {
    text = text.substring(0, text.length - 1);
  }

  return text;
}

async function initialize(baseSource: string) {
  // process app.json (if exists)
  // add configuration to the 'app'
  if (fs.existsSync(`${rootFolder}/${baseSource}app.json`)) {
    const app = require(`${rootFolder}/${baseSource}app.json`);
    initialScope.app = Object.assign(initialScope.app || {}, app);
  }

  // process app.js (if exists)
  //  - run _init
  //  - delete _ init
  //  - run _initAsync
  //  - delete _initAsync
  //  - load content into 'app'
  if (fs.existsSync(`${rootFolder}/${baseSource}app.js`)) {
    const app = require(`${rootFolder}/${baseSource}app.js`);

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

function getOptionsFromArguments(rawArgs: string[]) {
  const args = arg({
    '--file': String,
    '--srcRoot': String,
    '--entryFunction': String,
    '--version': Boolean,
    '--output': String,
    '-f': '--file',
    '-s': '--srcRoot',
    '-e': '--entryFunction',
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
    entryFunction: args['--entryFunction'],
    srcRoot: args['--srcRoot'] || ''
  };

  res.srcRoot = trimChar(res.srcRoot || '', '/');
  if (res.srcRoot.length) {
    res.srcRoot = res.srcRoot + '/';
  }

  context.params = { ...res, ...params };

  return res;
}

function moduleLoader(filePath: string): Promise<string> {
  try {
    const script = fs.readFileSync(`${options.srcRoot}${trimChar(filePath, '/')}.jspy`, 'utf8');
    return Promise.resolve(script);
  } catch (e) {
    try {
      // try without JSPY
      const script = fs.readFileSync(`${options.srcRoot}${trimChar(filePath, '/')}`, 'utf8');
      return Promise.resolve(script);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

/**@type {PackageLoader} */
function packageLoader(packageName: string): any {
  try {
    if (['fs', 'path', 'readline', 'timers', 'child_process', 'util', 'zlib', 'stream', 'net', 'https', 'http', 'events', 'os', 'buffer']
      .includes(packageName)) {
      return require(packageName)
    }

    if (packageName.toLowerCase().endsWith('.js') || packageName.toLowerCase().endsWith('.json')) {
      return require(`${rootFolder}/${options.srcRoot}${packageName}`)
    }

    return require(`${rootFolder}/node_modules/${packageName}`);
  }
  catch (err) {
    console.log('Import Error: ', err?.message || err);
    throw err;
  }
}

async function main() {
  if (options.version) {
    console.log(interpreter.jsPythonInfo());
    console.log(`JSPython cli v${(pkg || {}).version}\n`);
  }

  if (options.output) {
    var logFile = fs.createWriteStream(options.output, { flags: 'w' });
    var logStdout = process.stdout;

    console.log = function () {
      const req = new RegExp('\\x1b\\[\\d\\dm', 'g');
      logFile.write(util.format.apply(null, Array.from(arguments).map(a => a && a.replace ? a.replace(req, '') : a)) + '\n');
      logStdout.write(util.format.apply(null, arguments) + '\n');
    }
    console.error = console.log;
  }

  await initialize(options.srcRoot);

  if (options.file) {
    const scripts = fs.readFileSync(`${options.srcRoot}${options.file}`, 'utf8');
    context.asserts.length = 0;
    console.log(interpreter.jsPythonInfo())
    console.log(`> ${options.file}`)
    try {
      const res = await interpreter
          .registerPackagesLoader(packageLoader as PackageLoader)
          .registerModuleLoader(moduleLoader)      
          .evaluate(scripts, initialScope, options.entryFunction || undefined, options.file);

      if (!!res || res === 0) {
        console.log('>', res);
      }
    } catch (err) {
      console.log('JSPython execution failed: ', err?.message || err, err);
      throw err;
    }
  }
}

main()
  .catch(e => console.log('error:', e?.message || e))
