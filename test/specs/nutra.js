import Fs from 'fs'
import Path from 'path'
import Nutra from '../../src/nutra.js'
import Helper from 'nutra-helper'
import AppConfig from '../../app.config.js'

const NodeVersion = process.versions.node.split('.')[0]
const SimpleNutraConfig = {
    files: ['test/src/**/*.js'] // equivalent to "./test/simple.nutra.config.js"
}

describe ('Nutra constructor', () => {
    it ('should be an object.', () => {
        const nutra = Nutra(SimpleNutraConfig)
        expect(typeof nutra).toBe('object')
    })
    it ('should be an object.', () => {
        const nutra = Nutra(SimpleNutraConfig)
        expect(typeof nutra).toBe('object')
    })
    it ('should expose private class.', () => {
        const nutra = Nutra(SimpleNutraConfig)
        expect(typeof nutra.__private__).toBe('object')
    })
    it ('should not be mutable.', () => {
        const nutra = Nutra(SimpleNutraConfig)
        const mutate = () => {
            nutra.hello = 'world'
        }
        expect(mutate).toThrowError(
            TypeError,
            'Can\'t add property hello, object is not extensible'
        )
    })
    it ('should load config from path', () => {
        const options = {
            configFile: './test/simple.nutra.config.js'
        }
        const nutra = Nutra(options)
        const outputOptions = Object.assign({}, options, SimpleNutraConfig, {
            basePath: process.cwd()
        })
        expect(nutra.__private__.system.opts).toEqual(outputOptions)
    })
})

describe ('Nutra __private__.handleError()', () => {
    it ('should catch errors when first parameter is passed', () => {
        const nutra = Nutra(SimpleNutraConfig)
        expect(() => nutra.__private__.handleError(new Error('Fatal!')))
        .toThrowError('Fatal!')
    })
    it ('should catch warnings when second parameter is passed', () => {
        const nutra = Nutra(SimpleNutraConfig)
        const consoleWarn = console.warn
        console.warn = function (message) {
           expect(message.startsWith('Warning!')).toBeTruthy()
        }
        nutra.__private__.handleError(new Error('Warning!'), true)
        console.warn = consoleWarn
    })
    it ('should not throw error when second parameter is passed', () => {
        const nutra = Nutra(SimpleNutraConfig)
        const consoleWarn = console.warn
        console.warn = () => {}
        expect(() => nutra.__private__.handleError(new Error('Warning!'), true))
        .not.toThrowError('Warning!')
        console.warn = consoleWarn
    })
    it ('should throw error with no stack when third parameter is passed', () => {
        const nutra = Nutra(SimpleNutraConfig)
        expect(() => nutra.__private__.handleError(new Error('Fatal!'), true, true))
        .toThrowError('Fatal!')
    })
})

describe ('Nutra __private__.constructor()', () => {
    let nutra
    beforeEach(() => {
        nutra = Nutra(SimpleNutraConfig).__private__.constructor
    })
    it ('should throw fatal warning if options argument is not an object', () => {
        expect(() => new nutra()).toThrowError(AppConfig.errors.emptyOptions)
    })
    it ('should throw fatal warning if files options argument is not an array', () => {
        expect(() => new nutra({files: undefined}))
        .toThrowError(
            AppConfig.errors.invalidFilesOption
        )
    })
    it ('should throw fatal warning if files options argument is an empty array', () => {
        expect(() => new nutra({files: []}))
        .toThrowError(
            AppConfig.errors.emptyFilesOption.replace('{{patterns}}', 'None.')
        )
    })
    it ('should throw fatal warning if files options argument has invalid globs', () => {
        let patterns = '\n    ';
        patterns += [
            Path.join(process.cwd(), 'does/not/exist/one/**/*.js'),
            Path.join(process.cwd(), 'does/not/exist/two/**/*.js')
        ]
        .join('\n    ')
        expect(() => new nutra({files: [
            'does/not/exist/one/**/*.js',
            'does/not/exist/two/**/*.js'
        ]}))
        .toThrowError(
            AppConfig.errors.emptyFilesOption.replace('{{patterns}}', patterns)
        )
    })
    it ('should throw define a "system" propety', () => {
        const instance = new nutra(SimpleNutraConfig)
        expect(instance.system).toBeDefined()
    })
    it ('should throw define a "pluginHooks" propety', () => {
        const instance = new nutra(SimpleNutraConfig)
        expect(instance.pluginHooks).toBeDefined()
    })
})

