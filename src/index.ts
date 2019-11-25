import arg from 'arg';
import fs from 'fs';
import { jsPython, PackageToImport } from '@jspython-dev/jspython';

const pkg = require('../package.json');

export const interpreter = jsPython();

run();

async function run() {
  const options = getOptionsFromArguments(process.argv);
  if (options.version) {
    console.log(`Version:\n${pkg.version}\n`);
  }

  if (options.file) {
    interpreter.registerPackagesLoader(packageLoader);
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


function packageLoader(packages: PackageToImport[]): object {
  const libraries: any = {};
  packages.forEach(({ name, as, properties }: PackageToImport) => {
    const lib = require(name);
    if (properties?.length) {
      properties.forEach((prop) => {
        libraries[prop.as || prop.name] = lib[prop.name];
      })
    } else if (as) {
      libraries[as] = lib;
    } else {
      libraries[name] = lib;
    }
    if (as) {
      libraries[as] = lib;
    }
  });
  return libraries;
}
