import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const contents = `
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { create, act } from 'react-test-renderer';
import App from './src/App.jsx';
import AdminPage from './src/admin/AdminPage.jsx';
import { LoginForm, RecoveryForm, PasswordForm } from './src/admin/AuthForms.jsx';
import VariantPanel from './src/admin/VariantPanel.jsx';
import ProductWorkspace from './src/admin/ProductWorkspace.jsx';
import RegistryPanel from './src/admin/RegistryPanel.jsx';
import { supabase } from './src/lib/supabase.js';
export async function closeClient() { await supabase.auth.dispose(); }
import Cart from './src/pages/Cart.jsx';
import ProductCard from './src/components/ProductCard.jsx';
import { CartProvider, useCart } from './src/components/CartProvider.jsx';
export { act };
let ctx; let currentPath;
function Probe() { ctx = useCart(); currentPath = useLocation().pathname; return null; }
function setup(items, options = {}) {
 const memory = new Map([['mostacho-cart-v1', options.stored === undefined ? JSON.stringify(items) : options.stored]]);
 globalThis.IS_REACT_ACT_ENVIRONMENT = true;
 globalThis.window = { location: { origin: 'https://example.com' }, localStorage: { getItem: key => { if (options.readError) throw Error('blocked'); return memory.get(key) || null; }, setItem: (key, value) => { if (options.writeError) throw Error('quota'); memory.set(key, value); }, removeItem: key => memory.delete(key) }, addEventListener() {}, removeEventListener() {}, scrollTo() {} };
 const tags = [];
 globalThis.document = { visibilityState: 'visible', title: '', head: { appendChild(tag) { tags.push(tag); } }, createElement() { return { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } }; }, querySelector(selector) { const match = selector.match(/^meta\[(name|property)="(.+)"\]$/); return match ? tags.find(tag => tag.attributes[match[1]] === match[2]) || null : null; } };
 return memory;
}
export function render(path, items = []) { setup(items); return renderToString(<MemoryRouter initialEntries={[path]}><CartProvider><App /></CartProvider></MemoryRouter>); }
export function renderCard(variants) { return renderToString(<MemoryRouter><ProductCard product={{ name: 'Prueba', slug: 'prueba', category: 'Prueba', variants }} /></MemoryRouter>); }
export async function mountAdmin(client, path = '/admin') {
 setup([]);
 let renderer;
 await act(async () => { renderer = create(<MemoryRouter initialEntries={[path]}><AdminPage client={client} /></MemoryRouter>); });
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
 return { renderer, close: () => act(async () => renderer.unmount()) };
}
export async function mountAuthForm(kind, client) {
 setup([]);
 const Component = { login: LoginForm, recovery: RecoveryForm, password: PasswordForm }[kind];
 let renderer;
 await act(async () => { renderer = create(<MemoryRouter><Component client={client} /></MemoryRouter>); });
 return { renderer, close: () => act(async () => renderer.unmount()) };
}
export async function mountEditor(kind, props) {
 setup([]);
 const Component = { product: ProductWorkspace, variant: VariantPanel, registry: RegistryPanel }[kind];
 let renderer;
 await act(async () => { renderer = create(<MemoryRouter><Component {...props} /></MemoryRouter>); });
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
 return { renderer, close: () => act(async () => renderer.unmount()) };
}
export async function mountApp(path, items, fetcher) {
 const memory = setup(items); globalThis.fetch = fetcher;
 let renderer;
 await act(async () => { renderer = create(<MemoryRouter initialEntries={[path]}><CartProvider><Probe /><App /></CartProvider></MemoryRouter>); });
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
 return { renderer, memory, context: () => ctx, path: () => currentPath, close: () => act(async () => renderer.unmount()) };
}
export async function mountCart(items, fetcher, options = {}) {
 const memory = setup(items, options); globalThis.fetch = fetcher;
 let renderer;
 await act(async () => { renderer = create(<MemoryRouter initialEntries={['/carrito']}><CartProvider><Probe /><Cart /></CartProvider></MemoryRouter>); });
 await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
 return { renderer, memory, context: () => ctx, close: () => act(async () => renderer.unmount()) };
}
`
const result = await build({ stdin: { contents, resolveDir: process.cwd(), loader: 'jsx' }, jsx: 'automatic', bundle: true, packages: 'external', write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env.DEV': 'false', 'import.meta.env.VITE_SUPABASE_URL': '"https://example.invalid"', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '"sb_publishable_test"' }, alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } })
const compiled = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports)
export const { render, renderCard, mountCart, mountApp, mountAdmin, mountAuthForm, mountEditor, act, closeClient } = compiled.exports
