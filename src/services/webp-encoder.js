import encode, { init } from '@jsquash/webp/encode.js'
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url'
import simdWasmUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url'

let ready

export async function encodeWebp(imageData) {
  // URLs explícitas: Vite publica los WASM con su hash, también en producción.
  if (!ready) {
    ready = init({ locateFile: path => path.includes('simd') ? simdWasmUrl : wasmUrl })
      .catch(error => { ready = undefined; throw error })
  }
  await ready
  const bytes = await encode(imageData, { quality: 82 })
  return new Blob([bytes], { type: 'image/webp' })
}
