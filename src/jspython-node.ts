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
  interpreter.evaluate = function() {
    context.asserts.length = 0;
    return evaluate.apply(interpreter, arguments as any);
  }

  interpreter.evaluateFile = function(filePath: string) {
    const script = getScript(filePath);
    return interpreter.evaluate(script, {});
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