describe ('Nutra __private__.start()', () => {
    it ('should return a promise and fulfill it', (done) => {
        let nutra = Nutra(SimpleNutraConfig).__private__
        nutra.start().then(result => {
            done()
        })
    })
    it ('should trigger the __private__.runEvents() method', () => {
        let nutra = Nutra(SimpleNutraConfig).__private__
        spyOn(nutra, 'runEvents').and.callThrough()
        nutra.start()
        expect(nutra.runEvents).toHaveBeenCalled()
    })
    it ('should create a temporary directory', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        nutra.start()
        expect(() => Fs.accessSync(nutra.system.tmpDirectory, Fs.F_OK))
        .not.toThrowError()
    })
})

describe ('Nutra __private__.getSystemConstants()', () => {
    let nutra
    const configWithBasePath = Object.assign({}, SimpleNutraConfig, {
        basePath: process.cwd()
    })
    beforeEach(() => {
        nutra = Nutra(SimpleNutraConfig).__private__
    })
    it ('should return a system constants object with default properties', () => {
        const system = nutra.getSystemConstants(configWithBasePath)
        expect(system.opts).toEqual(configWithBasePath)
        expect(system.absolutePaths).toBe(false)
        expect(system.files[0])
        .toEqual(Path.join(process.cwd(), '/test/src/simple.js'))
        expect(system.helper).toEqual(Helper)
        expect(system.tmpDirectory.indexOf(AppConfig.tmpDirectory))
        .toEqual(0)
        expect(system.handleError).toEqual(jasmine.any(Function))
        expect(system.callbacks.onFileSourceLoaded).toEqual(jasmine.any(Function))
    })
    it ('should return a system constants object with a truthy "absolutePaths" property', () => {
        const options = Object.assign({
            absolutePaths: true
        }, configWithBasePath)
        const system = nutra.getSystemConstants(options)
        expect(system.absolutePaths).toEqual(true)
    })
    it ('should expose a handle error method that calls nutra\'s own handler', () => {
        const mockHandleError = function () {
            expect(this).toBe(nutra)
        }
        nutra.handleError = mockHandleError
        const system = nutra.getSystemConstants(configWithBasePath)
        system.handleError()
    })
    it ('should expose a file source loaded callback that calls nutra\'s own handler', () => {
        const mockOnFileSourceLoaded = function () {
            expect(this).toBe(nutra)
        }
        nutra.onFileSourceLoaded = mockOnFileSourceLoaded
        const system = nutra.getSystemConstants(configWithBasePath)
        system.callbacks.onFileSourceLoaded()
    })
    it ('should return an object that is not be mutable', () => {
        const mutate = () => {
            const system = nutra.getSystemConstants(configWithBasePath)
            system.files = undefined
        }
        const message = (
            NodeVersion >= 6 ?
            'Cannot assign to read only property \'files\' of object \'#<Object>\'' :
            'Cannot assign to read only property \'files\' of #<Object>'
        )
        expect(mutate).toThrowError(TypeError, message)
    })
    it ('should return an object that is not be extendable', () => {
        const extend = () => {
            const system = nutra.getSystemConstants(configWithBasePath)
            system.hello = true
        }
        expect(extend).toThrowError(
            TypeError,
            'Can\'t add property hello, object is not extensible'
        )
    })
})

