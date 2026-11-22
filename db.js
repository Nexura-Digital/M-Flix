/* db.js — IndexedDB (copia local del catálogo) + localStorage (progreso por dispositivo) + sync con catalogo.json */
const DB=(()=>{
const S='items',P='mf:prog';let db;
const open=()=>db?Promise.resolve(db):new Promise((ok,no)=>{const r=indexedDB.open('miniflix',1);r.onupgradeneeded=()=>r.result.createObjectStore(S,{keyPath:'id'});r.onsuccess=()=>ok(db=r.result);r.onerror=()=>no(r.error)});
const run=async(m,f)=>{const d=await open();return new Promise((ok,no)=>{const t=d.transaction(S,m),r=f(t.objectStore(S));t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>no(t.error)})};
const prog=()=>{try{return JSON.parse(localStorage.getItem(P))||{}}catch(e){return{}}};
// Lápidas: ids borrados en este dispositivo (evita que la sincronización los reviva)
const tomb=()=>{try{return new Set(JSON.parse(localStorage.getItem("mf:del"))||[])}catch(e){return new Set}},setTomb=s=>localStorage.setItem("mf:del",JSON.stringify([...s]));
// Portada de respaldo generada (SVG embebido)
const art=(t,a,b)=>'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="300" height="450" fill="url(#g)"/><rect x="14" y="14" width="272" height="422" fill="none" stroke="#d4af37" stroke-opacity=".5"/><text x="150" y="230" fill="#f3d06b" font-family="Georgia,serif" font-size="26" text-anchor="middle">${String(t).slice(0,20).replace(/[&<>]/g,'')}</text></svg>`).replace(/'/g,'%27');
return{art,
all:()=>run('readonly',s=>s.getAll()),
put:x=>{const t=tomb();if(t.delete(x.id))setTomb(t);return run('readwrite',s=>s.put(x))},
async del(id){const t=tomb();t.add(id);setTomb(t);return run('readwrite',s=>s.delete(id))},
// Descarga catalogo.json (sin caché) y lo refleja en IndexedDB. Conserva fichas locales (loc) aún no subidas al repo.
async sync(){try{const r=await fetch('./catalogo.json',{cache:'no-store'});if(!r.ok)throw 0;const j=await r.json(),rem=Array.isArray(j)?j:j.items||[],ids=new Set(rem.map(x=>x.id)),cur=await this.all();
 const gone=tomb(),loc=new Set(cur.filter(x=>x.loc).map(x=>x.id));
 await run('readwrite',s=>{cur.forEach(x=>{if(!x.loc&&!ids.has(x.id))s.delete(x.id)});rem.forEach(x=>{if(!loc.has(x.id)&&!gone.has(x.id))s.put(x)})});return true}catch(e){return false}},
getProg:u=>prog()[u],
setProg(u,t,d){const p=prog();p[u]={t,d,u:Date.now()};localStorage.setItem(P,JSON.stringify(p))},
// JSON listo para pegar en catalogo.json
async exportJSON(){return JSON.stringify({items:(await this.all()).map(({loc,...x})=>x)},null,1)}};})();
