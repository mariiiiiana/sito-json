const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e};
const NS='http://www.w3.org/2000/svg',sv=(t,a={})=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let D,items,byId,edges,allTags;

// La configurazione grafica appartiene al sito, non al file dei dati.
const config={title:'God in the Machine',subtitle:'una ricerca per connessioni',
  landingWords:['God in the','Machine'],overlays:[]};
async function load(){
  if(location.protocol==='file:')return JSON.parse($('#data').textContent);
  const response=await fetch('data.json');
  if(!response.ok)throw new Error(`Impossibile caricare data.json (${response.status})`);
  const data=await response.json();
  if(!Array.isArray(data.items)||!data.items.length)throw new Error('data.json deve contenere items con almeno un elemento.');
  return data;
}
function titleOf(it){
  return (it.description||'').split(/\.\s/)[0]||it.subcategory||it.category||`Elemento ${it.id}`;
}
const dateOf=it=>it.date||'Data non indicata';
// Serve solo al posizionamento sulla timeline: la data visualizzata resta originale.
function yearOf(it){
  const value=String(it.date||'').trim();
  const bc=/a\.\s*c\./i.test(value);
  const century=value.match(/^([IVXLCDM]+)(?:[–-]([IVXLCDM]+))?\s+sec/i);
  if(century){
    const roman=s=>{const n={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};return [...s].reduce((v,c,i)=>v+(n[c]<n[s[i+1]]?-n[c]:n[c]),0)};
    const c=(roman(century[1])+(century[2]?roman(century[2]):roman(century[1])))/2;
    return (bc?-1:1)*(c*100-50);
  }
  const match=value.match(/^-?\d{1,4}(?:[–-]\d{1,4})?/);
  if(!match)return null;
  const range=match[0].match(/^(\d+)[–-](\d+)$/);
  const year=range?(Number(range[1])+Number(range[2]))/2:Number(match[0]);
  return bc?-Math.abs(year):year;
}