describe ('Nutra __private__.runEvents()', () => {
    it ('should return a promise and fulfill it', (done) => {
        let nutra = Nutra(SimpleNutraConfig).__private__
        nutra.start().then(result => {
            done()
        }).catch(error => {
            done.fail(error)
        })
    })
    it ('should trigger "runHooks" for each plugin event', (done) => {
        let nutra = Nutra(SimpleNutraConfig).__private__
        spyOn(nutra, 'runHooks').and.callThrough()
        nutra.runEvents().then(() => {
            expect(nutra.runHooks).toHaveBeenCalledTimes(8)
            expect(nutra.runHooks).toHaveBeenCalledWith('onLoad', 'preprocessors')
            expect(nutra.runHooks).toHaveBeenCalledWith('onLoad', 'frameworks')
            expect(nutra.runHooks).toHaveBeenCalledWith('onLoad', 'moduleloader')
            expect(nutra.runHooks).toHaveBeenCalledWith('onExit', 'moduleloader')
            expect(nutra.runHooks).toHaveBeenCalledWith('onExit', 'preprocessors')
            expect(nutra.runHooks).toHaveBeenCalledWith('onExit', 'frameworks')
            expect(nutra.runHooks).toHaveBeenCalledWith('onLoad', 'reporters')
            expect(nutra.runHooks).toHaveBeenCalledWith('onExit', 'reporters')
            done()
        }).catch(error => {
            done.fail(error)
        })
    })
})

describe ('Nutra __private__.getRequiredOptions()', () => {
    let nutra
    beforeEach(() => {
        nutra = Nutra(SimpleNutraConfig).__private__
    })
    it ('should return null when argument is not an object', () => {
        expect(nutra.getRequiredOptions(false)).toBe(null)
        expect(nutra.getRequiredOptions(null)).toBe(null)
        expect(nutra.getRequiredOptions('')).toBe(null)
        expect(nutra.getRequiredOptions([])).toBe(null)
        expect(nutra.getRequiredOptions()).toBe(null)
    })
    it ('should return the options object with the default "basePath" property', () => {
        const options = {
            basePath: process.cwd()
        }
        expect(nutra.getRequiredOptions({})).toEqual(options)
    })
    it ('should return the options object with the "basePath" property overwritten', () => {
        const options = {
            basePath: 'hello'
        }
        expect(nutra.getRequiredOptions(options)).toEqual(options)
    })
    it ('should return the options object when "configFile" property is not set', () => {
        const options = {}
        const outputOptions = Object.assign({}, {
            basePath: process.cwd()
        })
        expect(nutra.getRequiredOptions(options)).toEqual(outputOptions)
    })
    it ('should return the options object when "configFile" property is set', () => {
        const options = {
            configFile: './test/simple.nutra.config.js'
        }
        const outputOptions = Object.assign({}, options, SimpleNutraConfig, {
            basePath: process.cwd()
        })
        expect(nutra.getRequiredOptions(options)).toEqual(outputOptions)
    })
    it ('should return the options object when "configFile" & "absolutePaths" ' +
        'properties are set', () => {
        const options = {
            configFile: Path.join(process.cwd(), 'test/simple.nutra.config.js'),
            absolutePaths: true
        }
        const outputOptions = Object.assign({}, options, SimpleNutraConfig, {
            basePath: ''
        })
        expect(nutra.getRequiredOptions(options)).toEqual(outputOptions)
    })
    it ('should return the options object when "configFile" & ' +
        '"absolutePaths" is set, but "absolutePaths" is invalid', () => {
        const options = {
            configFile: '/non/existent/root/test/simple.nutra.config.js',
            absolutePaths: true
        }
        expect(() => nutra.getRequiredOptions(options))
        .toThrowError(
            AppConfig.errors.invalidOptionsPath.replace(
                '{{config-path}}',
                Path.join('/non/existent/root/test/simple.nutra.config.js')
            )
        )
    })
    it ('should throw error when the config filename is invalid', () => {
        const options = {
            configFile: 'path/to/no/where.js'
        }
        expect(() => nutra.getRequiredOptions(options))
        .toThrowError(
            AppConfig.errors.invalidOptionsPath.replace(
                '{{config-path}}',
                Path.join(process.cwd(), 'path/to/no/where.js')
            )
        )
    })
})

