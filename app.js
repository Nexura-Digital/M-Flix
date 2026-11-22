/* app.js — render del catálogo, detalle, reproductor e importador */
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let items=[],filter='all',q='',files={},cur=null,pu=null,lastSave=0;
const fmt=s=>{s=Math.floor(s||0);const h=s/3600|0,m=s%3600/60|0;return(h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s%60).padStart(2,'0')};
const units=i=>i.type==='series'?(i.episodes||[]).map(e=>({...e,uid:`${i.id}:${e.s}x${e.e}`,item:i})):[{...i,uid:i.id,item:i}];
const pct=u=>{const p=DB.getProg(u);return p&&p.d?Math.min(100,p.t/p.d*100):0};
const itemPct=i=>Math.max(0,...units(i).map(u=>pct(u.uid)));
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),2800)};
const openM=m=>m.classList.add('open'),closeM=m=>m.classList.remove('open');
const card=(i,n)=>`<div class="card" style="--i:${n}" data-id="${i.id}"><button class="del" data-del="${i.id}" title="Eliminar">🗑</button><div class="pw" data-t="${esc(i.title)}"><img src="${i.cover}" alt="" loading="lazy" onerror="this.remove()"></div><div class="bar"><i style="width:${itemPct(i)}%"></i></div><div class="cap"><b>${esc(i.title)}</b><small>${i.year||''} · ${esc(i.genre)}</small></div></div>`;
const hero=i=>`<section class="hero" style="background-image:linear-gradient(0deg,#0a0a0c,transparent 60%),linear-gradient(90deg,rgba(10,10,12,.9),transparent 75%),url('${i.cover}')"><div><span class="tag">${esc(i.quality)}</span><h1>${esc(i.title)}</h1><p>${esc(i.synopsis)}</p><button class="btn gold" data-play="${i.id}">▶ Reproducir</button> <button class="btn" data-det="${i.id}">Detalles${i.type==='series'?' / Episodios':''}</button></div></section>`;
function render(){
 const list=items.filter(i=>(filter==='all'||i.type===filter)&&(!q||(i.title+' '+i.genre).toLowerCase().includes(q)));
 const f=items.find(i=>i.featured)||items[0];let h='';
 if(q||filter!=='all')h=`<div class="sp"></div><h2>${q?'Resultados':filter==='movie'?'Películas':'Series'}</h2><div class="grid">${list.map(card).join('')||'<p class="mut">Sin resultados.</p>'}</div>`;
 else{if(f)h+=hero(f);
  const cont=list.filter(i=>{const p=itemPct(i);return p>0&&p<97});
  [['Continuar viendo',cont],['Películas',list.filter(i=>i.type==='movie')],['Series',list.filter(i=>i.type==='series')],['Agregados recientemente',[...list].sort((a,b)=>b.added-a.added).slice(0,10)]]
  .forEach(([t,a])=>{if(a.length)h+=`<section><h2>${t}</h2><div class="row">${a.map(card).join('')}</div></section>`})}
 $('#main').innerHTML=h}
async function load(){items=await DB.all();render()}
// ---- Detalle ----
function openDet(id){const i=cur=items.find(x=>x.id===id);
 let h=`<button class="x" data-close>✕</button><div class="dh" style="background-image:linear-gradient(0deg,#121216,transparent),url('${i.cover}')"><h2>${esc(i.title)}</h2><p class="mut">${i.year||''} · ${esc(i.genre)} · <span class="tag">${esc(i.quality)}</span></p></div><p class="syn">${esc(i.synopsis)}</p>`;
 if(i.type==='movie')h+=`<button class="btn gold" data-play="${i.id}">▶ Reproducir</button>`;
 else{const ss=[...new Set((i.episodes||[]).map(e=>e.s))].sort((a,b)=>a-b);
  h+=`<select id="ss">${ss.map(s=>`<option value="${s}">Temporada ${s}</option>`).join('')}</select><div id="eps"></div>`}
 $('#det').innerHTML=h+`<p style="margin-top:14px"><button class="btn dl" data-del="${i.id}">🗑 Eliminar ficha</button></p>`;if(i.type==='series'){eps(ss0());$('#ss').onchange=e=>eps(e.target.value)}openM($('#mDet'))}
