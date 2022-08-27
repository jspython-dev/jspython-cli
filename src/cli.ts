import arg from 'arg';
import fs from 'fs';
import { Interpreter } from 'jspython-interpreter';
import { AssertInfo, initialScope, jsPythonForNode } from './jspython-node';
import { InterpreterOptions } from './types';
import { trimChar } from './utils';
var util = require('util');

const pkg = require('../package.json');

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

function getOptionsFromArguments(rawArgs: string[]): InterpreterOptions {
  const args = arg(
    {
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
    },
    { permissive: true, argv: process.argv.slice(2) }
  );

  const params = args._.reduce((obj: { [key: string]: any }, a: string) => {
    const kv = a.replace('--', '');
    let [key, val]: any = kv.split('=');
    if (kv === key) {
      val = true;
    }
    obj[key] = val;
    return obj;
  }, {});

  const res: InterpreterOptions = {
    file: args['--file'] || (rawArgs.length === 3 && !rawArgs[2].startsWith('-') ? rawArgs[2] : '')
  };

  if (args['--version']) {
    res.version = args['--version'];
  }
  if (args['--output']) {
    res.output = args['--output'];
  }
  if (args['--entryFunction']) {
    res.entryFunction = args['--entryFunction'];
  }
  if (args['--srcRoot']) {
    res.srcRoot = args['--srcRoot'];
  }

  if (trimChar(res.srcRoot || '', '/').length) {
    res.srcRoot = res.srcRoot + '/';
  }

  res.params = { ...res, ...params };

  return res;
}

async function main() {
  const options = getOptionsFromArguments(process.argv);
  const interpreter: Interpreter = (await jsPythonForNode(options)) as Interpreter;
  const jspyContext: Record<string, any> = { ...initialScope, ...{ args: options.params } };

  if (options.version) {
    console.log(interpreter.jsPythonInfo());
    console.log(`JSPython cli v${(pkg || {}).version}\n`);
    return;
  }

  if (!options.file) {
    console.log(interpreter.jsPythonInfo());
    console.log(`JSPython cli v${(pkg || {}).version}\n`);
    console.log(` :\> jspython (fileName.jspy)`);
    console.log(` :\> jspython -f (fileName.jspy)`);
    console.log(` :\> jspython --file=(fileName.jspy)`);
    console.log(` :\> jspython --file=(fileName.jspy) --srcRoot=src`);
    console.log(` :\> jspython --file=(fileName.jspy) --param1=someValue1 --param2=someValue2`);
    console.log(' ');
    return;
  }

  if (options.output) {
    var logFile = fs.createWriteStream(options.output, { flags: 'w' });
    var logStdout = process.stdout;

    console.log = function () {
      const req = new RegExp('\\x1b\\[\\d\\dm', 'g');
      logFile.write(
        util.format.apply(
          null,
          Array.from(arguments).map(a => (a && a.replace ? a.replace(req, '') : a))
        ) + '\n'
      );
      logStdout.write(util.format.apply(null, arguments) + '\n');
    };
    console.error = console.log;
  }

  if (options.file) {
    let fileName = `${options.srcRoot || ''}${options.file}`;

    // try to check if file exists in 'src' folder
    if (!fs.existsSync(fileName)) {
      fileName = `src/${options.file}`;
    }

    const scripts = fs.readFileSync(fileName, 'utf8');
    console.log(interpreter.jsPythonInfo());
    console.log(`> ${options.file}`);
    try {
      const res = await interpreter.evaluate(
        scripts,
        jspyContext,
        options.entryFunction || undefined,
        options.file
      );

      if (!!jspyContext.asserts?.length) {
        const asserts = (jspyContext.asserts || []) as AssertInfo[];
        console.log(`  > assert success : ${asserts.filter(a => a.success).length}`);
        console.log(`  > assert failed  : ${asserts.filter(a => !a.success).length}`);
      }

      if (!!res || res === 0) {
        console.log('>', res);
      }
    } catch (err) {
      console.log('JSPython execution failed: ', (err as Error)?.message || err, err);
      throw err;
    }
  }
}

main().catch(e => console.log('error:', e?.message || e));
