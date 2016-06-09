'use strict'

import Fs from 'fs'
import Path from 'path'
import Glob from 'glob'
import Minimatch from 'minimatch'
import Exit from 'exit'
import Helper from 'nutra-helper'

const _ = Helper._

class Private {

    constructor(opts) {
        this.system = null
        this.pluginHooks = null
        this.prepocessorFilters = null
        this.init(opts)
        return this
    }

    async init (opts) {
        try {
            if (!_.isObject(opts)) {
                throw new Error(`
                    Please provide a valid configuration.
                    Value received is not an object: ${opts}
                `)
            }
            if (!_.isArray(opts.files)) {
                throw new Error(`
                    Please provide a valid file configuration.
                    Value received is not an array: ${opts.files}
                `)
            }
            var files = this.expandFiles(opts.files)
            if (files.length === 0) {
                throw new Error(`
                    Please provide a valid file configuration.
                    The glob patterns did not amount to any files: ${opts.files}
                    Are the patterns relative to the current working directory?
                `)
            }
        } catch (e) {this.handleError(e, true, true)}

        try {
            this.system = {
                opts: opts,
                files: files,
                helper: Helper,
                tmpDirectory: Path.join(__dirname, '../tmp/'),
                handleError: this.handleError.bind(this),
                callbacks: Object.freeze({
                    onFileSourceLoaded: this.onFileSourceLoaded.bind(this)
                })
            }
            Helper.makeDirectory(this.system.tmpDirectory)
            this.pluginHooks = {
                preprocessors: this.initPreprocessors(opts.preprocessors),
                frameworks: this.initFrameworks(opts.frameworks),
                reporters: this.initReporters(opts.reporters),
                moduleloader: this.initModuleloader(opts.moduleloader)
            }
            await this.runHooks('onLoad', 'preprocessors')
            await this.runHooks('onLoad', 'frameworks')
            await this.runHooks('onLoad', 'moduleloader')
            await this.runHooks('onExit', 'moduleloader')
            await this.runHooks('onExit', 'preprocessors')
            await this.runHooks('onExit', 'frameworks')
            await this.runHooks('onLoad', 'reporters')
            await this.runHooks('onExit', 'reporters')
            this.systemExit()
        } catch (e) {this.handleError(e)}
    }

    getEvents (type) {
        var events
        var commonEvents = {
            onLoad: null,
            onExit: null
        }
        switch(type) {
            case 'preprocessors':
                events = Object.assign({
                    onFileLoad: null
                }, commonEvents)
                break;
            case 'reporters':
                events = Object.assign({}, commonEvents)
                break;
            case 'frameworks':
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
        Helper.removeDirectory(this.system.tmpDirectory)
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

    initModuleloader (moduleloader) {
        moduleloader = (
            typeof moduleloader === 'string' ? moduleloader : 'nutra-commonjs'
        )
        return this.getPluginHooks(
            this.initPlugins([moduleloader], 'moduleloader'),
            this.getEvents('moduleloader')
        )
    }

    initPreprocessors (preprocessors) {
        if (preprocessors !== undefined) {
            var plugins = this.getPrepocessors(preprocessors)
            this.prepocessorFilters = this.getPrepocessorFilters(preprocessors)
            return this.getPluginHooks(
                this.initPlugins(plugins, 'preprocessor'),
                this.getEvents('preprocessors')
            )
        }
    }

    initFrameworks (frameworks) {
        if (frameworks !== undefined) {
            return this.getPluginHooks(
                this.initPlugins(frameworks, 'framework'),
                this.getEvents('frameworks')
            )
        }
    }

    initReporters (reporters) {
        if (reporters !== undefined) {
            return this.getPluginHooks(
                this.initPlugins(reporters, 'reporter'),
                this.getEvents('reporters')
            )
        }
    }

    getPluginHooks (initializedPlugins, events) {
        var pluginHooks = initializedPlugins.map(plugin => {
            var fishedHooks = Helper.cloneObject(events, true)
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

    runPreprocessorOnFileLoadHooks (source, filename) {
        var hooks = _.chain(this.pluginHooks['preprocessors'])
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

    initPlugins (plugins, type) {
        var initializedPlugins = plugins.map(plugin => {
            return {
                name: plugin,
                constructor: this.initPlugin(plugin, type),
                options: this.getPluginOptions(plugin)
            }
        })
        return initializedPlugins
    }

    initPlugin (plugin, type) {
        var prefix = 'nutra-'
        if (plugin.startsWith(prefix)) prefix = ''
        var path = prefix + plugin
        try {
            return require(path)[type]
        } catch (e) {
            this.handleError(e)
        }
    }

    handleError (err, warning, exit) {
        if (warning) {
            console.warn(err.message)
        } else {
            console.error(err.stack)
        }
        if (!warning || exit) {
            this.systemExit()
            Exit(1)
        }
    }
}

var Public = {}

export default (opts) => {
    var api = Public
    var privateInstance = new Private(opts)
    api.__private__ = privateInstance
    return Helper.cloneObject(api, 'freezed')
}
