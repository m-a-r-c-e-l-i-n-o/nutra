module.exports = function( config ) {
    config.set({
        frameworks: ['nutra-jasmine'],
        files: ['test/specs/**/*.js', 'src/**/*.js'],
        preprocessors: {
            'test/specs/**/*.js': ['nutra-babel'],
            'src/**/*.js': ['nutra-babel']
        },
        babelOptions: {
            configFile: './.babelrc'
        }
    })
}