describe ('Nutra __private__.getEvents()', () => {
    const commonEvents = {
        onLoad: null,
        onExit: null,
    }
    it ('should return common events by default', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.getEvents()).toEqual(commonEvents)
    })
    it ('should return preprocessors events', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        var preprocessorEvents = Object.assign({
            onFileLoad: null
        }, commonEvents)
        expect(nutra.getEvents('preprocessor')).toEqual(preprocessorEvents)
    })
    it ('should return reporters events', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const reporterEvents = Object.assign({
            onFrameworkExecution: null
        }, commonEvents)
        expect(nutra.getEvents('reporter')).toEqual(reporterEvents)
    })
    it ('should return frameworks events', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.getEvents('framework')).toEqual(commonEvents)
    })
    it ('should return moduleloader events', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.getEvents('moduleloader')).toEqual(commonEvents)
    })
})

describe ('Nutra __private__.systemExit()', () => {
    it ('should delete temporary directory', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        nutra.start()
        nutra.systemExit()
        expect(() => Fs.accessSync(nutra.system.tmpDirectory, Fs.F_OK))
        .toThrowError()
    })
    it ('should check if temporary directory exists before deletion', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const tmpDirectory = nutra.system.tmpDirectory
        nutra.start()
        nutra.system = {}
        nutra.system.tmpDirectory = null
        nutra.systemExit()
        expect(() => Fs.accessSync(tmpDirectory, Fs.F_OK)).not.toThrowError()
        Helper.removeDirectory(tmpDirectory)
    })
})

describe ('Nutra __private__.getPluginHooks()', () => {
    it ('should call plugin constructor and pass parameters', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const spy = jasmine.createSpy('moduleloader');
        const initializedPlugins = [{
            name: 'nutra-commonjs',
            constructor: spy,
            options: {
                hello: 'world'
            }
        }]
        const events = {
            onLoad: null,
            onExit: null
        }
        nutra.getPluginHooks(initializedPlugins, events)
        expect(spy).toHaveBeenCalledWith(
            events,
            nutra.system,
            initializedPlugins[0].options
        )
    })
    it ('should pass to the constructor an inextendable events object', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const initializedPlugins = [{
            name: 'nutra-commonjs',
            constructor: (hooks) => {
                const extend = () => hooks.hello = 'world'
                expect(extend).toThrowError(
                    TypeError,
                    'Can\'t add property hello, object is not extensible'
                )
            },
            options: {}
        }]
        const events = {
            onLoad: null,
            onExit: null
        }
        nutra.getPluginHooks(initializedPlugins, events)
    })
    it ('should pass to the constructor an events object with mutable properties', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const initializedPlugins = [{
            name: 'nutra-commonjs',
            constructor: (hooks) => {
                const assign = () => {
                    hooks.onLoad = () => {}
                    hooks.onExit = () => {}
                }
                expect(assign).not.toThrowError()
            },
            options: {}
        }]
        const events = {
            onLoad: null,
            onExit: null
        }
        nutra.getPluginHooks(initializedPlugins, events)
    })
    it ('should return a list of plugins with their respective hooks', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const onLoad = () => {}
        const onExit = () => {}
        const initializedPlugins = [{
            name: 'nutra-commonjs',
            constructor: (hooks) => {
                const assign = () => {
                    hooks.onLoad = onLoad
                    hooks.onExit = onExit
                }
                expect(assign).not.toThrowError()
            },
            options: {}
        }]
        const events = {
            onLoad: null,
            onExit: null
        }
        expect(nutra.getPluginHooks(initializedPlugins, events))
        .toEqual([{
            name: 'nutra-commonjs',
            hooks: { onLoad: onLoad, onExit: onExit }
        }])
    })
})

