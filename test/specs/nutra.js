import Fs from 'fs'
import Path from 'path'
import Nutra from '../../src/nutra.js'
import Helper from 'nutra-helper'
import AppConfig from '../../app.config.js'

const Options = {
    files: ['test/src/**/*.js'],
}

describe ('Nutra constructor', () => {
    it ('should be an object.', () => {
        const nutra = Nutra(Options)
        expect(typeof nutra).toBe('object')
    })
    it ('should be an object.', () => {
        const nutra = Nutra(Options)
        expect(typeof nutra).toBe('object')
    })
    it ('should expose private class.', () => {
        const nutra = Nutra(Options)
        expect(typeof nutra.__private__).toBe('object')
    })
    it ('should not be mutable.', () => {
        const nutra = Nutra(Options)
        const mutate = () => {
            nutra.hello = 'world'
        }
        expect(mutate).toThrowError(
            TypeError,
            'Can\'t add property hello, object is not extensible'
        )
    })
    it ('should load config from path', () => {
        const nutra = Nutra('./test/simple.nutra.config.js')
        expect(nutra.__private__.system.opts).toEqual({
            files: ['test/src/**/*.js'],
        })
    })
})

describe ('Nutra __private__.handleError()', () => {
    it ('should catch errors when first parameter is passed', () => {
        const nutra = Nutra(Options)
        expect(() => nutra.__private__.handleError(new Error('Fatal!')))
        .toThrowError('Fatal!')
    })
    it ('should catch warnings when second parameter is passed', () => {
        const nutra = Nutra(Options)
        const consoleWarn = console.warn
        console.warn = function (message) {
           expect(message.startsWith('Warning!')).toBeTruthy()
        }
        nutra.__private__.handleError(new Error('Warning!'), true)
        console.warn = consoleWarn
    })
    it ('should not throw error when second parameter is passed', () => {
        const nutra = Nutra(Options)
        const consoleWarn = console.warn
        console.warn = () => {}
        expect(() => nutra.__private__.handleError(new Error('Warning!'), true))
        .not.toThrowError('Warning!')
        console.warn = consoleWarn
    })
    it ('should throw error with no stack when third parameter is passed', () => {
        const nutra = Nutra(Options)
        expect(() => nutra.__private__.handleError(new Error('Fatal!'), true, true))
        .toThrowError('Fatal!')
        try {
            nutra.__private__.handleError(new Error('Fatal!'), true, true)
        } catch(e) {
            expect(e.stack).toBe('')
        }
    })
})

describe ('Nutra __private__.constructor()', () => {
    let nutra
    beforeEach(() => {
        nutra = Nutra(Options).__private__.constructor
    })
    it ('should throw fatal warning if options argument is not an object', () => {
        expect(() => new nutra()).toThrowError(AppConfig.errors.emptyOptions)
    })
    it ('should throw fatal warning if files options argument is not an array', () => {
        expect(() => new nutra({files: undefined}))
        .toThrowError(AppConfig.errors.invalidFilesOption)
    })
    it ('should throw fatal warning if files options argument is not an array', () => {
        expect(() => new nutra({files: []}))
        .toThrowError(AppConfig.errors.emptyFilesOption)
    })
    it ('should create a temporary directory', () => {
        expect(() => Fs.accessSync(AppConfig.tmpDirectory, Fs.F_OK))
        .not.toThrowError()
    })
    it ('should throw define a "system" propety', () => {
        const instance = new nutra(Options)
        expect(instance.system).toBeDefined()
    })
    it ('should throw define a "pluginHooks" propety', () => {
        const instance = new nutra(Options)
        expect(instance.pluginHooks).toBeDefined()
    })
})

describe ('Nutra __private__.start()', () => {
    it ('should return a promise and fulfill it', (done) => {
        let nutra = Nutra(Options).__private__
        nutra.start().then(result => {
            done()
        })
    })
    it ('should trigger the __private__.runEvents() method', () => {
        let nutra = Nutra(Options).__private__
        spyOn(nutra, 'runEvents').and.callThrough()
        nutra.start()
        expect(nutra.runEvents).toHaveBeenCalled()
    })
})

