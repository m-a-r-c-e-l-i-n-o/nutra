'use strict'

import Fs from 'fs'
import Path from 'path'
import Glob from 'glob'
import Minimatch from 'minimatch'
import Helper from 'nutra-helper'
import AppConfig from '../app.config.js'
import { gottaCatchEmAll, gottaReleaseEmAll } from 'gotta-catch-em-all'

const _ = Helper._

class Private {

    constructor(opts) {
        try {
            gottaCatchEmAll()
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
            gottaReleaseEmAll()
        } catch (e) {
            gottaReleaseEmAll()
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
        gottaCatchEmAll()
        const _this = this
        Helper.makeDirectory(this.system.tmpDirectory)
        return _this.runEvents()
        .then(() => {
            _this.systemExit()
            return 0
        }).catch(e => {
            gottaReleaseEmAll()
            setTimeout(() => {
                _this.handleError(e)
            }, 0)
            return 1
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
            const patterns = (
                this.system.patterns.length > 0 ?
                '\n    ' + this.system.patterns.join('\n    ') :
                'None.'
            )
            throw new Error(
                AppConfig.errors.emptyFilesOption.replace(
                    '{{patterns}}',
                    patterns
                )
            )
        }
    }

    getRequiredOptions(opts) {
        if (!_.isObject(opts) || _.isArray(opts)) {
            return null
        }
        const options = Object.assign({
            basePath: ( opts.absolutePaths ? '' : process.cwd() )
        }, opts)
        if (typeof options.configFile !== 'string') {
            return options
        } else {
            let configWrapper
            const configPath = Path.join(options.basePath, options.configFile)
            try {
                configWrapper = require(configPath)
            } catch(e) {
                if (e.code !== 'MODULE_NOT_FOUND') {
                    throw e
                }
                throw new Error(
                    AppConfig.errors.invalidOptionsPath.replace(
                        '{{config-path}}',
                        configPath
                    )
                )
            }
            const config = Helper.cloneObject({
                options: null,
                set: function (options) {
                   this.options = options
                }
            }, 'sealed')
            configWrapper(config)
            return Object.assign({}, config.options, options)
        }
    }

    normalizeFiles(files, basePath) {
        return files.map(
            filename => Path.join(basePath, filename)
        )
    }

    getSystemConstants(opts) {

        const patterns = this.normalizeFiles(opts.files, opts.basePath)
        return Object.freeze({
            opts: opts,
            basePath: opts.basePath,
            absolutePaths: opts.absolutePaths || false,
            patterns: patterns,
            files: this.expandFiles(patterns),
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
        gottaReleaseEmAll(true)
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
                this.preprocessors = this.getPreprocessors(plugins)
                plugins = this.getPreprocessorsPlugins(plugins)
            }
            const pluginHooks = this.getPluginHooks(
                this.loadPlugins(plugins, type),
                this.getEvents(type)
            )
            if (type === 'preprocessor') {
                this.preprocessorsHooks = this.getPreprocessorOnFileLoadHooks(pluginHooks)
            }
            return pluginHooks
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
        const pluginHooks = initializedPlugins.map(plugin => {
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

    getFilePreprocessor(filename) {
        const preprocessor = _(this.preprocessors)
        .filter(plugin => Minimatch(filename, plugin.pattern))
        .map(plugin => plugin.hooks)
        .value()
        // return first item since we don't overlapping preprocessing
        return preprocessor[0] || []
    }

    getPreprocessorOnFileLoadHooks(pluginHooks) {
        const plugins = _(pluginHooks)
        .filter(plugin => {
            return plugin.hooks &&
            plugin.hooks['onFileLoad'] &&
            typeof plugin.hooks['onFileLoad'] === 'function'
        })
        .map(plugin =>
            ({ name: plugin.name, onFileLoad: plugin.hooks.onFileLoad })
        )
        .value()

        return _.keyBy(plugins, 'name')
    }

    runPreprocessorOnFileLoadHooks (source, filename) {
        var hooks = this.getFilePreprocessor(filename)

        if (hooks.length === 0) {
            return source
        }

        var final = hooks.reduce((previous, plugin) => {
            const hook = this.preprocessorsHooks[plugin].onFileLoad
            var result = hook(previous.source, previous.filename, previous.key)
            if (_.isObject(result)) {
                if (typeof result.filename === 'string') {
                    previous.filename = result.filename
                }
                if (typeof result.source === 'string') {
                    previous.source = result.source
                }
                if (typeof result.key === 'string') {
                    previous.key = result.key
                }
            } else if (_.isString(result)) {
                previous.source = result
            }
            return {source: previous.source, filename: previous.filename, key: previous.key}
        }, {source: source, filename: filename, key: Helper.getFileKey(filename)})
        return final.source
    }

    expandFiles (patterns) {
        var expandedFiles = []
        patterns.forEach(pattern => {
            expandedFiles.push.apply(
                expandedFiles,
                Glob.sync(pattern)
            )
        })
        return Array.from(new Set(expandedFiles))
    }

    getPreprocessors (plugins) {
        return _(plugins)
        .map((value, key) => ({
            pattern: Path.join(this.system.basePath, key),
            hooks: value
        }))
        .value()
    }

    getPreprocessorsPlugins(preprocessors) {
        const results = new Set([])
        for (let glob in preprocessors) {
            preprocessors[glob].forEach(preprocessor => {
                results.add(preprocessor)
            })
        }
        return Array.from(results)
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

    handleError(error, warning, fatal) {
        if (typeof error === 'string') {
            error = new Error(error)
        }
        if (warning && !fatal) {
            error.stack = ''
        }
        if (!warning || fatal) {
            try {
                this.systemExit();
            } catch (e) {
                throw e;
            }
            throw error;
        }
        console.warn(error.message);
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