describe ('Nutra __private__.getPreprocessorOnFileLoadHooks()', () => {
    let nutra
    const simpleFile = Path.join(process.cwd(), '/test/src/simple.js')
    const specFile = Path.join(process.cwd(), '/test/spec/nutra.js')
    const onFileLoadHook = () => console.log('Hello From onFileLoad!')
    beforeEach(() => {
        nutra = Nutra(SimpleNutraConfig).__private__
        nutra.preprocessorFilters = {
            'nutra-fakeprep': [Path.join(process.cwd(), './test/src/**')]
        }
        nutra.pluginHooks.preprocessors = [{
            name: 'nutra-fakeprep',
            hooks: {onFileLoad: onFileLoadHook}
        }]
    })
    it ('should return an empty array when no hooks are found', () => {
        expect(nutra.getPreprocessorOnFileLoadHooks(specFile))
        .toEqual([])
    })
    it ('should return an array of hooks when hooks are found', () => {
        expect(nutra.getPreprocessorOnFileLoadHooks(simpleFile))
        .toEqual([onFileLoadHook])
    })
    it ('should return an empty array when there are no preprocessors', () => {
        nutra.pluginHooks.preprocessors = undefined
        nutra.preprocessorFilters = undefined
        expect(nutra.getPreprocessorOnFileLoadHooks(simpleFile))
        .toEqual([])
    })
})

describe ('Nutra __private__.runPreprocessorOnFileLoadHooks()', () => {
    let nutra
    const hook1 = jasmine.createSpy('hook1')
    const hook2 = jasmine.createSpy('hook2')
    const hook3 = jasmine.createSpy('hook3')
    const source = 'Hello World'
    const simpleFile = Path.join(process.cwd(), '/test/src/simple.js')
    const simpleKey = 'test|src|simple.js'
    beforeEach(() => {
        nutra = Nutra(SimpleNutraConfig).__private__
    })
    it ('should return the same source if there are no hooks', () => {
        const sourceReference = {source: source}
        nutra.getPreprocessorOnFileLoadHooks = () => []
        expect(nutra.runPreprocessorOnFileLoadHooks(sourceReference))
        .toBe(sourceReference)
    })
    it ('should trigger all hooks once', () => {
        const source = 'Hello World'
        nutra.getPreprocessorOnFileLoadHooks = () => [hook1, hook2, hook3]
        nutra.runPreprocessorOnFileLoadHooks(source, simpleFile, simpleKey)
        expect(hook1).toHaveBeenCalledTimes(1)
        expect(hook2).toHaveBeenCalledTimes(1)
        expect(hook3).toHaveBeenCalledTimes(1)
    })
    it ('should trigger hooks with "source", "filename", and "key" arguments', () => {
        const source = 'Hello World'
        nutra.getPreprocessorOnFileLoadHooks = () => [hook1, hook2, hook3]
        nutra.runPreprocessorOnFileLoadHooks(source, simpleFile, simpleKey)
        expect(hook1).toHaveBeenCalledWith(source, simpleFile, simpleKey)
        expect(hook2).toHaveBeenCalledWith(source, simpleFile, simpleKey)
        expect(hook3).toHaveBeenCalledWith(source, simpleFile, simpleKey)
    })
    it ('should trigger hooks with the modified source from a previous hook', () => {
        const source = 'Hello World'
        const hook1Source = 'Hello World1'
        const hook2Source = 'Hello World2'
        const hooks = {
            1: (source, filename) => {return hook1Source},
            2: (source, filename) => {return hook2Source},
            3: (source, filename) => {}
        }
        spyOn(hooks, '1').and.callThrough()
        spyOn(hooks, '2').and.callThrough()
        spyOn(hooks, '3').and.callThrough()
        nutra.getPreprocessorOnFileLoadHooks = () => [hooks[1], hooks[2], hooks[3]]
        nutra.runPreprocessorOnFileLoadHooks(source, simpleFile, simpleKey)
        expect(hooks[1]).toHaveBeenCalledWith(source, simpleFile, simpleKey)
        expect(hooks[2]).toHaveBeenCalledWith(hook1Source, simpleFile, simpleKey)
        expect(hooks[3]).toHaveBeenCalledWith(hook2Source, simpleFile, simpleKey)
    })
    it ('should return the last modified source', () => {
        const source = 'Hello World'
        const hook1Source = 'Hello World1'
        const hook2Source = 'Hello World2'
        const hook3Source = 'Hello World3'
        const hooks = {
            1: (source, filename) => {return hook1Source},
            2: (source, filename) => {return hook2Source},
            3: (source, filename) => {return hook3Source}
        }
        nutra.getPreprocessorOnFileLoadHooks = () => [hooks[1], hooks[2], hooks[3]]
        expect(nutra.runPreprocessorOnFileLoadHooks(source, simpleFile, simpleKey))
        .toBe(hook3Source)
    })
    it ('should trigger hooks with the modified filename and source from a previous hook', () => {
        const source = 'Hello World'
        const hook1Source = 'Hello World1'
        const hook2Source = 'Hello World2'
        const hooks = {
            1: (source, filename) => {
                return {filename: '1', source: hook1Source}
            },
            2: (source, filename) => {
                return {filename: '2', source: hook2Source}
            },
            3: (source, filename) => {}
        }
        spyOn(hooks, '1').and.callThrough()
        spyOn(hooks, '2').and.callThrough()
        spyOn(hooks, '3').and.callThrough()
        nutra.getPreprocessorOnFileLoadHooks = () => [hooks[1], hooks[2], hooks[3]]
        nutra.runPreprocessorOnFileLoadHooks(source, simpleFile, simpleKey)
        expect(hooks[1]).toHaveBeenCalledWith(source, simpleFile, simpleKey)
        expect(hooks[2]).toHaveBeenCalledWith(hook1Source, '1', simpleKey)
        expect(hooks[3]).toHaveBeenCalledWith(hook2Source, '2', simpleKey)
    })
})

