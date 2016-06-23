# N.U.T.R.A — Node Unit Test Runner Auxiliary
[![Coverage Status](https://coveralls.io/repos/github/m-a-r-c-e-l-i-n-o/nutra/badge.svg?branch=master)](https://coveralls.io/github/m-a-r-c-e-l-i-n-o/nutra?branch=master)
[![Build Status](https://travis-ci.org/m-a-r-c-e-l-i-n-o/nutra.svg?branch=master)](https://travis-ci.org/m-a-r-c-e-l-i-n-o/nutra)


The "nutra" module is a simple, extendable unit test runner for node.

## Quickstart
Get the "nutra" module up and running with just a few steps.
##### Install:
```bash
npm install --save-dev nutra nutra-jasmine
```

##### Grab a recipe file:
Maybe give [this one](https://github.com/m-a-r-c-e-l-i-n-o/nutra/blob/master/recipes/jasmine/nutra.config.js) a try.

##### Specify where files live:
```js
{ // nutra.config.js
  ...
  files: ['test/specs/**/*.js'],
  ...
}
```
##### Add to npm scripts (package.json):
```json
"scripts": {
  "test": "nutra --config ./nutra.config.js",
}
```
##### Run:
```bash
npm test
```
