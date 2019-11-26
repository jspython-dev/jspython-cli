# jspython CLI.

Command line interface to run [jspython](https://github.com/jspython-dev/jspython) files (*.jspy)

### Install

```
  npm install -g @jspython-dev/jspython-cli
```

### Run in terminal
```
  jspython path/to/jspython/file
  jspython --file path/to/jspython/file
  jspython --file=test.jspy

```

### Development
Run example using node. (Works only if you have `@jspython-dev/jspython-cli` devDependencies in you project)
```
node ./bin/jspython --file=examples/project/axios-test.jspy
node ./bin/jspython --file examples/project/parse.jspy
```

