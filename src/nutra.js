'use strict'

import Fs from 'fs'
import Path from 'path'
import Glob from 'glob'
import Minimatch from 'minimatch'
import Helper from 'nutra-helper'
import AppConfig from '../app.config.js'

const _ = Helper._

class Private {

    constructor(opts) {
        try {
            const options = this.getRequiredOptions(opts)
            this.validateRequiredOptions(options)
            this.system = this.getSystemConstants(options)
            this.validateFiles(this.system.files)
            this.pluginHooks = {
                preprocessors: this.initPlugins(options.preprocessors, 'preprocessor'),
                frameworks: this.initPlugins(options.frameworks, 'framework'),
                reporters: this.initPlugins(options.reporters, 'reporter'),
                moduleloader: this.initPlugins(options.moduleloader, 'moduleloader')
            }
        } catch (e) {
            this.handleError(e, true, true)
        }
    }

    async runEvents () {
        await this.runHooks('onLoad', 'preprocessors')
        await this.runHooks('onLoad', 'frameworks')
        await this.runHooks('onLoad', 'moduleloader')
        await this.runHooks('onExit', 'moduleloader')
        await this.runHooks('onExit', 'preprocessors')
        await this.runHooks('onLoad', 'reporters')
        await this.runHooks('onExit', 'frameworks')
        await this.runHooks('onExit', 'reporters')
    }

    start () {
        Helper.makeDirectory(this.system.tmpDirectory)
        return this.runEvents()
            .then(this.systemExit.bind(this))
            .catch(e => {
                setTimeout(() => { this.handleError(e) }, 0)
            })
    }

    validateRequiredOptions(opts) {
        if (!_.isObject(opts)) {
            throw new Error(AppConfig.errors.emptyOptions)
        }
        if (!_.isArray(opts.files)) {
            throw new Error(AppConfig.errors.invalidFilesOption)
        }
    }

    validateFiles (files) {
        if (files.length === 0) {
            throw new Error(AppConfig.errors.emptyFilesOption)
        }
    }

    getRequiredOptions(opts) {
        if (!opts || !_.isString(opts)) {
            return opts
        }
        let configWrapper
        try {
            configWrapper = require(Path.join(process.cwd(), opts))
        } catch(e) {
            throw new Error(AppConfig.errors.invalidOptionsPath)
        }
        const config = Helper.cloneObject({
            options: null,
            set: function (opts) {
               this.options = opts
            }
        }, 'sealed')
        configWrapper(config)
        return config.options
    }

    getSystemConstants(opts) {
        return Object.freeze({
            opts: opts,
            files: this.expandFiles(opts.files),
            helper: Helper,
            tmpDirectory: this.makeUniqueTmpFolder(),
            handleError: this.handleError.bind(this),
            defaultModuleloader: 'nutra-commonjs',
            callbacks: {
                onFileSourceLoaded: this.onFileSourceLoaded.bind(this),
                onFrameworkExecution: this.onFrameworkExecution.bind(this)
            }
        })
    }

    getEvents (type) {
        var events
        var commonEvents = {
            onLoad: null,
            onExit: null
        }
        switch(type) {
            case 'preprocessor':
                events = Object.assign({
                    onFileLoad: null
                }, commonEvents)
                break;
            case 'reporter':
                events = Object.assign({
                    onFrameworkExecution: null
                }, commonEvents)
                break;
            case 'framework':
                events = Object.assign({}, commonEvents)
                break;
            case 'moduleloader':
                events = Object.assign({}, commonEvents)
                break;
            default:
                events = Object.assign({}, commonEvents)
        }
        return events
    }

    systemExit () {
        if (this.system && typeof this.system.tmpDirectory === 'string') {
            Helper.removeDirectory(this.system.tmpDirectory)
        }
    }

    runHooks (hookType, pluginType, parameters) {
        var hooks = _.chain(this.pluginHooks[pluginType])
            .filter(plugin => plugin.hooks && plugin.hooks[hookType] ? 1 : 0)
            .map(plugin => plugin.hooks[hookType])
            .filter(hook => typeof hook === 'function' ? 1 : 0)
            .map(hook => hook.apply(null, parameters || []))
            .value()
        return Promise.all(hooks)
    }

    initPlugins (plugins, type) {
        if (type === 'moduleloader' && !_.isString(plugins)) {
            plugins = this.system.defaultModuleloader
        }
        if (plugins !== undefined) {
            if (_.isString(plugins)) {
                plugins = [plugins]
            }
            if (type === 'preprocessor') {
                this.prepocessorFilters = this.getPrepocessorFilters(plugins)
                plugins = this.getPrepocessors(plugins)
            }
            return this.getPluginHooks(
                this.loadPlugins(plugins, type),
                this.getEvents(type)
            )
        }
    }

