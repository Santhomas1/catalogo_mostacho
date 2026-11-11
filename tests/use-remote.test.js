import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mountRemote, act, closeClient } from './react-harness.js'

test('foco reciente no repite lecturas; a los 45 segundos aparece el precio nuevo y desmontar limpia timer y foco', async t => {
 t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 1000 })
 let reads = 0, price = 100
 const view = await mountRemote(async () => { reads++; return { price } }, 45000)
 try {
  assert.equal(reads, 1)
  await act(async () => { view.events.get('focus')() })
  assert.equal(reads, 1)
  price = 250
  await act(async () => { t.mock.timers.tick(45000) })
  assert.equal(view.state().data.price, 250)
  assert.equal(reads, 2)
 } finally { await view.close() }
 assert.equal(view.events.size, 0)
 await act(async () => { t.mock.timers.tick(90000) })
 assert.equal(reads, 2)
})

test('una busqueda cancelada antes de 250 ms no consulta; reintentar conserva recuperacion', async t => {
 t.mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: 1000 })
 let reads = 0
 const cancelled = await mountRemote(async () => { reads++; return [] }, 45000, 250)
 await cancelled.close()
 await act(async () => { t.mock.timers.tick(300) })
 assert.equal(reads, 0)
 let fail = true
 const view = await mountRemote(async () => { reads++; if (fail) throw Error('offline'); return ['ok'] }, 45000, 250)
 try {
  await act(async () => { t.mock.timers.tick(250) })
  assert.ok(view.state().error)
  fail = false
  await act(async () => { view.state().retry() })
  await act(async () => { t.mock.timers.tick(250) })
  assert.deepEqual(view.state().data, ['ok'])
 } finally { await view.close() }
})

after(closeClient)
