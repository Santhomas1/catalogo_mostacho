import test from 'node:test'
import assert from 'node:assert/strict'
import { startReveals } from '../src/lib/reveals.js'

test('las entradas de contenido no ocultan páginas completas y aparecen con cualquier intersección', () => {
  let callback, threshold, scan
  const classes = new Set(), attributes = new Set(), observed = new Set()
  const card = {
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    setAttribute: name => attributes.add(name), removeAttribute: name => attributes.delete(name),
  }
  const browser = {
    IntersectionObserver: class {
      constructor(fn, options) { callback = fn; threshold = options.threshold }
      observe(element) { observed.add(element) }
      unobserve(element) { observed.delete(element) }
      disconnect() { observed.clear() }
    },
    MutationObserver: class { constructor(fn) { scan = fn } observe() {} disconnect() {} },
  }
  const root = { querySelectorAll(selector) {
    assert.ok(!selector.includes('main section'), 'Una sección larga nunca debe quedar oculta')
    return [card]
  } }
  const stop = startReveals(root, browser)
  assert.equal(threshold, 0)
  assert.equal(observed.size, 1)
  callback([{ target: card, isIntersecting: true, intersectionRatio: 0.001 }])
  assert.ok(classes.has('is-visible'))
  assert.equal(observed.size, 0)
  scan()
  assert.equal(observed.size, 0, 'Las actualizaciones no reinician elementos visibles')
  stop()
  assert.equal(attributes.size, 0)
  assert.equal(classes.size, 0)
})

test('sin observador o con movimiento reducido el contenido sigue visible', () => {
  const root = { querySelectorAll() { throw Error('No debe ocultar contenido') } }
  startReveals(root, {})()
  startReveals(root, { IntersectionObserver() {}, matchMedia: () => ({ matches: true }) })()
})
