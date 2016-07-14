# N.U.T.R.A — Node Unit Test Runner Auxiliary
[![npm version](https://badge.fury.io/js/nutra.svg)](https://badge.fury.io/js/nutra)
[![Coverage Status](https://coveralls.io/repos/github/m-a-r-c-e-l-i-n-o/nutra/badge.svg?branch=master)](https://coveralls.io/github/m-a-r-c-e-l-i-n-o/nutra?branch=master)
[![Build Status](https://travis-ci.org/m-a-r-c-e-l-i-n-o/nutra.svg?branch=master)](https://travis-ci.org/m-a-r-c-e-l-i-n-o/nutra)
[![Dependency Status](https://david-dm.org/m-a-r-c-e-l-i-n-o/nutra.svg)](https://david-dm.org/m-a-r-c-e-l-i-n-o/nutra)
[![devDependency Status](https://david-dm.org/m-a-r-c-e-l-i-n-o/nutra/dev-status.svg)](https://david-dm.org/m-a-r-c-e-l-i-n-o/nutra#info=devDependencies)

The "nutra" module is a simple, extendable unit test runner for node.

## Quickstart
Get the "nutra" module up and running with just a few steps.

##### 1) Install Nutra:
```bash
npm install --save-dev nutra
```
<sub>*Nutra recommends Node v4+, as lower versions of node are not being officially supported.*</sub>

##### 2) Install Preset:
Give [this one](https://github.com/m-a-r-c-e-l-i-n-o/nutra-jasmine-preset) a try, for now.<br />
<sub>*Nutra requires presets to be installed with NPM v3+ do to its reliance on a flat dependency tree.*</sub>

##### 3) Add Nutra to NPM Scripts:
```js
{ // package.json
  ...
  "scripts": {
    "test": "nutra --config ./nutra.config.js",
  }
  ...
}
```

##### 4) Run CLI:
```bash
npm run test
```

## Support
##### Questions About Usage:
For questions about usage (i.e. configuration, plugin development, etc), please post them on [StackOverflow](http://stackoverflow.com/) and tag it with the keyword "nutra".

##### Issues:
For bugs and other unexpected behavior, please post them up on the issue section of this [GitHub](https://github.com/m-a-r-c-e-l-i-n-o/nutra/issues).

## Usage:
##### CLI:
Provide a nutra configuration file:<br />
`nutra --config "path/to/nutra.config.js"`<br />
<sub>*The "--config" argument is required Path is relative to the current working directory (cwd).*</sub>

##### JS API:
```js
const nutra = Nutra({
  configFile: 'path/to/nutra.config.js', // optional
  files: ['test/specs/**/*.js', 'src/**/*.js']
})
nutra.start()
```
<sub>*The "config" argument is required. Config path is relative to the current working directory (cwd).*</sub>

## Configuration Presets:
- [jasmine](https://github.com/m-a-r-c-e-l-i-n-o/nutra-jasmine-preset)
- [jasmine-coverage](https://github.com/m-a-r-c-e-l-i-n-o/nutra-jasmine-coverage-preset)
- [jasmine-coverage-babel](https://github.com/m-a-r-c-e-l-i-n-o/nutra-jasmine-coverage-babel-preset)

## Configuration Anatomy:
```js
// nutra.config.js
module.exports = function( config ) {
  config.set({

    // The "files" property allows you to specify the location of your app files and specs.
    // It expects an array of globs (https://github.com/isaacs/node-glob) and is always required.
    files: ['test/specs/**/*.js', 'src/**/*.js'],

    // The "absolutePaths" boolean property allows you to specify whether or not all file paths
    // should be treated as absolute. This includes the preprocessor patterns.
    absolutePaths: false,

    // The "frameworks" property allows you to specify nutra framework plugins, this will typically
    // be your test framework (i.e. jasmine, mocha, etc).
    frameworks: ['nutra-jasmine'],

    // The "preprocessors" property allows you to specify nutra preprocessors plugins, this will
    // typically be coverage or transpiling tools (i.e. babel, traceur, typescript, etc).
    preprocessors: {
      'test/specs/**/*.js': ['nutra-babel'],
      'src/**/*.js': ['nutra-babel', 'nutra-coverage']
    },

    // The "reporters" property allows you to specify nutra reporters plugins, this will
    // typically be coverage and other reporting tools.
    reporters: ['nutra-coverage'],

    // The "{{plugin}}Options" property allows you to specify nutra plugin options, this will
    // vary depending on what plugins you are using. An option property for each plugin must
    // be specified (i.e. babelOptions: {}, coverageOptions: {}, etc), but it is not required.
    coverageOptions: {
      dir : './coverage/',
      reporters: [
        { type: 'lcovonly', subdir: '.', file: 'lcov.info' }
      ]
    }
  })
}
```

## Nutra Plugins:
- [nutra-jasmine](https://github.com/m-a-r-c-e-l-i-n-o/nutra-jasmine)
- [nutra-coverage](https://github.com/m-a-r-c-e-l-i-n-o/nutra-coverage)
- [nutra-babel](https://github.com/m-a-r-c-e-l-i-n-o/nutra-babel)
- [nutra-minimal-reporter](https://github.com/m-a-r-c-e-l-i-n-o/nutra-jasmine)

## Contributing
Pull requests are always welcome. In lieu of a formal styleguide, please:
- Take care to maintain the existing coding style.
- Add unit tests for any new or changed functionality.

## Why?
I get a trill from reinventing a simpler, more efficient wheel.
