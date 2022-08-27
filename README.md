# JSPython CLI.

Command line interface to run [JSPython](https://github.com/jspython-dev/jspython) in NodeJS environment

## Install from NPM

```
  npm install -g jspython-cli
```

## Usage

### Run in terminal
```
  jspython --f path/to/jspython/file
  jspython --file=test.jspy

```

### JSPython command line arguments
In CLI
```
jspython --file=path/to/jspython/file --arg1=value --arg2='test value 1'
jspython path/to/jspython/file arg1=value
```
Inside your JSPython script yu can access arguments with `args` object.
```py
a1 = args.arg1
a2 = args.arg2 or 'another value'
```

### Run file
```
jspython --file=path/to/jspython/file.jspy
```

### Run file and log into file
```
jspython --file=path/to/jspython/file.jspy --output=path/to/log.txt
```

### Run specific function from the file
```
jspython --file=path/to/jspython/file.jspy --entryFunction=myFunc1
```
or
```
jspython -f path/to/jspython/file.jspy -e myFunc1
```



### Run file when you have your source code in a nested folder
```
jspython --file=path/to/jspython/file.jspy --srcRoot=src
```
Normally, you would expect package.json and node_modules to be in the root level and all scripts in the `src` folder

```
-|- .git
-|- .vscode
-|- .gitignore
-|- .ws
-|- node_modules
-|- src
     -|- my_code.jspy
-|- package.json
```

Then, from a root folder you can:
> jspython --file=my_code.jspy --srcRoot=src --param1=some_Value

or

> jspython -f my_code.jspy -s src --param1=some_Value


### Version info

> jspython -v

or

> jspython --version

## Development
Run example using node. (Works only if you have build project `npm run build`)
```
node ./bin/jspython --file=../jspython-examples/test.jspy
node ./bin/jspython --file=test.jspy --srcRoot=../jspython-examples/
```

# License
A permissive [BSD 3-Clause License](https://github.com/jspython-dev/jspython-cli/blob/master/LICENSE) (c) FalconSoft Ltd.