describe ('Nutra __private__.onFileSourceLoaded()', () => {
    const source = 'Hello World'
    const simpleKey = 'test|src|simple.js'
    it ('should trigger nutra\'s private runPreprocessorOnFileLoadHooks method', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        spyOn(nutra, 'runPreprocessorOnFileLoadHooks').and.callThrough()
        nutra.onFileSourceLoaded(source, '1', simpleKey)
        expect(nutra.runPreprocessorOnFileLoadHooks).toHaveBeenCalledTimes(1)
    })
    it ('should return a source string', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.onFileSourceLoaded(source, '1', simpleKey)).toBe(source)
    })
})

describe ('Nutra __private__.matchGlobs()', () => {
    const simpleFile = Path.join(process.cwd(), '/test/src/simple.js')
    it ('should return true if filename matches a glob in the array', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.matchGlobs([
                Path.join(process.cwd(), './test/src/**'),
                Path.join(process.cwd(), './test/specs/**')
            ],
            simpleFile
        ))
        .toBe(true)
    })
    it ('should return false if filename does not matches any globs in the array', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.matchGlobs(
            ['./test/fake/**', './test/specs/**'],
            simpleFile
        ))
        .toBe(false)
    })
})

describe ('Nutra __private__.normalizeFiles()', () => {
    const simpleFile = Path.join(process.cwd(), 'test/src/simple.js')
    const specFile = Path.join(process.cwd(), 'test/specs/nutra.js')
    it ('should return list with full file paths', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.normalizeFiles(
            ['./test/src/simple.js', './test/specs/nutra.js'],
            process.cwd()
        ))
        .toEqual([simpleFile, specFile])
    })
    it ('should return list of file paths with custom base path', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.normalizeFiles(
            ['/test/src/simple.js', 'test/specs/nutra.js'],
            '/root/'
        ))
        .toEqual(['/root/test/src/simple.js', '/root/test/specs/nutra.js'])
    })
})

describe ('Nutra __private__.expandFiles()', () => {
    const simpleFile = Path.join(process.cwd(), 'test/src/simple.js')
    it ('should return list with full file paths with no duplicates', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const files = nutra.expandFiles([
            Path.join(process.cwd(), './test/src/**/*.js'),
            Path.join(process.cwd(), './test/src/**/*.js')
        ])
        expect(files.filter(file => (file === simpleFile)).length).toBe(1)
    })
})

describe ('Nutra __private__.getPluginOptions()', () => {
    const fakeOptions = Object.assign({}, SimpleNutraConfig, {
            fakeOptions: {
                hello: 'World!'
            }
        })
    const nutra = Nutra(fakeOptions).__private__
    it ('should return an object with the plugin\'s options passed in config', () => {
        expect(nutra.getPluginOptions('nutra-fake'))
        .toEqual(fakeOptions.fakeOptions)
    })
    it ('should return options even if plugin argument has not "nutra" prefix', () => {
        expect(nutra.getPluginOptions('fake'))
        .toEqual(fakeOptions.fakeOptions)
    })
})