/* Segnaposto editoriali: indicare src nei dati con il percorso di un'immagine. */
function imgOf(it){
  if(it.src)return it.src;
  const n=String(items.indexOf(it)+1).padStart(2,'0');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 290"><rect width="400" height="290" fill="#ebebeb"/><path d="M0 0H400V290H0Z" fill="none" stroke="#b8b8b8" stroke-width="2"/><path d="M0 0L400 290M400 0L0 290" stroke="#c5c5c5" stroke-width="1"/><g fill="#777" font-family="Helvetica,Arial,sans-serif" text-anchor="middle"><text x="200" y="137" font-size="19" letter-spacing="3">IMMAGINE ${n}</text><text x="200" y="162" font-size="11">SEGNAPOSTO</text></g></svg>`;
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
function rel(a,b){
  const shared=a.tags.filter(t=>b.tags.includes(t));
  const link=(a.links||[]).includes(b.id)||(b.links||[]).includes(a.id);
  return {shared,link,w:shared.length+(link?2:0)};
}
function neighbors(id){
  return edges.filter(e=>e.a===id||e.b===id).map(e=>{
    const it=byId[e.a===id?e.b:e.a];
    return {it,...e,...rel(byId[id],it)};
  }).sort((x,y)=>y.w-x.w);
}
const yearTxt=y=>y<0?Math.abs(y)+' a.C.':String(y);

/* ---------- pannello ---------- */
function openPanel(id,go){
  const it=byId[id],p=$('#panel');
  p.innerHTML=`<button class="x" aria-label="Chiudi">×</button>
    <img class="big" src="${esc(imgOf(it))}" alt="">
    <h2>${esc(titleOf(it))}</h2><div class="yr2">${esc(dateOf(it))}</div>
    <p>${esc([it.category,it.subcategory].filter(Boolean).join(" · "))}</p>
    <p>${esc(it.description)}</p>
    <h3>Tag</h3><div class="chips">${it.tags.map(t=>`<button class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <h3>Connessioni</h3>${neighbors(id).map(n=>`<button class="rel" data-id="${n.it.id}">${esc(titleOf(n.it))}<small>${[...(n.link?['collegamento diretto']:[]),...n.shared].map(esc).join(', ')}</small></button>`).join('')||'<small>Nessuna connessione.</small>'}`;
  p.classList.add('on');
  $('#esplora').classList.toggle('with-panel',location.hash.startsWith('#/esplora'));
  $('#timeline').classList.toggle('with-panel',location.hash.startsWith('#/timeline'));
  $('.x',p).onclick=()=>{closePanel();go(null)};
  $$('.rel',p).forEach(b=>b.onclick=()=>go(b.dataset.id));
  $$('.chip',p).forEach(b=>b.onclick=()=>{location.hash='#/esplora';setTimeout(()=>setTag(b.dataset.t),30)});
}
function closePanel(){
  $('#panel').classList.remove('on');
  $('#esplora').classList.remove('with-panel');
  $('#timeline').classList.remove('with-panel');
}

/* ---------- landing: collage editoriale, responsive ---------- */
let seed=0;
const positions=[
  [1,0,15,7],[18,0,12,7],[33,0,15,7],[52,0,10,7],[66,0,14,7],[84,0,11,7],
  [35,12,18,12],[58,12,12,12],[73,13,13,11],[88,12,10,12],
  [7,30,15,11],[27,31,8,10],[75,29,19,13],
  [4,45,10,14],[17,47,14,10],[34,45,14,14],[82,47,11,11],
  [47,61,10,12],[60,62,10,13],[73,60,17,13],[92,62,7,12],
  [8,77,14,13],[27,78,10,10],[42,76,15,12]
];
// Ulteriori riquadri: riutilizzano i progetti esistenti senza inventare nuovi contenuti.
// La prima posizione di ogni progetto resta quella usata dalla rete di collegamenti.
const extraPositions=[
  [13,8,10,8],[26,8,7,8],[50,8,9,9],[65,8,8,8],[80,7,7,8],
  [2,23,10,9],[43,25,9,9],[90,25,9,9],
  [2,39,9,8],[61,40,10,10],[89,42,9,9],
  [16,57,9,9],[32,59,9,9],[86,57,10,9],
  [3,72,10,9],[57,73,10,9],[84,76,13,10],
  [3,91,12,9],[20,92,12,9],[37,91,10,9],[53,90,15,10],[73,91,13,9],[89,89,10,9]
];
function randomLandingPlacements() {
  const shuffle = list => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  // Distribuisce casualmente anche le prime immagini tra gli slot disponibili.
  const slots = shuffle([
  ...shuffle(positions).slice(
    0,
    Math.min(items.length, positions.length)
  ),
  ...extraPositions
]);

// Sceglie un campione casuale, fino ai 47 spazi disponibili.
const sample = shuffle(items).slice(0, slots.length);

const placed = [];
const seen = new Set();
let pool = [];

  for (const slot of slots.slice(0, sample.length)) {
    // Ogni immagine viene usata una volta prima di iniziare a ripeterle.
    if (!pool.length) pool = shuffle(sample);
    const center = pos => [
      pos[0] + pos[2] / 2,
      pos[1] + pos[3] / 2
    ];

    const [x, y] = center(slot);

    const nearby = placed
      .map(entry => {
        const [px, py] = center(entry.pos);
        return {
          ...entry,
          distance: Math.hypot(x - px, y - py)
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    const ranked = pool.map(it => {
      const year = yearOf(it);
      let penalty = 0;

      for (const neighbor of nearby) {
        const otherYear = yearOf(neighbor.it);
        const proximity = 1 / (1 + neighbor.distance);

        // Scoraggia la ripetizione della stessa immagine nelle vicinanze.
        if (it.id === neighbor.it.id) {
          penalty += 100 * proximity;
        }

        // Scoraggia eventi vicini nel tempo nelle posizioni vicine.
        if (year !== null && otherYear !== null) {
          const gap = Math.abs(year - otherYear);
          penalty += 10 * proximity / (1 + gap / 200);
        }
      }

      return { it, score: penalty + Math.random() * 0.03 };
    });

    ranked.sort((a, b) => a.score - b.score);
    const it = ranked[0].it;
    pool.splice(pool.indexOf(it), 1);

    placed.push({
      it,
      pos: [...slot],
      repeat: seen.has(it.id)
    });

    seen.add(it.id);
  }

  return placed;
}
function buildLanding(){
  const f=$('#flow'); f.innerHTML='<svg id="lines" aria-hidden="true"></svg><div id="over" aria-hidden="true"></div>';
  const words=(config.landingWords||['God in the','Machine']).join(' ').trim().split(/\s+/);
  // Il titolo torna nella seconda meta del collage, per accompagnare lo scroll.
  // Usa le righe definite in landingWords, senza cambiare la configurazione dell'utente.
  const lines=(config.landingWords||['God in the','Machine']).filter(Boolean);
  const headingLines=lines.length ? lines : ['God in the','Machine'];
  const titlePositions=[[5,20,15],[13,29,19],[5,68,15],[13,77,19]];
  titlePositions.forEach(([left,top,size],i)=>{
    const h=el('h1','collage-word'+(i>=2?' is-reprise':''),esc(headingLines[i%headingLines.length]));
    h.style.left=left+'%';h.style.top=top+'%';
    h.style.fontSize=`clamp(34px, ${size}cqw, 240px)`;
    f.append(h);
    // Impedisce alle parole molto lunghe di uscire dal canvas a ogni viewport.
    requestAnimationFrame(()=>{
      const available=f.clientWidth*(1-left/100)-4;
      if(h.scrollWidth>available){
        const current=parseFloat(getComputedStyle(h).fontSize);
        h.style.fontSize=Math.max(20,current*available/h.scrollWidth)+'px';
      }
    });
  });
 const placements = randomLandingPlacements();
  placements.forEach(({it,pos,repeat},i)=>{
    const extra=0;
    const g=el('figure',repeat?'collage-figure collage-repeat':'collage-figure');
    g.style.left=(pos[0]+extra*2)+'%';
    g.style.top=(pos[1]+extra*15)+'%';
    g.style.width=pos[2]+'%';
    g.style.setProperty('--ratio',String(pos[3]/pos[2]));
    const im=new Image(); im.src=imgOf(it);im.alt=it.src?titleOf(it):`Segnaposto per ${titleOf(it)}`;
    im.loading=i>11?'lazy':'eager';
    g.append(im,el('figcaption','',esc(titleOf(it))));
    g.dataset.id=it.id;g.tabIndex=0;g.setAttribute('role','link');
    g.setAttribute('aria-label',`Apri ${titleOf(it)}`);
    g.onclick=()=>location.hash='#/esplora/'+it.id;
    g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();g.click()}};
    f.append(g);
  });
  (config.overlays||[]).forEach(o=>{
    const im=new Image();im.src=o.src;im.alt='';im.style.cssText=`left:${o.x}%;width:${o.w}%`;
    im.dataset.y=o.y;im.dataset.s=o.s??.35;im.onload=parallax;$('#over').append(im);
  });
  requestAnimationFrame(() => {
  const margin = 16;

  const titleAreas = $$('.collage-word', f).map(title => {
    const r = title.getBoundingClientRect();

    return {
      left: r.left - margin,
      right: r.right + margin,
      top: r.top - margin,
      bottom: r.bottom + margin
    };
  });

  $$('.collage-figure', f).forEach(figure => {
    const r = figure.getBoundingClientRect();

    const overlapsTitle = titleAreas.some(area =>
      r.left < area.right &&
      r.right > area.left &&
      r.top < area.bottom &&
      r.bottom > area.top
    );

    if (overlapsTitle) figure.remove();
  });

  drawLines();
  parallax();
});
}
function parallax(){
  const o=$('#over');if(!o)return;
  const vh=innerHeight,y=scrollY;
  $$('img',o).forEach(im=>{
    const h=im.offsetHeight||200,per=vh+h;
    const ty=(((+im.dataset.y/100*vh-y*+im.dataset.s)%per)+per)%per-h;
    im.style.transform=`translateY(${ty}px)`;
  });
}
addEventListener('scroll',()=>{if(document.body.classList.contains('landing'))parallax()},{passive:true});
function drawLines(){
  const f=$('#flow'),s=$('#lines');if(!s||!f.clientHeight)return;
  s.innerHTML='';
  s.setAttribute('viewBox',`0 0 ${f.clientWidth} ${f.clientHeight}`);
  const fr=f.getBoundingClientRect(),figs=$$('.collage-figure:not(.collage-repeat)',f);
  const map=new Map(figs.map(g=>[g.dataset.id,g]));
  const point=g=>{const r=$('img',g).getBoundingClientRect();return [r.left+r.width/2-fr.left,r.top+r.height/2-fr.top]};
  // Dai priorita ai collegamenti vicini, leggibili, evitando una rete troppo affollata.
  // Considera tutte le coppie con almeno un tag condiviso.
const candidates = edges.map(e => {
  const a = map.get(e.a);
  const b = map.get(e.b);
  if (!a || !b) return null;

  return {
    p: point(a),
    q: point(b),
    e,
    random: Math.random()
  };
})
.filter(Boolean)
.sort((a, b) => a.random - b.random);
  // Filtra per distanza e ordina.
  const filtered = candidates.filter(x=>x.d<f.clientWidth*.54).sort((a,b)=>a.d-b.d);
  const used=new Map();let count=0;
  for(const {p,q,e} of candidates){
    if(count>=15)break;
    if((used.get(e.a)||0)>=2||(used.get(e.b)||0)>=2)continue;
    used.set(e.a,(used.get(e.a)||0)+1);used.set(e.b,(used.get(e.b)||0)+1);
    const line=sv('line',{x1:p[0],y1:p[1],x2:q[0],y2:q[1],class:'landing-edge'});
    s.append(line);
    [p,q].forEach(c=>s.append(sv('circle',{cx:c[0],cy:c[1],r:Math.max(3,f.clientWidth*.004),class:'landing-dot'})));
    count++;
  }
}
$('#up').onclick=()=>scrollTo({top:0,behavior:'smooth'});
$('#again').onclick=()=>{seed++;const n=seed%positions.length;const moved=positions.splice(0,n);positions.push(...moved);buildLanding();};

/* ---------- esplora ---------- */
const X={nodes:[],focus:null,tag:null,ready:false,raf:0,px:0,py:0,W:0,H:0,WW:0,HH:0,drag:null,moved:false};
// Rete alleggerita: ogni elemento mantiene visibili solo i suoi KEEP collegamenti più forti.
// In focus si mostrano al massimo RING connessioni (le più forti); l'elenco completo resta nel pannello.
const KEEP=2,RING=10;
function pruneEdges(){
  const best={};
  edges.forEach(e=>{[e.a,e.b].forEach(id=>(best[id]=best[id]||[]).push(e))});
  const keep=new Set();
  for(const id in best)best[id].sort((x,y)=>y.w-x.w).slice(0,KEEP).forEach(e=>keep.add(e));
  return keep;
}
function initExplore(){
  const st=$('#stage'),W=st.clientWidth,H=st.clientHeight;
  // La mappa è più grande della finestra: si esplora trascinandola (grab) o con la rotella/trackpad.
  const WW=Math.round(W*1.6),HH=Math.round(H*1.6);
  let wd=$('#world');if(!wd){wd=el('div');wd.id='world';st.append(wd);wd.append($('#edges'))}
  wd.style.width=WW+'px';wd.style.height=HH+'px';
  Object.assign(X,{world:wd,W,H,WW,HH});
  $('#tags').innerHTML='';
  allTags.forEach(t=>{const c=el('button','chip',esc(t));c.dataset.t=t;c.onclick=()=>setTag(X.tag===t?null:t);$('#tags').append(c)});
  $$('.n',st).forEach(n=>n.remove());
  const deg={};edges.forEach(e=>{deg[e.a]=(deg[e.a]||0)+e.w;deg[e.b]=(deg[e.b]||0)+e.w});
  const keep=pruneEdges(),pe=edges.filter(e=>keep.has(e));
  const base=Math.max(72,Math.min(140,Math.sqrt(W*H*.2/items.length/.75)));
  const maxDeg=Math.max(1,...Object.values(deg));
  X.nodes=items.map((it,i)=>{
    const s=Math.round(base*(.85+.35*(deg[it.id]||0)/maxDeg));
    const b=el('button','n');b.innerHTML=`<img src="${esc(imgOf(it))}" alt="" draggable="false"><span class="cap">${esc(titleOf(it))}</span>`;
    b.style.width=s+'px';b.style.height=s*.75+'px';b.setAttribute('aria-label',titleOf(it));
    b.onclick=ev=>{ev.stopPropagation();location.hash='#/esplora/'+it.id};
    wd.append(b);
    return {id:it.id,el:b,s,k:1,ck:1,x:WW/2+Math.cos(i*2.4)*WW/3,y:HH/2+Math.sin(i*2.4)*HH/3,vx:0,vy:0};
  });
  const N=X.nodes,idx={};N.forEach(n=>idx[n.id]=n);
  for(let k=0;k<250;k++){
    for(let i=0;i<N.length;i++)for(let j=i+1;j<N.length;j++){
      let dx=N[i].x-N[j].x,dy=N[i].y-N[j].y,d2=dx*dx+dy*dy+.1,d=Math.sqrt(d2),f=30000/d2;
      N[i].vx+=dx/d*f;N[i].vy+=dy/d*f;N[j].vx-=dx/d*f;N[j].vy-=dy/d*f;
      const ox=(N[i].s+N[j].s)/2+16-Math.abs(dx),oy=(N[i].s+N[j].s)*.375+26-Math.abs(dy);
      if(ox>0&&oy>0){
        if(ox<oy){const p=ox/2*(dx<0?-1:1);N[i].x+=p;N[j].x-=p}
        else{const p=oy/2*(dy<0?-1:1);N[i].y+=p;N[j].y-=p}
      }
    }
    pe.forEach(e=>{
      const a=idx[e.a],b=idx[e.b],dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)+.1,f=(d-200/(1+e.w*.35))*.008*e.w;
      a.vx+=dx/d*f;a.vy+=dy/d*f;b.vx-=dx/d*f;b.vy-=dy/d*f;
    });
    N.forEach(n=>{
      n.vx+=(WW/2-n.x)*.003;n.vy+=(HH/2-n.y)*.003;
      n.x=Math.max(n.s/2+24,Math.min(WW-n.s/2-24,n.x+n.vx*.5));
      n.y=Math.max(70+n.s*.375,Math.min(HH-n.s*.375-34,n.y+n.vy*.5));
      n.vx*=.6;n.vy*=.6;
    });
  }
  N.forEach(n=>{n.bx=n.tx=n.cx=n.x;n.by=n.ty=n.cy=n.y});
  // Solo le linee "base" esistono sempre; per il focus basta un piccolo gruppo di linee riutilizzabili.
  const E=$('#edges');E.innerHTML='';
  X.base=pe.map(e=>{const l=sv('line',{class:'edge base','stroke-width':1.2});E.append(l);return {e,l}});
  X.pool=Array.from({length:RING},()=>{const l=sv('line',{class:'edge on','stroke-width':1.2});l.style.display='none';E.append(l);return {l,a:null,b:null}});
  setPan((W-WW)/2,(H-HH)/2);
  X.idx=idx;X.ready=true;layoutFocus();
}
function layoutFocus(){
  const st=$('#stage'),W=st.clientWidth,H=st.clientHeight,f=X.focus,N=X.nodes;
  const nb=f?neighbors(f).slice(0,RING):[],nbIds=new Set(nb.map(n=>n.it.id));
  N.forEach(n=>{n.tx=n.bx;n.ty=n.by;n.k=1});
  if(f){
    const c=X.idx[f];c.tx=(W+(innerWidth>900?340:0))/2-X.px;c.ty=H/2-X.py;// L'immagine selezionata diventa grande (circa il 38% dell'altezza), i vicini un po' più grandi del normale.
    c.k=Math.max(1.8,Math.min(380,H*.38/.75,(W-340)*.3)/c.s);
    const R=Math.min((W-340)/2.2,H/2.3);
    nb.forEach((m,i)=>{const n=X.idx[m.it.id],a=i/nb.length*Math.PI*2-Math.PI/2;n.tx=c.tx+Math.cos(a)*R;n.ty=c.ty+Math.sin(a)*R;n.k=1.25});
  }
  N.forEach(n=>{
    const on=!f&&!X.tag||(f&&(n.id===f||nbIds.has(n.id)))||(X.tag&&!f&&byId[n.id].tags.includes(X.tag));
    n.el.classList.toggle('dim',!on);n.el.classList.toggle('sel',n.id===f);n.el.classList.toggle('nb',nbIds.has(n.id));
  });
  X.base.forEach(o=>{
    const {a,b}=o.e;
    o.l.classList.toggle('on',!f&&!!X.tag&&byId[a].tags.includes(X.tag)&&byId[b].tags.includes(X.tag));
  });
  X.pool.forEach((o,i)=>{const m=nb[i];if(m){o.a=f;o.b=m.it.id;o.l.style.display=''}else{o.a=o.b=null;o.l.style.display='none'}});
  $('#edges').classList.toggle('focus',!!(f||X.tag));
  $$('#tags .chip').forEach(c=>c.classList.toggle('on',c.dataset.t===X.tag));
  loop();
}
// Il ciclo di animazione parte solo quando qualcosa si muove e si ferma appena tutto è a riposo.
function loop(){
  cancelAnimationFrame(X.raf);
  const step=()=>{
    if(!$('#esplora').classList.contains('on'))return;
    let moving=false,any=false;
    X.nodes.forEach(n=>{
      const dx=n.tx-n.cx,dy=n.ty-n.cy,dk=n.k-n.ck;
      if(Math.abs(dx)+Math.abs(dy)>.3||Math.abs(dk)>.003){n.cx+=dx*.14;n.cy+=dy*.14;n.ck+=dk*.14;moving=true;n.rest=false}
      else if(!n.rest){n.cx=n.tx;n.cy=n.ty;n.ck=n.k;n.rest=true}
      else return;               // nodo fermo: nessuna scrittura sul DOM
      any=true;
      n.el.style.transform=`translate(${n.cx}px,${n.cy}px) translate(-50%,-50%) scale(${n.ck})`;
      n.el.style.setProperty('--ik',1/n.ck);
    });
    // Durante il movimento i nodi sono su un livello GPU; a riposo vengono ridisegnati nitidi.
    $('#stage').classList.toggle('anim',moving);
    if(any){
      const put=(l,a,b)=>{l.setAttribute('x1',a.cx);l.setAttribute('y1',a.cy);l.setAttribute('x2',b.cx);l.setAttribute('y2',b.cy)};
      X.base.forEach(o=>put(o.l,X.idx[o.e.a],X.idx[o.e.b]));
      X.pool.forEach(o=>{if(o.a)put(o.l,X.idx[o.a],X.idx[o.b])});
    }
    if(moving)X.raf=requestAnimationFrame(step);
  };
  step();
}
function setTag(t){X.tag=t;X.focus=null;closePanel();if(X.ready)layoutFocus()}
function setFocus(id){
  X.focus=id||null;if(id)X.tag=null;
  if(X.ready)layoutFocus();
  id?openPanel(id,g=>location.hash=g?'#/esplora/'+g:'#/esplora'):closePanel();
}
$('#stage').onclick=()=>{if(X.focus&&!X.moved)location.hash='#/esplora'};
function setPan(x,y){
  if(!X.world)return;
  X.px=Math.max(Math.min(0,X.W-X.WW),Math.min(0,x));
  X.py=Math.max(Math.min(0,X.H-X.HH),Math.min(0,y));
  X.world.style.transform=`translate(${X.px}px,${X.py}px)`;
}
// Grab: trascina lo sfondo o un'immagine (sopra 6px di movimento); un semplice clic apre l'elemento.
(()=>{
  const st=$('#stage');
  st.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    X.drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,px:X.px,py:X.py,on:false};
  });
  addEventListener('pointermove',e=>{
    const d=X.drag;if(!d||e.pointerId!==d.id)return;
    const dx=e.clientX-d.sx,dy=e.clientY-d.sy;
    if(!d.on){
      if(Math.hypot(dx,dy)<6)return;
      d.on=true;st.classList.add('grabbing');
      try{st.setPointerCapture(d.id)}catch(_){}
    }
    setPan(d.px+dx,d.py+dy);
  });
  const end=e=>{
    const d=X.drag;if(!d||e.pointerId!==d.id)return;
    if(d.on){X.moved=true;setTimeout(()=>{X.moved=false},0)}
    st.classList.remove('grabbing');X.drag=null;
  };
  addEventListener('pointerup',end);addEventListener('pointercancel',end);
  // Rotella e trackpad: scorrono la mappa in entrambe le direzioni.
  st.addEventListener('wheel',e=>{e.preventDefault();setPan(X.px-e.deltaX,X.py-e.deltaY)},{passive:false});
})();

/* ---------- timeline: nastro isometrico di piani equidistanti ---------- */
/* Tutte le immagini stanno su un'unica diagonale (basso-sinistra → alto-destra).
   Scorrendo, l'intero nastro scivola lungo la diagonale, con inerzia. */
const T={sel:null,cat:null,built:false,arr:[],cur:0,raf:0,W:0,t:0,selIdx:-1,selAt:0};
let STEP=200;             // distanza (px di scroll = px orizzontali) tra due immagini: calcolata in base alla grandezza dei piani
const SK=20,SX=.72;       // inclinazione e compressione dei piani
function buildTimeline(){
  const tr=$('#track'),sc=$('#scroller');
  const prevFrac=T.total?sc.scrollLeft/T.total:0;
  $$('.timeline-column,.dot,.yr,.axis',tr).forEach(n=>n.remove());
  let vp=$('#vp');if(!vp){vp=el('div');vp.id='vp';tr.append(vp)}
  vp.innerHTML='';
  const info=el('div');info.id='info';vp.append(info);
  const sorted=[...items].sort((a,b)=>(yearOf(a)??Infinity)-(yearOf(b)??Infinity));
  const W=sc.clientWidth,H=sc.clientHeight;
  const ch=Math.round(Math.min(210,Math.max(100,H*.32))),cw=Math.round(ch*1.25);
  const vw=cw*SX,drop=vw*Math.tan(SK*Math.PI/180);
  tr.style.setProperty('--sk',SK+'deg');tr.style.setProperty('--sx',SX);
  T.slope=Math.min(.9,Math.max(.3,H/W*.7));
  // Spazio libero tra un piano e il successivo: la distanza supera sempre la larghezza del piano.
  STEP=Math.max(120,Math.round(vw*1.3));
  // Posizione di ogni immagine lungo il nastro: sempre equidistanti.
  const arr=sorted.map((it,i)=>{
    const s=i*STEP;
    const c=el('button','c',`<img src="${esc(imgOf(it))}" alt="" draggable="false">`);
    c.dataset.id=it.id;c.style.width=cw+'px';c.style.height=ch+'px';c.style.zIndex=i+1;
    c.setAttribute('aria-label',`${titleOf(it)} · ${dateOf(it)}`);
    c.onclick=()=>location.hash='#/timeline/'+it.id;
    vp.append(c);
    return {it,s,c,vis:null};
  });
  // Scala delle date: righello fisso con tacche e date che scorrono insieme al nastro.
  const ru=el('div');ru.id='ruler';
  ru.innerHTML='<div id="rline"></div><div id="rstrip"></div><i id="rmark"></i>';vp.append(ru);
  const strip=$('#rstrip',ru);T.lbl=[];let lastEnd=-1e9,prevKey=null;
  arr.forEach(o=>{
    const t=el('i','t');t.style.left=o.s+'px';strip.append(t);
    const txt=dateOf(o.it);if(txt===prevKey)return;prevKey=txt;
    const w=txt.length*6.6+16;
    if(o.s>=lastEnd){const l=el('span','l',esc(txt));l.style.left=o.s+'px';strip.append(l);T.lbl.push({s:o.s,l});lastEnd=o.s+w}
  });
  T.strip=strip;T.act=null;
  T.arr=arr;T.total=Math.max(1,arr[arr.length-1].s);T.cw=cw;T.ch=ch;T.vw=vw;T.drop=drop;
  T.pos={};arr.forEach((o,i)=>{T.pos[o.it.id]={s:o.s,i,get x(){return this.s+sc.clientWidth/2}}});
  T.arcs=[];$('#arcs').innerHTML='';
  const m=$('#mini');m.innerHTML='<b></b>';
  arr.forEach(o=>{const i=el('i');i.style.left=(o.s/T.total*100)+'%';m.append(i)});
  const counts={};items.forEach(i=>{counts[i.category]=(counts[i.category]||0)+1});
  $('#cats').innerHTML=`<button data-c="">tutti<sup>${items.length}</sup></button>`+
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<button data-c="${esc(c)}">${esc(c)}<sup>${n}</sup></button>`).join('');
  T.W=0;T.width=T.total;
  const wasBuilt=T.built;T.built=true;
  fitTrack();
  sc.scrollLeft=T.sel&&T.pos[T.sel]?T.pos[T.sel].s:prevFrac*T.total;
  T.cur=sc.scrollLeft;
  markTimeline();if(T.sel&&T.pos[T.sel])fillInfo(T.sel);startTL();
}
function fitTrack(){
  const sc=$('#scroller'),W=sc.clientWidth;if(W===T.W)return;
  T.W=W;$('#track').style.width=(W+T.total)+'px';$('#vp').style.width=W+'px';
}
// Un frame: avvicina la posizione mostrata a quella dello scroll e dispone i piani sulla diagonale.
function renderTL(){
  const sc=$('#scroller'),W=sc.clientWidth,H=sc.clientHeight;fitTrack();
  const target=sc.scrollLeft,d=target-T.cur;
  T.cur=Math.abs(d)<.15?target:T.cur+d*.14;
  const hh=(T.ch+T.drop)/2,hw=T.vw/2;
  // Selezione: il piano scelto si ingrandisce al centro; il nastro sale un po' per lasciare spazio alle informazioni.
  const selI=T.sel&&T.pos[T.sel]?T.pos[T.sel].i:-1;
  if(selI>=0)T.selIdx=selI;
  const goal=selI>=0?1:0;
  T.t+=(goal-T.t)*.11;if(Math.abs(goal-T.t)<.003)T.t=goal;
  const e=T.t*T.t*(3-2*T.t),k=T.selIdx,cx=W/2,cy=H*.5+(H*.34-H*.5)*e;
  let near=null,nd=Infinity;
  T.arr.forEach((o,i)=>{
    let dx=o.s-T.cur;const ad=Math.abs(dx);
    // Le altre immagini restano dove sono (stessa distanza); solo quella scelta si porta al centro.
    if(i===k)dx*=1-e;
    // Il piano scelto passa gradualmente da inclinato a frontale (nessuna inclinazione né compressione).
    const isK=i===k,z=isK?1+.35*e:1,x=cx+dx,y=cy-dx*T.slope;
    const sk=isK?SK*(1-e):SK,sx=isK?SX+(1-SX)*e:SX;
    const vis=x+T.cw*z/2>-20&&x-T.cw*z/2<W+20&&y+hh*z>-20&&y-hh*z<H+20;
    if(vis!==o.vis){o.c.style.visibility=vis?'visible':'hidden';o.vis=vis}
    if(vis){
      // Il centro del piano resta in (x,y) qualunque sia l'inclinazione.
      const px=x-T.cw*sx*z/2,py=y-z*(T.ch/2+Math.tan(sk*Math.PI/180)*T.cw*sx/2);
      o.c.style.setProperty('--x',px+'px');o.c.style.setProperty('--y',py+'px');
      if(o.z!==z){o.c.style.setProperty('--z',z);o.z=z}
      if(o.sk!==sk){o.c.style.setProperty('--sk',sk+'deg');o.sk=sk}
      if(o.sx!==sx){o.c.style.setProperty('--sx',sx);o.sx=sx}
    }
    if(ad<nd){nd=ad;near=o}
  });
  if(selI>=0)near=T.arr[selI];
  if(near&&near!==T.near){
    T.near=near;
    $('#hud').innerHTML=`${esc(dateOf(near.it))}<br>${String(T.arr.indexOf(near)+1).padStart(2,'0')} / ${items.length}`;
  }
  T.strip.style.transform=`translateX(${-T.cur}px)`;
  if(near){
    let act=null;for(const o of T.lbl){if(o.s<=near.s)act=o;else break}
    if(act!==T.act){T.act&&T.act.l.classList.remove('on');act&&act.l.classList.add('on');T.act=act}
  }
  const b=$('#mini b');b.style.left=(T.cur/T.total*100)+'%';b.style.width='2.5%';b.style.marginLeft='-1.25%';
}
function startTL(){
  if(T.raf)return;
  const loop=()=>{
    if(!$('#timeline').classList.contains('on')||!T.built){T.raf=0;return}
    renderTL();T.raf=requestAnimationFrame(loop);
  };
  T.raf=requestAnimationFrame(loop);
}
function miniUpdate(){}
function markTimeline(){
  const s=T.sel;
  $$('.c').forEach(c=>{
    const id=c.dataset.id,out=T.cat&&byId[id].category!==T.cat;
    c.classList.toggle('sel',id===s);
    c.classList.toggle('dim',!!out);
  });
  $$('#cats button').forEach(b=>b.classList.toggle('on',(b.dataset.c||null)===T.cat));
}
// Etichetta flottante (fuori dai piani inclinati, quindi sempre dritta).
function showTip(c){
  if(T.sel&&c.dataset.id===T.sel)return;
  const it=byId[c.dataset.id],t=$('#tip'),r=c.getBoundingClientRect();
  t.innerHTML=`${esc(titleOf(it))}<br><em>${esc(dateOf(it))}</em>`;
  t.style.display='block';
  const left=r.right+10+t.offsetWidth>innerWidth?r.left-10-t.offsetWidth:r.right+10;
  t.style.left=Math.max(8,left)+'px';t.style.top=Math.max(56,r.top)+'px';
}
const hideTip=()=>{$('#tip').style.display='none'};
$('#track').addEventListener('mouseover',e=>{const c=e.target.closest('.c');c?showTip(c):hideTip()});
$('#track').addEventListener('mouseleave',hideTip);
$('#track').addEventListener('focusin',e=>{const c=e.target.closest('.c');if(c)showTip(c)});
$('#track').addEventListener('focusout',hideTip);
$('#scroller').addEventListener('scroll',hideTip);
$('#cats').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  T.cat=b.dataset.c&&b.dataset.c!==T.cat?b.dataset.c:null;markTimeline();
});
function placeInfo(){
  const info=$('#info'),H=$('#scroller').clientHeight;if(!info)return;
  const top=H*.34+(T.ch+T.drop)*1.2/2+26;
  info.style.top=Math.round(top)+'px';info.style.maxHeight=Math.max(90,H-top-46)+'px';
}
function fillInfo(id){
  const it=byId[id],info=$('#info');if(!info||!it)return;
  info.innerHTML=`<button class="ix" aria-label="Chiudi">×</button>
    <h2>${esc(titleOf(it))}</h2><div class="idate">${esc(dateOf(it))}</div>
    <p>${esc(it.description)}</p>
    <div class="chips">${it.tags.map(t=>`<button class="chip" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
  placeInfo();
  $('.ix',info).onclick=()=>location.hash='#/timeline';
  $$('.chip',info).forEach(b=>b.onclick=()=>{location.hash='#/esplora';setTimeout(()=>setTag(b.dataset.t),30)});
  info.classList.remove('on');void info.offsetWidth;info.classList.add('on');
}
function setSel(id){
  T.sel=id||null;closePanel();
  if(T.built)markTimeline();
  if(id&&T.pos[id]){
    T.selAt=performance.now();
    $('#scroller').scrollTo({left:T.pos[id].s,behavior:'smooth'});
    fillInfo(id);
  }else{const i=$('#info');if(i)i.classList.remove('on')}
}
// Uscita dalla selezione: Esc, clic sullo sfondo, scroll; frecce per passare all'immagine precedente/successiva.
addEventListener('keydown',e=>{
  if(!T.sel||!$('#timeline').classList.contains('on'))return;
  if(e.key==='Escape')location.hash='#/timeline';
  const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;
  if(d){const n=T.arr[T.pos[T.sel].i+d];if(n)location.hash='#/timeline/'+n.it.id}
});
$('#scroller').addEventListener('click',e=>{
  if(T.sel&&!e.target.closest('.c,#info,#ruler'))location.hash='#/timeline';
});
$('#scroller').addEventListener('wheel',e=>{
  if(T.sel&&performance.now()-T.selAt>700&&Math.abs(e.deltaY)+Math.abs(e.deltaX)>6)location.hash='#/timeline';
});
$('#scroller').addEventListener('wheel',e=>{
  if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){e.currentTarget.scrollLeft+=e.deltaY*2.2;e.preventDefault()}
},{passive:false});
$('#scroller').addEventListener('scroll',miniUpdate);
$('#mini').onclick=e=>{
  const r=e.currentTarget.getBoundingClientRect(),sc=$('#scroller');
  sc.scrollTo({left:(e.clientX-r.left)/r.width*T.total,behavior:'smooth'});
};

