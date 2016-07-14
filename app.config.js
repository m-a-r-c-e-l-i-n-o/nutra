var Path = require('path')

var app = {}
app.errors = {}
app.errors.emptyOptions = `
    Please provide a valid configuration.
    Value received is not an object.
`
app.errors.invalidOptionsPath = `
    Please provide a valid configuration path.
    The path received could not be loaded.
    Path received: "{{config-path}}"
`
app.errors.invalidFilesOption = `
    Please provide a valid file configuration.
    Value received is not an array.
`
app.errors.emptyFilesOption = `
    Please provide a valid file configuration.
    The glob patterns did not amount to any files.
    Are the patterns relative to the current working directory?
    Patterns received: {{patterns}}
`
app.errors.invalidCLIConfigOption = `
    Please provide a valid configuration file.
    Value received did not lead to a valid module.
    Did you pass a config parameter? --config "path/to/nutra.config.js"
`
app.tmpDirectory = Path.join(__dirname, '/tmp/')

module.exports = app
