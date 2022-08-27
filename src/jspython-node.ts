import fs from 'fs';
import { jsPython, Interpreter, PackageLoader } from 'jspython-interpreter';
import { Assert } from './assert';
import { InterpreterOptions } from './types';
import { trimChar } from './utils';

const rootFolder = process.cwd().split('\\').join('/');
export const initialScope: any = {
  session: {},
  asserts: [] as AssertInfo[]
};

type NodeJsInterpreter = Interpreter & { evaluateFile: (fileName: string) => Promise<any> };
export type AssertInfo = { success: boolean; name: string; description?: string };
type LogInfo = { level: 'info' | 'fail' | 'success'; message: string; time: Date; logId?: string };

let previousLogMessage = '';

const context: {
  params: any;
} = {
  params: {}
};

function logFn(msg: LogInfo): void {
  const level = msg.level === 'success' ? msg.level : msg.level + '   ';
  const message = `${level} | ${msg.message}`;

  if (message !== previousLogMessage) {
    console.log(`| ${msg.time.toTimeString().slice(0, 8)} | ${message}`);
    previousLogMessage = message;
  }
}

function assert(name: string, dataContext?: boolean | any): Assert | void {
  // an original case when
  if (typeof dataContext === 'boolean') {
    logFn({
      level: dataContext ? 'success' : 'fail',
      message: name || '',
      time: new Date()
    });
    initialScope.asserts.push({ success: !!dataContext, name });
    return;
  }

  function assertCallback(success: boolean, message: string) {
    logFn({
      logId: name,
      level: success ? 'success' : 'fail',
      message: `${name} ${message ? ':' : ''} ${message || ''}`,
      time: new Date()
    });

    const existingAssert = initialScope.asserts?.find((a: AssertInfo) => a.name === name);
    if (existingAssert) {
      // only if condition it is not fail yet
      if (!!existingAssert.success) {
        existingAssert.success = !!success;
        existingAssert.description = message;
      }
    } else {
      initialScope.asserts.push({ success: !!success, name: name, description: message });
    }
  }

  return new Assert(name, dataContext, assertCallback);
}

function getScript(fileName: string): string {
  if (!fs.existsSync(fileName)) {
    throw Error(`File not found`);
  }

  const scripts = fs.readFileSync(fileName, 'utf8');
  return scripts;
}

async function initialize(baseSource: string) {
  // process app.js (if exists)
  //  - run _init
  //  - delete _ init
  //  - run _initAsync
  //  - delete _initAsync
  //  - load content into 'app'

  let appJsPath = `${rootFolder}/${baseSource}app.js`;
  console.log({ rootFolder, baseSource });
  if (!fs.existsSync(appJsPath)) {
    appJsPath = `${rootFolder}/src/app.js`;
  }

  if (fs.existsSync(appJsPath)) {
    const app = require(appJsPath);

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
}

initialScope.assert = (name: string, dataContext: any) => assert(name, dataContext);
initialScope.showAsserts = () =>
  console.table(
    initialScope.asserts?.map((r: any) => ({
      status: r.success ? 'success' : 'fail',
      assert: `${r.name}${!!r.description ? ': ' : ''}${r.description || ''}`.trim()
    }))
  );
initialScope.print = (...args: any) =>
  logFn({
    time: new Date(),
    level: 'info',
    message: args.map((v: any) => (typeof v === 'object' ? JSON.stringify(v) : v)).join(' ')
  });

export async function jsPythonForNode(
  options: InterpreterOptions = {
    srcRoot: ''
  }
): Promise<NodeJsInterpreter> {
  const interpreter: NodeJsInterpreter = jsPython() as NodeJsInterpreter;
  Object.assign(context.params, options.params);

  await initialize(options.srcRoot || '');

  interpreter
    .registerPackagesLoader(packageLoader as PackageLoader)
    .registerModuleLoader(moduleLoader);

  const evaluate = interpreter.evaluate;

  interpreter.evaluate = async function (
    script: string,
    evaluationContext?: object | undefined,
    entryFunctionName?: string | undefined,
    moduleName?: string | undefined
  ) {
    initialScope.asserts.splice(0, initialScope.asserts.length);
    return evaluate.call(interpreter, script, evaluationContext, entryFunctionName, moduleName);
  };

  interpreter.evaluateFile = function (filePath: string, context = {}) {
    const script = getScript(filePath);
    return interpreter.evaluate(script, context, options.entryFunction);
  };

  return interpreter;

  function moduleLoader(filePath: string): Promise<string> {
    filePath = trimChar(trimChar(filePath, '/'), '.');
    let fileName = `${options.srcRoot || ''}${filePath}.jspy`;

    if (!fs.existsSync(fileName)) {
      fileName = `${options.srcRoot || ''}${filePath}`;
    }

    if (!fs.existsSync(fileName)) {
      fileName = `src/${filePath}`;
    }

    try {
      const script = fs.readFileSync(fileName, 'utf8');
      return Promise.resolve(script);
    } catch (e) {
      console.log('* module loader error ', (e as Error)?.message || e);
      return Promise.reject(e);
    }
  }

  /**@type {PackageLoader} */
  function packageLoader(packageName: string): any {
    try {
      if (
        [
          'fs',
          'path',
          'readline',
          'timers',
          'child_process',
          'util',
          'zlib',
          'stream',
          'net',
          'https',
          'http',
          'events',
          'os',
          'buffer'
        ].includes(packageName)
      ) {
        return require(packageName);
      }

      if (
        packageName.toLowerCase().endsWith('.js') ||
        packageName.toLowerCase().endsWith('.json')
      ) {
        return require(`${rootFolder}/${options.srcRoot || ''}${packageName}`);
      }

      return require(`${rootFolder}/node_modules/${packageName}`);
    } catch (err) {
      console.log('Import Error: ', (err as Error)?.message ?? err);
      throw err;
    }
  }
}
