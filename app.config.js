var app = {}
app.errors = {}
app.errors.emptyOptions = `
    Please provide a valid configuration.
    Value received is not an object.
`
app.errors.invalidFilesOption = `
    Please provide a valid file configuration.
    Value received is not an array.
`
app.errors.emptyFilesOption = `
    Please provide a valid file configuration.
    The glob patterns did not amount to any files.
    Are the patterns relative to the current working directory?
`

module.exports = app