describe ('Nutra __private__.getPreprocessors()', () => {
    const nutra = Nutra(SimpleNutraConfig).__private__
    it ('should return an array of preprocessor plugin names', () => {
        expect(nutra.getPreprocessors({
            'test/specs/**/*.js': [ 'nutra-fake1' ],
            'src/**/*.js': [ 'nutra-fake2' ]
        }))
        .toEqual([ 'nutra-fake1', 'nutra-fake2' ])
    })
    it ('should return an array of preprocessor plugin names without duplicates', () => {
        expect(nutra.getPreprocessors({
            'test/specs/**/*.js': [ 'nutra-fake' ],
            'src/**/*.js': [ 'nutra-fake' ]
        }))
        .toEqual([ 'nutra-fake' ])
    })
})

describe ('Nutra __private__.getPreprocessorFilters()', () => {
    it ('should return an object of plugin names with their respective globs', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        expect(nutra.getPreprocessorFilters({
            'test/specs/**/*.js': [ 'nutra-fake1' ],
            'src/**/*.js': [ 'nutra-fake1' ],
            'fake/**/*.js': [ 'nutra-fake2' ],
        }))
        .toEqual({
            'nutra-fake1': [
                Path.join(process.cwd(), 'test/specs/**/*.js'),
                Path.join(process.cwd(), 'src/**/*.js')
            ],
            'nutra-fake2': [ Path.join(process.cwd(), 'fake/**/*.js') ]
        })
    })
    it ('should return an object of plugin names with their absolute patterns', () => {
        const options = Object.assign({
            absolutePaths: true
        }, SimpleNutraConfig)
        const nutra = Nutra(options).__private__
        expect(nutra.getPreprocessorFilters({
            '/root/test/specs/**/*.js': [ 'nutra-fake1' ],
            '/root/src/**/*.js': [ 'nutra-fake1' ],
            '/root/fake/**/*.js': [ 'nutra-fake2' ],
        }))
        .toEqual({
            'nutra-fake1': [
                '/root/test/specs/**/*.js',
                '/root/src/**/*.js'
            ],
            'nutra-fake2': ['/root/fake/**/*.js']
        })
    })
})

describe ('Nutra __private__.requirePlugin()', () => {
    const nutra = Nutra(SimpleNutraConfig).__private__
    it ('should return the constructor for a framework plugin', () => {
        const constructor = nutra.requirePlugin('nutra-plugin', 'framework')
        expect(constructor()).toBe('framework')
    })
    it ('should return the constructor for a preprocessor plugin', () => {
        const constructor = nutra.requirePlugin('nutra-plugin', 'preprocessor')
        expect(constructor()).toBe('preprocessor')
    })
    it ('should return the constructor for a reporter plugin', () => {
        const constructor = nutra.requirePlugin('nutra-plugin', 'reporter')
        expect(constructor()).toBe('reporter')
    })
    it ('should return the constructor for a moduleloader plugin', () => {
        const constructor = nutra.requirePlugin('nutra-plugin', 'moduleloader')
        expect(constructor()).toBe('moduleloader')
    })
})

describe ('Nutra __private__.loadPlugins()', () => {
    const nutra = Nutra(SimpleNutraConfig).__private__
    const requirePlugin = nutra.requirePlugin
    const constructor = () => 'constructor'
    nutra.requirePlugin = () => constructor
    it ('should return a list of plugins with name, constructor, and options', () => {
        const list = nutra.loadPlugins(
            ['nutra-plugin1', 'nutra-plugin2'],
            'framework'
        )
        expect(list).toEqual([{
                name: 'nutra-plugin1',
                constructor: constructor,
                options: {}
            }, {
                name: 'nutra-plugin2',
                constructor: constructor,
                options: {}
            }
        ])
    })
    it ('should return a list of plugins with normalized names', () => {
        const list = nutra.loadPlugins(['plugin1', 'plugin2'], 'framework')
        expect(list).toEqual([{
                name: 'nutra-plugin1',
                constructor: constructor,
                options: {}
            }, {
                name: 'nutra-plugin2',
                constructor: constructor,
                options: {}
            }
        ])
    })
    it ('should throw error if plugin is not found', () => {
        nutra.requirePlugin = requirePlugin
        const invalid = () => nutra.loadPlugins(['nutra-plugin-x'], 'frameworks')
        expect(invalid).toThrowError('Cannot find module \'nutra-plugin-x\'')
    })
})