    loadPlugins (plugins, type) {
        let prefix = 'nutra-'
        try {
            return plugins.map(plugin => {
                if (plugin.startsWith(prefix)) {
                    prefix = ''
                }
                plugin = prefix + plugin
                return {
                    name: plugin,
                    constructor: this.requirePlugin(plugin, type),
                    options: this.getPluginOptions(plugin)
                }
            })
        } catch (e) {
            this.handleError(e)
        }
    }

    requirePlugin (path, type) {
        return require(path)[type]
    }

    getPluginHooks (initializedPlugins, events) {
        var pluginHooks = initializedPlugins.map(plugin => {
            var fishedHooks = Helper.cloneObject(events, 'sealed')
            plugin.constructor(fishedHooks, this.system, plugin.options)
            return {
                name: plugin.name,
                hooks: fishedHooks
            }
        })
        return pluginHooks
    }

    onFileSourceLoaded (source, filename) {
        return this.runPreprocessorOnFileLoadHooks(source, filename)
    }

    onFrameworkExecution (framework) {
        this.runHooks('onFrameworkExecution', 'reporters', [framework])
    }

    getPreprocessorOnFileLoadHooks (filename) {
        return _.chain(this.pluginHooks['preprocessors'])
            .filter(plugin => {
                var globs = this.prepocessorFilters[plugin.name]
                return (
                    plugin.hooks &&
                    plugin.hooks['onFileLoad'] &&
                    typeof plugin.hooks['onFileLoad'] === 'function' &&
                    globs &&
                    this.matchGlobs(globs, filename) ?
                    1 : 0
                )
            })
            .map(plugin => plugin.hooks['onFileLoad'])
            .value()
    }

    runPreprocessorOnFileLoadHooks (source, filename) {
        var hooks = this.getPreprocessorOnFileLoadHooks(filename)

        if (hooks.length === 0) {
            return source
        }

        var final = hooks.reduce((previous, hook) => {
            var result = hook(previous.source, previous.filename)
            if (_.isObject(result)) {
                if (typeof result.filename === 'string') {
                    previous.filename = result.filename
                }
                if (typeof result.source === 'string') {
                    previous.source = result.source
                }
            } else if (_.isString(result)) {
                previous.source = result
            }
            return {source: previous.source, filename: previous.filename}
        }, {source: source, filename: filename})
        return final.source
    }

    matchGlobs (globs, filename) {
        var i = 0
        while (i < globs.length) {
            if (Minimatch(filename, Path.join(process.cwd(), globs[i]))) {
                return true
            }
            i++
        }
        return false
    }

    expandFiles (files) {
        var expandedFiles = []
        files.forEach(pattern => {
            expandedFiles.push.apply(
                expandedFiles,
                Glob.sync(pattern).map(
                    path => Path.join(process.cwd(), path)
                )
            )
        })
        return Array.from(new Set(expandedFiles))
    }

    getPrepocessors (preprocessors) {
        var results = new Set([])
        for (var glob in preprocessors) {
            preprocessors[glob].forEach(preprocessor => {
                results.add(preprocessor)
            })
        }
        return Array.from(results)
    }

    getPrepocessorFilters (preprocessors) {
        var prepocessorFilters = {}
        for (var glob in preprocessors) {
            preprocessors[glob].forEach(preprocessor => {
                if (!prepocessorFilters[preprocessor]) {
                    prepocessorFilters[preprocessor] = []
                }
                prepocessorFilters[preprocessor].push(glob)
            })
        }
        return prepocessorFilters
    }

    getPluginOptions (plugin) {
        var name = (
            plugin.startsWith('nutra-') ?
            plugin.replace('nutra-', '') :
            plugin
        )
        if (_.isObject(this.system.opts[name + 'Options'])) {
            return this.system.opts[name + 'Options']
        }
        return {}
    }

    makeUniqueTmpFolder () {
        const dictionary = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
        let exists, path
        do {
            let text = ''
            for ( var i=0; i < 12; i++ ) {
                text += dictionary.charAt(Math.floor(Math.random() * dictionary.length))
            }
            path = Path.join(AppConfig.tmpDirectory, text)
            exists = true
            try {
                Fs.accessSync(path, Fs.F_OK)
            } catch (e) {
                exists = false
            }
        } while (exists)
        return path
    }

    handleError (error, warning, fatal) {
        if (warning) {
            error.stack = ''
        }
        if (!warning || fatal) {
            try {
                this.systemExit()
            } catch (e) {
                throw e
            }
            throw error
        }
        console.warn(error.message)
    }
}

var Public = {
    start () {
        return this.__private__.start()
    }
}

export default (opts) => {
    var api = Public
    var privateInstance = new Private(opts)
    api.__private__ = privateInstance
    return Helper.cloneObject(api, 'freezed')
}
