module.exports = function( config ) {
    config.set({
        frameworks: ['nutra-jasmine'],
        files: ['test/specs/**/*.js', 'src/**/*.js'],
        preprocessors: {
            'src/**/*.js': ['nutra-coverage']
        },
        reporters: ['nutra-coverage'],
        coverageOptions: {
            dir : './coverage/',
            reporters: [
                { type: 'html', subdir: 'report-html' }
            ]
        }
    })
}

