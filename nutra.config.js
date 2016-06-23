module.exports = function( config ) {
    config.set({
        frameworks: ['nutra-jasmine'],
        files: ['test/specs/**/*.js', 'src/**/*.js'],
        preprocessors: {
            'test/specs/**/*.js': ['nutra-babel'],
            'src/**/*.js': ['nutra-babel', 'nutra-coverage']
        },
        reporters: ['nutra-coverage'],
        babelOptions: {
            configFile: './.babelrc'
        },
        coverageOptions: {
            dir : './coverage/',
            reporters: [
                { type: 'lcovonly', subdir: '.', file: 'lcov.info' }
            ]
        }
    })
}

