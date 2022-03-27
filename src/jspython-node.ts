import fs from 'fs';
import { jsPython, Interpreter, PackageLoader } from 'jspython-interpreter';
import { InterpreterOptions } from './types';
import { trimChar } from './utils';

const rootFolder = process.cwd().split('\\').join('/');
const initialScope: any = {};

type NodeJsInterpreter = Interpreter & { evaluateFile: (fileName: string) => Promise<any> };

const context: any = {
  asserts: [],
  params: {}
}

initialScope.assert = (condition: boolean, name?: string, description?: string) => context.asserts.push({ condition, name, description });
  initialScope.showAsserts = () => console.table(context.asserts);
  initialScope.params = (name: string) => {
    const value = context.params[name];
    return value === undefined ? null : value;
  }

export function jsPythonForNode(options: InterpreterOptions = {
  srcRoot: ''
}): NodeJsInterpreter {
  const interpreter: NodeJsInterpreter = jsPython() as NodeJsInterpreter;
  Object.assign(context.params, options.params);

  interpreter
    .registerPackagesLoader(packageLoader as PackageLoader)
    .registerModuleLoader(moduleLoader);

  const evaluate = interpreter.evaluate;

  interpreter.evaluate = async function(script: string, evaluationContext?: object | undefined, entryFunctionName?: string | undefined, moduleName?: string | undefined) {
    context.asserts.length = 0;
    await initialize(options.srcRoot);
    return evaluate.call(interpreter, script, evaluationContext, entryFunctionName, moduleName);
  }

  interpreter.evaluateFile = function(filePath: string, context = {}) {
    const script = getScript(filePath);
    return interpreter.evaluate(script, context, options.entryFunction);
  }

  return interpreter;


  function moduleLoader(filePath: string): Promise<string> {
    filePath = trimChar(trimChar(filePath, '/'), '.');
    let fileName = `${options.srcRoot}${filePath}.jspy`;

    if (!fs.existsSync(fileName)) {
      fileName = `${options.srcRoot}${filePath}`;
    }

    if (!fs.existsSync(fileName)) {
      fileName = `src/${filePath}`;
    }

    try {
      const script = fs.readFileSync(fileName, 'utf8');
      return Promise.resolve(script);
    } catch (e) {
      console.log('* module loader error ', e?.message || e)
      return Promise.reject(e);
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
}

function getScript(fileName: string): string {
  if (!fs.existsSync(fileName)) {
    throw Error(`File not found`)
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
  console.log({ rootFolder, baseSource })
  if (!fs.existsSync(appJsPath)) {
    appJsPath = `${rootFolder}/src/app.js`
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