const ss0=()=>$('#ss')?.value||1;
function eps(s){const i=cur;$('#eps').innerHTML=units(i).filter(u=>u.s==s).map(u=>{const p=pct(u.uid);return`<div class="ep" data-play="${u.uid}"><div class="pw" data-t="${esc(u.title)}"><img src="${u.thumb||i.cover}" alt="" loading="lazy" onerror="this.remove()"></div><div><b>${u.e}. ${esc(u.title)}</b><br><small>${u.dur} min${p>=97?' · ✓ Visto':p>0?' · En progreso':''}</small><div class="bar"><i style="width:${p}%"></i></div></div></div>`}).join('')}
// ---- Reproductor ----
const v=$('#v'),nextU=()=>{if(!pu)return;const l=units(pu.item);return l[l.findIndex(x=>x.uid===pu.uid)+1]};
const save=()=>{lastSave=Date.now();if(pu&&v.duration)DB.setProg(pu.uid,v.currentTime,v.duration)};
function play(x){const i=items.find(a=>a.id===x.split(':')[0]);if(!i)return;const us=units(i);
 const u=us.find(a=>a.uid===x)||us.find(a=>{const p=pct(a.uid);return p>0&&p<97})||us[0];
 if(!u)return toast('Esta serie aún no tiene episodios.');
 const src=files[u.file]||u.src;
 if(!src)return toast(u.file?'Archivo no vinculado: Agregar → Revincular archivos locales.':'Esta ficha no tiene video: usa Agregar.');
 pu=u;save;v.src=src;$('#pt').textContent=i.title+(i.type==='series'?` · T${u.s}E${u.e}`:'');
 $('#nx').hidden=!nextU();const p=DB.getProg(u.uid),rs=$('#rs');rs.hidden=true;openM($('#mPl'));document.body.classList.add('playing');
 if(p&&p.t>5&&p.d-p.t>10){rs.hidden=false;rs.innerHTML=`<button class="btn gold" id="r1">Reanudar desde ${fmt(p.t)}</button><button class="btn" id="r0">Empezar de cero</button>`;
  $('#r1').onclick=()=>{v.currentTime=p.t;rs.hidden=true;v.play()};$('#r0').onclick=()=>{v.currentTime=0;rs.hidden=true;v.play()}}
 else v.play().catch(()=>{})}
const pp=()=>v.paused?v.play():v.pause(),fs=()=>document.fullscreenElement?document.exitFullscreen():$('#pl').requestFullscreen?.();
function closeP(){save();v.pause();v.removeAttribute('src');v.load();pu=null;closeM($('#mPl'));document.body.classList.remove('playing');if(document.fullscreenElement)document.exitFullscreen();render();if(cur&&$('#mDet').classList.contains('open'))eps(ss0())}
v.ontimeupdate=()=>{$('#seek').value=v.duration?v.currentTime/v.duration*1000:0;$('#tm').textContent=fmt(v.currentTime)+' / '+fmt(v.duration);if(Date.now()-lastSave>3000)save()};
v.onpause=save;v.onplay=()=>$('#pp').textContent='⏸';v.onpause=()=>{$('#pp').textContent='▶';save()};
v.onended=()=>{save();const n=nextU();n&&play(n.uid)};
$('#seek').oninput=e=>v.currentTime=v.duration*e.target.value/1000;
$('#pp').onclick=pp;$('#bk').onclick=()=>v.currentTime-=10;$('#fw').onclick=()=>v.currentTime+=10;$('#fs').onclick=fs;$('#pc').onclick=closeP;$('#v').onclick=pp;
$('#nx').onclick=()=>{save();const n=nextU();n&&play(n.uid)};
document.addEventListener('keydown',e=>{if(!$('#mPl').classList.contains('open')||/TEXTAREA|SELECT/.test(e.target.tagName)||(e.target.tagName==='INPUT'&&e.target.type!=='range'))return;
 const k=e.key;if(k===' '){e.preventDefault();pp()}else if(k==='ArrowRight')v.currentTime+=10;else if(k==='ArrowLeft')v.currentTime-=10;else if(k==='f'||k==='F')fs();else if(k==='Escape')closeP()});
async function delItem(id){const i=items.find(x=>x.id===id);if(!i||!confirm(`¿Eliminar "${i.title}"? Esta acción no se puede deshacer.`))return;await DB.del(id);closeM($('#mDet'));await load();toast('Ficha eliminada')}
// ---- Eventos globales ----
document.addEventListener('click',e=>{const t=e.target.closest('[data-play],[data-det],[data-id],[data-del],[data-close],[data-f]');
 if(e.target.classList.contains('modal')){e.target.id==='mPl'?closeP():closeM(e.target);return}
 if(!t)return;const d=t.dataset;
 if(d.close!==undefined)closeM(t.closest('.modal'));else if(d.play)play(d.play);else if(d.det)openDet(d.det);else if(d.id)openDet(d.id);else if(d.del)delItem(d.del);
 else if(d.f){filter=d.f;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b===t));render()}});