/* ---------- router ---------- */
function route(){
  const [,pg='',requestedId]=location.hash.slice(1).split('/');
  const id=Object.hasOwn(byId,requestedId)?requestedId:undefined;
  const page=['esplora','timeline'].includes(pg)?pg:'landing';
  $$('.page').forEach(p=>p.classList.toggle('on',p.id===page));
  $$('nav a').forEach(a=>a.classList.toggle('on',a.dataset.p===page));
  if(page!=='esplora'&&page!=='timeline')closePanel();
  $('#esplora').classList.toggle('with-panel',page==='esplora'&&!!id);
  $('#timeline').classList.remove('with-panel');
  if(page==='esplora'){if(!X.ready)initExplore();else loop();setFocus(id)}
  if(page==='timeline'){if(!T.built)buildTimeline();else startTL();setSel(id)}
  document.body.classList.toggle('landing',page==='landing');
  if(page==='landing'){drawLines();parallax()}
}
let rs;addEventListener('resize',()=>{clearTimeout(rs);rs=setTimeout(()=>{X.ready=false;T.built=false;buildLanding();route()},200)});
addEventListener('hashchange',route);

(async()=>{
  D=await load();items=D.items.map(i=>({...i,id:String(i.id),tags:i.tags||[],links:[]}));
  byId=Object.fromEntries(items.map(i=>[i.id,i]));
  allTags=[...new Set(items.flatMap(i=>i.tags))].sort();
  edges=[];
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
    const r=rel(items[i],items[j]);if(r.w>0)edges.push({a:items[i].id,b:items[j].id,w:r.w});
  }
  $('#t1').textContent=config.title;$('#t2').textContent=config.subtitle;document.title=config.title;
  buildLanding();route();
})().catch(error=>{
  console.error(error);
  $('#landing').classList.add('on');
  $('#flow').textContent='Errore nel caricamento dei dati: '+error.message;
});