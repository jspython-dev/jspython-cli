# jspython CLI.

Command line interface to run [jspython](https://github.com/jspython-dev/jspython) files (*.jspy)

### Install

```
  npm install -g @jspython-dev/jspython-cli
```

### Run in terminal
```
  jspython-cli --file path/to/jspython/file
  jspython-cli --file test.jsy
```

### Development
Run example using node. (Works only if you have `@jspython-dev/jspython-cli` devDependencies in you project)
```
node ./bin/jspython-cli --file=examples/project/axios-test.jspy
node ./bin/jspython-cli --file examples/project/parse.jspy
node ./bin/jspython-cli --file examples/project/p-test.jspy
```