describe ('Nutra __private__.getSystemConstants()', () => {
    let nutra
    beforeEach(() => {
        nutra = Nutra(Options).__private__
    })
    it ('should return an object with the system constants', () => {
        const system = nutra.getSystemConstants(Options)
        expect(system.opts).toEqual(Options)
        expect(system.files[0].lastIndexOf('/test/src/simple.js'))
        .toEqual(system.files[0].length - 19)
        expect(system.helper).toEqual(Helper)
        expect(system.tmpDirectory.lastIndexOf('/tmp/'))
        .toEqual(system.tmpDirectory.length - 5)
        expect(system.handleError.name)
        .toBe(nutra.handleError.bind(nutra).name)
        expect(system.callbacks.onFileSourceLoaded.name)
        .toBe(nutra.onFileSourceLoaded.bind(nutra).name)
    })
    it ('should return an object that is not be mutable', () => {
        const mutate = () => {
            const system = nutra.getSystemConstants(Options)
            system.files = undefined
        }
        expect(mutate).toThrowError(
            TypeError,
            'Cannot assign to read only property \'files\' of #<Object>'
        )
    })
    it ('should return an object that is not be extendable', () => {
        const extend = () => {
            const system = nutra.getSystemConstants(Options)
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
        let nutra = Nutra(Options).__private__
        nutra.start().then(result => {
            done()
        }).catch(error => {
            done.fail(error)
        })
    })
    it ('should trigger "runHooks" for each plugin event', (done) => {
        let nutra = Nutra(Options).__private__
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
    it ('should return any non-string or empty argument', () => {
        const nutra = Nutra(Options).__private__
        expect(nutra.getRequiredOptions(Options)).toBe(Options)
        expect(nutra.getRequiredOptions(false)).toBe(false)
        expect(nutra.getRequiredOptions(null)).toBe(null)
        expect(nutra.getRequiredOptions('')).toBe('')
        expect(nutra.getRequiredOptions()).toBeUndefined()
    })
    it ('should throw error when the require path is invalid', () => {
        const nutra = Nutra(Options).__private__
        expect(() => nutra.getRequiredOptions('path/to/no/where.js'))
        .toThrowError(AppConfig.errors.invalidOptionsPath)
    })
    it ('should an options object when the path is valid', () => {
        const nutra = Nutra(Options).__private__
        expect(nutra.getRequiredOptions('./test/simple.nutra.config.js'))
        .toEqual(Options)
    })
})

describe ('Nutra __private__.getEvents()', () => {
    const commonEvents = {
        onLoad: null,
        onExit: null,
    }
    it ('should return common events by default', () => {
        const nutra = Nutra(Options).__private__
        expect(nutra.getEvents()).toEqual(commonEvents)
    })
    it ('should return preprocessors events', () => {
        const nutra = Nutra(Options).__private__
        var preprocessorEvents = Object.assign({
            onFileLoad: null
        }, commonEvents)
        expect(nutra.getEvents('preprocessors')).toEqual(preprocessorEvents)
    })
    it ('should return reporters events', () => {
        const nutra = Nutra(Options).__private__
        expect(nutra.getEvents('reporters')).toEqual(commonEvents)
    })
    it ('should return frameworks events', () => {
        const nutra = Nutra(Options).__private__
        expect(nutra.getEvents('frameworks')).toEqual(commonEvents)
    })
    it ('should return moduleloader events', () => {
        const nutra = Nutra(Options).__private__
        expect(nutra.getEvents('moduleloader')).toEqual(commonEvents)
    })
})

describe ('Nutra __private__.systemExit()', () => {
    it ('should delete temporary directory', () => {
        const nutra = Nutra(Options).__private__
        nutra.systemExit()
        expect(() => Fs.accessSync(AppConfig.tmpDirectory, Fs.F_OK))
        .toThrowError()
    })
    it ('should check if temporary directory exits before deletion', () => {
        const nutra = Nutra(Options).__private__
        nutra.system = {}
        nutra.system.tmpDirectory = null
        nutra.systemExit()
        expect(() => Fs.accessSync(AppConfig.tmpDirectory, Fs.F_OK))
        .not.toThrowError()
    })
})

describe ('Nutra __private__.getPluginHooks()', () => {
    it ('should call plugin constructor and pass parameters', () => {
        const nutra = Nutra(Options).__private__
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
        const nutra = Nutra(Options).__private__
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
        const nutra = Nutra(Options).__private__
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
        const nutra = Nutra(Options).__private__
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
        nutra = Nutra(Options).__private__
        nutra.prepocessorFilters = {
            'nutra-fakeprep': ['./test/src/**']
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
        nutra.prepocessorFilters = undefined
        expect(nutra.getPreprocessorOnFileLoadHooks(simpleFile))
        .toEqual([])
    })
})

describe ('Nutra .start()', () => {
    it ('should trigger the __private__.start() method', () => {
        let nutra = Nutra(Options)
        let privateNutra = nutra.__private__
        spyOn(privateNutra, 'start').and.callThrough()
        nutra.start()
        expect(privateNutra.start).toHaveBeenCalled()
    })
})
