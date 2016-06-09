var Mock = require('mock-require')
Mock('exit', () => {})
var Nutra = require('../../src/nutra.js').default

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
})
