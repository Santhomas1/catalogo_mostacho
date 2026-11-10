import test from 'node:test'
import assert from 'node:assert/strict'
import React, { useCallback, useState } from 'react'
import { create, act } from 'react-test-renderer'
import useMobileMenu from '../src/hooks/useMobileMenu.js'
import usePageNavigation from '../src/hooks/usePageNavigation.js'

test('menú móvil controla foco, Escape, scroll y restauración al cambiar a escritorio', async () => {
  const original = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const keyListeners = new Map(), mediaListeners = new Map()
  const background = [{ tagName: 'MAIN', inert: false }, { tagName: 'FOOTER', inert: true }]
  background.forEach(element => { element.classList = { contains: () => false } })
  const doc = {
    body: { style: { overflow: 'auto' } }, activeElement: null,
    querySelector: () => ({ children: background }),
    addEventListener: (type, fn) => keyListeners.set(type, fn),
    removeEventListener: type => keyListeners.delete(type),
  }
  const focusable = () => ({ focus() { doc.activeElement = this } })
  const toggle = focusable(), links = [focusable(), focusable(), focusable()]
  const menu = { querySelectorAll: () => links }
  globalThis.document = doc
  globalThis.window = { matchMedia: () => ({
    addEventListener: (type, fn) => mediaListeners.set(type, fn),
    removeEventListener: type => mediaListeners.delete(type),
  }) }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let setOpen, renderer
  function Probe() {
    const [open, update] = useState(false)
    setOpen = update
    const close = useCallback(() => update(false), [])
    const { menuRef, toggleRef } = useMobileMenu(open, close)
    return React.createElement('div', null,
      React.createElement('button', { ref: toggleRef }),
      open && React.createElement('nav', { ref: menuRef }))
  }
  const key = async (value, shiftKey = false) => {
    let prevented = false
    await act(async () => keyListeners.get('keydown')({ key: value, shiftKey, preventDefault() { prevented = true } }))
    assert.ok(prevented)
  }
  try {
    await act(async () => { renderer = create(React.createElement(Probe), { createNodeMock: node => node.type === 'button' ? toggle : menu }) })
    await act(async () => setOpen(true))
    assert.equal(doc.activeElement, links[0])
    assert.equal(doc.body.style.overflow, 'hidden')
    assert.ok(background.every(element => element.inert))
    await key('Tab', true)
    assert.equal(doc.activeElement, toggle)
    await key('Tab', true)
    assert.equal(doc.activeElement, links[2])
    await key('Tab')
    assert.equal(doc.activeElement, toggle)
    await key('Escape')
    assert.equal(doc.activeElement, toggle)
    assert.equal(doc.body.style.overflow, 'auto')
    assert.deepEqual(background.map(element => element.inert), [false, true])
    assert.equal(keyListeners.size, 0)
    await act(async () => setOpen(true))
    await act(async () => mediaListeners.get('change')({ matches: true }))
    assert.equal(renderer.root.findAllByType('nav').length, 0)
    assert.equal(doc.body.style.overflow, 'auto')
    assert.equal(mediaListeners.size, 0)
  } finally {
    if (renderer) await act(async () => renderer.unmount())
    globalThis.window = original.window
    globalThis.document = original.document
    globalThis.IS_REACT_ACT_ENVIRONMENT = original.act
  }
})

test('navegar desde el menú enfoca la página después de restablecer el fondo', async () => {
  const original = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  let renderer, navigate, updateOpen, scrolls = 0, focused = ''
  const main = { inert: false, focus() { assert.equal(this.inert, false); focused = 'main' } }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.window = { scrollTo() { scrolls++ } }
  globalThis.document = { getElementById: () => main }
  function Probe() {
    const [path, setPath] = useState('/')
    const [open, setOpen] = useState(false)
    navigate = setPath; updateOpen = setOpen
    const close = useCallback(() => setOpen(false), [])
    // Model the same effect order as the menu: closing restores the toggle.
    React.useEffect(() => {
      if (!open) return
      main.inert = true
      return () => { main.inert = false; focused = 'toggle' }
    }, [open])
    usePageNavigation(path, open, close)
    return null
  }
  try {
    await act(async () => { renderer = create(React.createElement(Probe)) })
    assert.equal(scrolls, 1)
    await act(async () => updateOpen(true))
    assert.equal(scrolls, 1, 'Abrir el menú no cambia el desplazamiento de la página')
    await act(async () => navigate('/contacto'))
    assert.equal(main.inert, false)
    assert.equal(focused, 'main')
  } finally {
    if (renderer) await act(async () => renderer.unmount())
    globalThis.window = original.window
    globalThis.document = original.document
    globalThis.IS_REACT_ACT_ENVIRONMENT = original.act
  }
})
