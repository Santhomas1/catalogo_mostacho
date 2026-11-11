// Disposable PostgreSQL (PGlite) harness. Never connects to hosted Supabase.
// Install PGlite in a temporary directory and set PGLITE_MODULE to its entry point.
import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
const modulePath = process.env.PGLITE_MODULE
if (!modulePath) throw Error('Set PGLITE_MODULE to a temporary @electric-sql/pglite module URL')
const { PGlite } = await import(modulePath)
const db = new PGlite()
const productId = '00000000-0000-4000-8000-000000000001'
const userId = '00000000-0000-4000-8000-000000000002'
const full = 'products/' + productId + '/00000000-0000-4000-8000-000000000003.webp'
const thumb = 'products/' + productId + '/00000000-0000-4000-8000-000000000004.webp'
const imageId = '00000000-0000-4000-8000-000000000005'
const role = async (name, uid = '') => db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid}',false); set role ${name};`)
try {
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
 alter table storage.objects enable row level security;
 grant select on storage.objects to anon,authenticated;
 grant insert,update,delete on storage.objects to authenticated;
 `)
 const migrations = (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(n => n.endsWith('.sql')).sort()
 for (const filename of migrations) await db.exec(await readFile(new URL('../supabase/migrations/' + filename, import.meta.url), 'utf8'))
 await db.exec(`
 grant select on all tables in schema public to anon,authenticated;
 grant insert,update,delete on all tables in schema public to authenticated;
 insert into private.correos_administradores(correo) values('admin@example.invalid');
 insert into auth.users(id,email,email_confirmed_at) values('${userId}','admin@example.invalid',now());
 insert into public.categorias(id,nombre,slug) values('${productId}','Prueba','prueba');
 insert into public.productos(id,categoria_id,nombre,slug) values('${productId}','${productId}','Prueba','prueba');
 `)
 await role('authenticated', userId)
 // Only local fixture metadata; this is not an upload integration test.
 await db.query('insert into storage.objects(bucket_id,name) values ($1,$2),($1,$3)', ['productos',full,thumb])
 await db.query('insert into public.imagenes_producto(id,producto_id,storage_path,thumbnail_path,texto_alternativo) values($1,$2,$3,$4,$5)', [imageId,productId,full,thumb,'Vista'])
 assert.equal((await db.query('select name from storage.objects')).rows.length,2)
 assert.equal((await db.query("update storage.objects set metadata='{}' returning name")).rows.length,0)
 assert.equal((await db.query('delete from storage.objects returning name')).rows.length,0)
 await role('anon')
 assert.equal((await db.query('select name from storage.objects')).rows.length,0,'draft images must stay private')
 await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)', ['productos','invalid']))
 await role('authenticated',userId)
 await db.query('update public.productos set publicado=true where id=$1',[productId])
 await role('anon')
 assert.equal((await db.query('select name from storage.objects')).rows.length,2,'published original and thumbnail are readable')
 await role('authenticated',userId)
 await db.query('update public.categorias set activa=false where id=$1',[productId])
 await role('anon')
 assert.equal((await db.query('select name from storage.objects')).rows.length,0,'inactive category hides both files')
 await role('authenticated',userId)
 await db.query('update public.categorias set activa=true where id=$1',[productId])
 await db.query('update public.productos set publicado=false where id=$1',[productId])
 await role('authenticated','00000000-0000-4000-8000-000000000099')
 assert.equal((await db.query('select name from storage.objects')).rows.length,0,'non-admin cannot read drafts')
 await role('authenticated',userId)
 await assert.rejects(db.query('update public.imagenes_producto set thumbnail_path=$1 where id=$2',['products/'+productId+'/00000000-0000-4000-8000-000000000099.webp',imageId]))
 await db.query('delete from public.imagenes_producto where id=$1',[imageId])
 assert.deepEqual((await db.query('select storage_path from public.archivos_pendientes_limpieza order by storage_path')).rows.map(row=>row.storage_path),[full,thumb].sort())
 assert.equal((await db.query('delete from storage.objects returning name')).rows.length,2)
 console.log(JSON.stringify({ ok:true, engine:'disposable PostgreSQL/PGlite', migrations:migrations.length, checks:['DDL and triggers','admin-only writes','draft privacy','published resolutions','inactive category privacy','referenced files immutable','missing thumbnail rejected','both paths queued on delete'], limitation:'Auth and Storage services are stubs; signed HTTP delivery still requires staging verification' }))
} finally { await db.close() }
