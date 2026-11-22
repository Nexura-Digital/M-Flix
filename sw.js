/* sw.js — Network-First: internet primero (sin caché HTTP), caché si no hay conexión. Videos no se cachean. */
const C='miniflix-v2',A=['./','index.html','styles.css','app.js','db.js','catalogo.json','manifest.json','icon.svg'];
const CORE=/(\/|index\.html|app\.js|db\.js|styles\.css|catalogo\.json|manifest\.json)$/;
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||r.headers.has('range')||u.origin!==location.origin||/\.(mp4|webm|mkv)$/i.test(u.pathname))return;
 e.respondWith(fetch(CORE.test(u.pathname)?new Request(r.url,{cache:'no-store'}):r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res})
 .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))))});