$('#q').oninput=e=>{q=e.target.value.trim().toLowerCase();render()};
$('#bImp').onclick=()=>openM($('#mImp'));
$('#fm').type.onchange=e=>$('#fSer').hidden=e.target.value!=='series';
// ---- Agregar / actualizar ficha (sin duplicados: mismo id o mismo título+tipo) ----
const key=i=>i.title.trim().toLowerCase()+'|'+i.type;
// Portada local reducida a ~500px (JPEG) para que IndexedDB pese poco
const cov=async f=>{const b=await createImageBitmap(f),k=Math.min(1,500/b.width),c=document.createElement('canvas');c.width=b.width*k;c.height=b.height*k;c.getContext('2d').drawImage(b,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.82)};
$('#fm').onsubmit=async e=>{e.preventDefault();const f=e.target,v0=f.vf.files[0],c=f.cf.files[0],t=f.title.value.trim(),u={src:f.src.value.trim(),file:''};
 if(v0){files[v0.name]=URL.createObjectURL(v0);u.file=v0.name}
 let it=items.find(i=>key(i)===t.toLowerCase()+'|'+f.type.value);
 if(!it)it={id:'u'+Date.now(),title:t,type:f.type.value,added:Date.now()};
 it.loc=1;let cover=f.cu.value.trim();if(c)try{cover=await cov(c)}catch(x){}
 Object.assign(it,{year:+f.year.value||it.year||'',genre:f.genre.value||it.genre||'',quality:f.quality.value||it.quality||'Full HD 1080p',synopsis:f.syn.value||it.synopsis||'',cover:cover||it.cover||DB.art(t,'#2a2412','#0a0a0c')});
 if(it.type==='movie'){if(u.file||u.src)Object.assign(it,u)}
 else{const s=+f.s.value||1,n=+f.e.value||(it.episodes||[]).length+1;it.episodes=(it.episodes||[]).filter(x=>!(x.s===s&&x.e===n));it.episodes.push({s,e:n,title:f.et.value||'Episodio '+n,dur:+f.dur.value||45,...u});it.episodes.sort((a,b)=>a.s-b.s||a.e-b.e)}
 await DB.put(it);await load();f.reset();$('#fSer').hidden=true;closeM($('#mImp'));toast('Ficha guardada ✓')};
$('#bEx').onclick=async()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([await DB.exportJSON()],{type:'application/json'}));a.download='catalogo.json';a.click();toast('catalogo.json descargado')};
$('#jIn').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text()),l=Array.isArray(j)?j:j.items||[];
 for(const x of l){const old=items.find(i=>i.id===x.id||key(i)===key(x));if(old)x.id=old.id;x.loc=1;await DB.put(x)}
 await load();toast(`${l.length} ficha(s) importada(s), sin duplicados ✓`)}catch(x){toast('JSON inválido')}e.target.value=''};
// Revincular: empareja por nombre de archivo con las fichas guardadas
$('#rl').onchange=e=>{let n=0;[...e.target.files].forEach(f=>{if(items.some(i=>units(i).some(u=>u.file===f.name))){files[f.name]=URL.createObjectURL(f);n++}});toast(n?`${n} archivo(s) vinculado(s) ✓`:'Ningún nombre coincide con el catálogo');e.target.value=''};
$('#bCp').onclick=async()=>{const j=await DB.exportJSON();try{await navigator.clipboard.writeText(j)}catch(e){const x=document.createElement('textarea');x.value=j;document.body.append(x);x.select();document.execCommand('copy');x.remove()}toast('JSON copiado ✓ Pégalo en catalogo.json de GitHub')};
// ---- Temporada: automático por fecha o manual ----
const TH=()=>{const m=localStorage.getItem('mf:th')||'auto';if(m!=='auto')return m;const d=new Date(),M=d.getMonth()+1,D=d.getDate();return M===12?(D<=26?'navidad':'nyear'):M===1?(D<=2?'nyear':D<=7?'reyes':'normal'):'normal'};
function theme(){const t=TH(),fx=$('#fx');document.documentElement.dataset.theme=t;fx.innerHTML='';if(t==='normal'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const sn=t==='navidad';fx.className=sn?'snow':'spark';
 for(let k=0;k<(sn?26:14);k++){const s=document.createElement('i'),r=Math.random;s.textContent=sn?'❄':'✦';s.style.cssText=`left:${r()*100}%;${sn?'':`top:${r()*90}%;`}--s:${8+r()*10}px;--d:${sn?8+r()*9:2.5+r()*3}s;--w:${-r()*10}s;--x:${r()*60-30|0}px`;fx.append(s)}}
$('#th').value=localStorage.getItem('mf:th')||'auto';$('#th').onchange=e=>{localStorage.setItem('mf:th',e.target.value);theme()};
// ---- Arranque: muestra la copia local y sincroniza con catalogo.json (al abrir, al volver a la app y al recuperar conexión) ----
const syncNow=async()=>{theme();const ok=await DB.sync();await load();if(!ok)toast('Sin conexión: usando catálogo guardado')};
load().then(syncNow);addEventListener('online',syncNow);document.addEventListener('visibilitychange',()=>!document.hidden&&syncNow());
if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{}));