describe ('Nutra __private__.initPlugins()', () => {
    const nutra = Nutra(SimpleNutraConfig).__private__
    it ('should return undefined if plugins are undefined', () => {
        expect(nutra.initPlugins()).toBe(undefined)
    })
    it ('should return an object with the plugin name and hooks', () => {
        expect(nutra.initPlugins('nutra-plugin', 'framework'))
        .toEqual([{
            name: 'nutra-plugin',
            hooks: { onLoad: null, onExit: null }
        }])
    })
    it ('should initialize multiple plugins', () => {
        expect(nutra.initPlugins(['nutra-plugin', 'nutra-plugin'], 'framework'))
        .toEqual([{
                name: 'nutra-plugin',
                hooks: { onLoad: null, onExit: null }
            }, {
                name: 'nutra-plugin',
                hooks: { onLoad: null, onExit: null }
            }
        ])
    })
    it ('should initialize framework plugins', () => {
        expect(nutra.initPlugins('nutra-plugin', 'framework'))
        .toEqual([{
            name: 'nutra-plugin',
            hooks: { onLoad: null, onExit: null }
        }])
    })
    it ('should initialize reporter plugins', () => {
        expect(nutra.initPlugins('nutra-plugin', 'reporter'))
        .toEqual([{
            name: 'nutra-plugin',
            hooks: { onFrameworkExecution: null, onLoad: null, onExit: null }
        }])
    })
    it ('should initialize preprocessor plugins', () => {
        expect(nutra.initPlugins({
            'test/specs/**/*.js': ['nutra-plugin'],
            'src/**/*.js': ['nutra-plugin']
        }, 'preprocessor'))
        .toEqual([{
            name: 'nutra-plugin',
            hooks: { onFileLoad: null, onLoad: null, onExit: null }
        }])
    })
    it ('should defined filter property, if plugin is a preprocessor', () => {
        nutra.preprocessorFilters = undefined
        nutra.initPlugins({
            'test/specs/**/*.js': ['nutra-plugin'],
            'src/**/*.js': ['nutra-plugin']
        }, 'preprocessor')
        expect(nutra.preprocessorFilters)
        .toEqual({'nutra-plugin': [
            Path.join(process.cwd(), 'test/specs/**/*.js'),
            Path.join(process.cwd(), 'src/**/*.js')
        ]})
    })
    it ('should initialize moduleloader plugins', () => {
        expect(nutra.initPlugins('nutra-plugin', 'moduleloader'))
        .toEqual([{
            name: 'nutra-plugin',
            hooks: { onLoad: null, onExit: null }
        }])
    })
    it ('should initialize default moduleloader plugins if none is specified', () => {
        const nutra = Nutra(SimpleNutraConfig).__private__
        const constructor = () => 'constructor'
        nutra.requirePlugin = () => constructor
        nutra.getPluginHooks = (plugins, type) => {
            expect(plugins).toEqual([{
                name: 'nutra-commonjs',
                constructor: constructor,
                options: {}
            }])
        }
        nutra.initPlugins(undefined, 'moduleloader')
    })
})

describe ('Nutra .start()', () => {
    it ('should trigger the __private__.start() method', () => {
        let nutra = Nutra(SimpleNutraConfig)
        let privateNutra = nutra.__private__
        spyOn(privateNutra, 'start').and.callThrough()
        nutra.start()
        expect(privateNutra.start).toHaveBeenCalled()
    })
})
