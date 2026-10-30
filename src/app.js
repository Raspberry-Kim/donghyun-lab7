/* 동현워 화면: 동현랭 출전 → 키보드 전투 → 결과 → 다시 출전 준비 */
(function(){
const $=s=>document.querySelector(s), E=window.Engine, AI=window.AI, R=window.Render;
const canvas=$('#board'), g=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const MAPNAME=id=>MAPS.find(m=>m.id===id).name;
const civName=n=>CIVS[n-1].name;
const UN=t=>UNITS[t].name;
const BN=t=>BUILDINGS[t].name;
const num=n=>n.toLocaleString('ko-KR');
const price=pr=>`식량 ${pr.f} · 금 ${pr.g}`;
const rngText=r=>r?(r[0]===r[1]?String(r[0]):r.join('~')):'—';

/* ---------- 화면 전환과 탭 ---------- */
$('#theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-pressed',String(dark));};
let tab='play';
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  tab=b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(x=>{x.classList.toggle('active',x===b);if(x===b)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});
  document.querySelectorAll('.tab-panel').forEach(p=>p.hidden=p.id!=='tab-'+tab);
  if(tab==='play'){ fit(); if(S) $('#board-wrap').focus({preventScroll:true}); }
});
$('.brand').onclick=e=>{e.preventDefault();document.querySelector('[data-tab=play]').click();scrollTo({top:0,behavior:'smooth'});};

/* ---------- 규칙 문서 표 ---------- */
const CLS={inf:'보병',rng:'원거리',cav:'기병',siege:'공성',monk:'수도사'};
const spText=d=>[...(d.sp||[]).map(s=>SPECIALS[s][0]), d.bonus==='cav'?'기병식 상성':null, d.cap?(d.cap>1?'점령 ×2':'점령'):null, d.heal?'치유·개종':null].filter(Boolean).join(' · ')||'—';
const whereOf=t=>{ const d=UNITS[t]; if(d.hero) return '처음부터 1기'; if(d.merc) return '시장(용병)'; if(d.unique) return '성(고유)'; const k=Object.keys(BUILD).find(k=>BUILD[k].includes(t)); return BN(k); };
const priceCell=t=>{ const d=UNITS[t]; if(d.hero) return '—'; const off=TECH_DISCOUNT[d.cls]||0; const f=d.merc?Math.round(d.f*MERC_RATE/5)*5:Math.max(0,d.f-off), gg=d.merc?Math.round(d.g*MERC_RATE/5)*5:Math.max(0,d.g-off); return `${f} / ${gg}`; };
$('#civ-grid').innerHTML=CIVS.map(c=>{const u=UNITS[c.unique],h=UNITS[c.hero];return `<article><h4>${c.id} · ${c.name}<small>${c.en}</small></h4><p><b>고유 병종</b> ${u.name} · 공격 ${u.atk} · 방어 ${u.def} · ${spText(u)}</p><p><b>영웅</b> ${h.name} · 공격 ${h.atk} · 방어 ${h.def} · 이동 ${h.mv} · ${spText(h)}</p></article>`;}).join('');
$('#unit-table').innerHTML='<thead><tr><th>병종</th><th>갈래</th><th>공격</th><th>방어</th><th>이동</th><th>사거리</th><th>식량 / 금</th><th>특수</th><th>생산</th></tr></thead><tbody>'+
  UNIT_ORDER.map(t=>{const d=UNITS[t];return `<tr><td>${d.name}</td><td>${CLS[d.cls]}</td><td>${d.atk||'—'}</td><td>${d.def}</td><td>${d.mv}</td><td>${rngText(d.rng)}</td><td>${priceCell(t)}</td><td>${spText(d)}</td><td>${whereOf(t)}</td></tr>`;}).join('')+'</tbody>';
$('#terrain-table').innerHTML='<thead><tr><th>지형</th><th>이동 비용</th><th>방어</th><th>사거리</th><th>막힘</th></tr></thead><tbody>'+
  TERRAIN_ORDER.map(k=>{const t=TERRAIN[k];return `<tr><td>${t.name}</td><td>${t.cost||'지날 수 없음'}</td><td>${t.cost?'+'+t.def+'%':'—'}</td><td>${t.rng>0?'+1':t.rng<0?'−1':'—'}</td><td>${[t.noSiege?'공성':'',t.noHorse?'말':''].filter(Boolean).join(' · ')||'—'}</td></tr>`;}).join('')+
  BUILDING_ORDER.map(k=>{const b=BUILDINGS[k];return `<tr><td>${b.name}</td><td>1</td><td>+${b.cover}%</td><td>—</td><td>건물 방어 ${b.def}${b.food?` · 식량 +${b.food}`:''}${b.gold?` · 금 +${b.gold}`:''}</td></tr>`;}).join('')+'</tbody>';

/* ---------- 동현랭 편집기(동현랭 시리즈와 같은 모양) ---------- */
for(const ex of examples){const o=document.createElement('option');o.value=ex.id;o.textContent=ex.title;$('#example').append(o);}
const DH_TOKEN=/(ㅋㅋ.*$)|(나는 동현이냐\?|동현이구나)|(오겡끼데스까)|(신중동역|신중동|뭉치)|(뿡뿡뿡|뿡뿡|포동이)|(꽥꽥)|(동+현아)|(동+현)|(도오*옹)|(ㅠ+)|(뚱띠|또치)/g;
const DH_CLS=[null,'t-cmt','t-frame','t-halt','t-ctl','t-out','t-in','t-assign','t-var','t-num','t-minus','t-op'];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function dhLine(line){let html='',last=0;line.replace(DH_TOKEN,(m,...gr)=>{const idx=gr[gr.length-2];html+=esc(line.slice(last,idx));const k=gr.slice(0,11).findIndex(x=>x!==undefined)+1;html+=`<span class="${DH_CLS[k]}">${esc(m)}</span>`;last=idx+m.length;return m;});return html+esc(line.slice(last));}
const code=$('#code'), area=document.createElement('div'), hl=document.createElement('div');
area.className='code-area'; hl.id='hl'; hl.setAttribute('aria-hidden','true'); code.parentNode.insertBefore(area,code); area.append(hl,code);
function hlSync(){hl.scrollTop=code.scrollTop;hl.scrollLeft=code.scrollLeft;}
function hlMetrics(){const cs=getComputedStyle(code);for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','fontFamily','fontSize','lineHeight','tabSize','letterSpacing'])hl.style[p]=cs[p];}
function highlight(){hlMetrics();hl.innerHTML=code.value.split('\n').map(l=>`<span class="ln">${dhLine(l)||' '}</span>`).join('')+'<span class="ln"> </span>';hlSync();}
code.addEventListener('scroll',()=>{hlSync();$('#lines').scrollTop=code.scrollTop;});addEventListener('resize',()=>{highlight();fit();});
function indent(){
  const text=code.value,lines=text.split('\n'),lead=l=>l.length-l.replace(/^[ \t]+/,'').length;
  const next=lines.map(l=>{const b=l.slice(lead(l));if(!b)return '';if(b.startsWith('ㅋㅋ'))return '   '+b;const s=b.split('~')[0].replace(/ㅋㅋ.*$/,'').trim();return (s==='나는 동현이냐?'||s==='동현이구나'?'':'  ')+b;});
  const {selectionStart:a,selectionEnd:b,selectionDirection:dir,scrollTop:y,scrollLeft:x}=code;
  const moved=p=>{let o=0,n=0;for(let i=0;i<lines.length;i++){const L=lines[i].length;if(p<=o+L){const c=p-o,ol=lead(lines[i]),nl=lead(next[i]);return n+Math.min(next[i].length,c<ol?nl:c-ol+nl);}o+=L+1;n+=next[i].length+1;}return n;};
  const value=next.join('\n'),na=moved(a),nb=moved(b);if(value===text&&na===a&&nb===b)return;if(value!==text)code.value=value;code.setSelectionRange(na,nb,dir);code.scrollTop=y;code.scrollLeft=x;
}
function codeChanged(e){if(!e?.isComposing)indent();const n=code.value.split('\n').length;$('#line-count').textContent=n+'줄';$('#lines').textContent=Array.from({length:n},(_,i)=>i+1).join('\n');highlight();}
code.addEventListener('compositionend',()=>codeChanged());
function codeLead(){const a=code.selectionStart,v=code.value,ls=v.lastIndexOf('\n',a-1)+1,le=v.indexOf('\n',ls);return {a,ls,lead:/^[ \t]*/.exec(v.slice(ls,le<0?v.length:le))[0].length};}
document.addEventListener('selectionchange',()=>{if(document.activeElement!==code||code.selectionStart!==code.selectionEnd)return;const {a,ls,lead}=codeLead();if(a-ls<lead)code.setSelectionRange(ls+lead,ls+lead);});
code.addEventListener('beforeinput',e=>{
  const {a,ls,lead}=codeLead();
  if(a!==code.selectionEnd)return;
  if(e.inputType==='deleteContentBackward'&&ls>0&&a>ls&&a-ls<=lead){e.preventDefault();code.setRangeText('',ls-1,a,'end');codeChanged();}
});
code.oninput=codeChanged;
code.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();sortie();}});
function selectExample(){const ex=examples.find(e=>e.id===$('#example').value);code.value=ex.code;$('#example-note').textContent=ex.note;codeChanged();}
$('#example').onchange=selectExample; selectExample();
$('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code.value+'\n'],{type:'text/plain;charset=utf-8'}));a.download='sortie.dh';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#open').onchange=async e=>{const f=e.target.files[0];if(!f)return;code.value=(await f.text()).replace(/\r/g,'').replace(/\n$/,'');codeChanged();e.target.value='';};
$('#run').onclick=()=>sortie();

/* ---------- 출전 규약 ---------- */
const DEFAULT={map:1,civ1:1,civ2:2,first:1,funds:500,seed:0};
let cfg={...DEFAULT};
function parseSortie(out){
  const tok=out.split(/\s+/).filter(Boolean).map(Number), c={...DEFAULT}, err=[];
  let go=false;
  const rule={1:['지도','map',v=>v>=1&&v<=MAPS.length,'1~'+MAPS.length],2:['나의 문명','civ1',v=>v>=1&&v<=CIVS.length,'1~'+CIVS.length],3:['CPU 문명','civ2',v=>v>=1&&v<=CIVS.length,'1~'+CIVS.length],
    4:['선공','first',v=>v===1||v===2,'1 또는 2'],5:['시작 자원','funds',v=>v>=0&&v<=3000&&v%100===0,'0~3000, 100 단위'],7:['난수 시드','seed',v=>v>=1&&v<=2147483646,'1~2147483646']};
  for(let i=0;i<tok.length;i++){
    const n=tok[i];
    if(go){ err.push(`출전 명령 6 뒤에 ${tok.length-i}개의 정수가 더 나왔다. 6은 마지막에 출력하자.`); break; }
    if(n===6){ go=true; continue; }
    const r=rule[n];
    if(!r){ err.push(`${i+1}번째 정수 ${n}은 출전 명령이 아니다. 명령은 1~7이다.`); break; }
    if(i+1>=tok.length){ err.push(`명령 ${n}(${r[0]}) 뒤에 값이 없다.`); break; }
    const v=tok[++i];
    if(!r[2](v)){ err.push(`${r[0]} 값 ${v}은 쓸 수 없다. ${r[3]}만 된다.`); break; }
    c[r[1]]=v;
  }
  return {c,go,err};
}
function sortieCard(c){
  $('#sortie-card').innerHTML=[['지도',`${c.map} · ${MAPNAME(c.map)}`],['나의 문명',`${c.civ1} · ${civName(c.civ1)}`],['CPU',`${c.civ2} · ${civName(c.civ2)}`],
    ['선공',c.first===1?'나':'CPU'],['시작 자원',`식량·금 각 ${num(c.funds)}`],['시대 · 안개','제국 시대 · 없음']].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
}
function result(text,kind){ const r=$('#result'); r.textContent=text; r.dataset.kind=kind||''; }
function sortie(){
  if(S) return;
  let out;
  try{ const r=Donghyun.run(code.value,{maxSteps:300000}); out=r.output; }
  catch(e){ result(`동현랭 오류${e.line?` (${e.line}줄)`:''}: ${e.message}`,'error'); status('동현랭 오류','error'); return; }
  const p=parseSortie(out);
  if(p.err.length){ result('출전 규약 오류: '+p.err[0],'error'); status('출전 규약 오류','error'); return; }
  cfg=p.c; sortieCard(cfg); preview(cfg);
  if(!p.go){ result(`설정을 읽었다(${MAPNAME(cfg.map)} · ${civName(cfg.civ1)} 대 ${civName(cfg.civ2)}). 출전 명령 6을 마지막에 출력하면 전장에 나간다.`); status('설정만 읽음'); return; }
  startGame(cfg);
}
function status(t,kind){ const s=$('#status'); s.textContent=t; s.dataset.kind=kind||''; }

/* ---------- 상태 ---------- */
let S=null, mode='setup', ui={cursor:null,fx:[],terrainVer:0}, sel=null, orig=null, reachR=null, menu=null, tgt=null, busy=false, fast=false, committed=false;
let previewS=null;
function preview(c){ previewS=E.newGame({map:c.map,civ1:c.civ1,civ2:c.civ2,first:1,funds:0,seed:1}); previewS.units=[]; ui={cursor:null,fx:[],terrainVer:(ui.terrainVer||0)+1}; size(previewS); $('#day').textContent=MAPNAME(c.map); $('#turn-badge').textContent=''; $('#turn-badge').className=''; $('#tile-info').textContent=MAPS.find(m=>m.id===c.map).note; }
function size(s){ canvas.width=s.map.W*R.T; canvas.height=s.map.H*R.T+R.PAD; fit(); }
function fit(){
  const st=canvas.parentElement, w=st.clientWidth; if(!w||!canvas.width) return;
  const maxH=Math.max(260,innerHeight-230), byH=maxH*canvas.width/canvas.height;
  canvas.style.width=Math.min(w,byH)+'px'; canvas.style.margin='0 auto';
}
function frame(now){
  const s=S||previewS;
  if(s){ g.clearRect(0,0,canvas.width,canvas.height); R.draw(g,s,ui,now); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- 게임 시작·종료 ---------- */
function liveUI(){
  $('#setup-panel').hidden=true; $('#hud').hidden=false; $('#board-wrap').classList.add('live'); $('#touchpad').classList.add('on');
  fit(); $('#board-wrap').focus({preventScroll:true});
}
function startGame(c){
  S=E.newGame({map:c.map,civ1:c.civ1,civ2:c.civ2,first:c.first,funds:c.funds,seed:c.seed||undefined});
  S.events.length=0;
  ui={cursor:null,fx:[],terrainVer:(ui.terrainVer||0)+1}; size(S);
  ui.cursor=E.findTC(S,1);
  liveUI(); $('#board-wrap').scrollIntoView({block:'nearest',behavior:reduced?'auto':'smooth'});
  $('#log').innerHTML=''; log(`${MAPNAME(c.map)} · ${civName(c.civ1)} 대 ${civName(c.civ2)} · 출전.`,0);
  mode='idle'; hud();
  beginTurn();
}
function backToSetup(){
  S=null; mode='setup'; closeMenu(); $('#result-card').hidden=true; $('#banner').hidden=true;
  $('#setup-panel').hidden=false; $('#hud').hidden=true; $('#board-wrap').classList.remove('live'); $('#touchpad').classList.remove('on');
  preview(cfg); renderSlotList(); status('출전 준비'); result('다시 출전하려면 코드를 고치거나 그대로 출전을 누르자.'); $('#hint').textContent='X 확인 · Z 취소 · Enter 메뉴';
}
$('#concede').onclick=()=>{ if(!S||S.winner||mode==='cpu') return; confirmMenu('항복하고 출전 준비로 돌아갈까?',[['항복한다',()=>{E.concede(S,1);finishCheck();}],['계속 싸운다',()=>{}]]); };
async function banner(text,sub,cls,ms=950){
  const b=$('#banner'); b.className='banner '+(cls||''); b.innerHTML=esc(text)+(sub?`<small>${esc(sub)}</small>`:''); b.hidden=false;
  await sleep(reduced||fast?Math.min(ms,350):ms); b.hidden=true;
}
async function beginTurn(){
  busy=true; const p=S.turn, inc=E.income(S,p); processEvents(); $('#hint').textContent='X 확인 · Z 취소 · Enter 메뉴';
  if(p===2) mode='cpu'; hud();
  await banner(`${S.day}일째 · ${p===1?'나의 차례':'CPU 차례'}`,`${civName(S.players[p].civ)} · 식량 +${inc.f} · 금 +${inc.g}`,'p'+p);
  busy=false;
  if(finishCheck()) return;
  if(p===2) runCPU(); else { mode='idle'; hud(); }
}
function finishCheck(){
  if(!S||!S.winner) return false;
  processEvents(); mode='over'; closeMenu(); hud();
  const win=S.winner===1, P=S.players;
  const card=$('#result-card');
  card.innerHTML=`<div><h3>${win?'승리':'패배'}</h3><p>${S.day}일째 · ${esc(S.reason)}${win?' · 붉은 진영이 이겼다.':' · 푸른 진영이 이겼다.'}</p>
  <dl><dt></dt><dt>나</dt><dt>CPU</dt><dt>만든 유닛</dt><dd>${P[1].built}</dd><dd>${P[2].built}</dd><dt>무찌른 유닛</dt><dd>${P[1].kills}</dd><dd>${P[2].kills}</dd><dt>개종시킨 유닛</dt><dd>${P[1].converted}</dd><dd>${P[2].converted}</dd><dt>잃은 유닛</dt><dd>${P[1].lost}</dd><dd>${P[2].lost}</dd><dt>건물</dt><dd>${E.buildingsOf(S,1)}</dd><dd>${E.buildingsOf(S,2)}</dd></dl>
  <button id="again">출전 준비로 <kbd>X</kbd></button></div>`;
  card.hidden=false; $('#again').onclick=backToSetup;
  status(win?'승리':'패배'); log(`${win?'승리':'패배'} · ${S.reason}`,0);
  return true;
}

/* ---------- 기록과 효과 ---------- */
function log(html,p){ const li=document.createElement('li'); li.className=p?'p'+p:''; li.innerHTML=html; const l=$('#log'); l.prepend(li); while(l.children.length>80) l.lastChild.remove(); }
const side=p=>p===1?'나':p===2?'CPU':'중립';
const TN=t=>TERRAIN[t].name;
function processEvents(){
  if(!S) return; const now=performance.now();
  for(const e of S.events){
    if(e.k==='attack'){ log(`<b>${UN(e.at)}</b> → ${UN(e.dt)} ${e.dmg}${e.counter?` · 반격 ${e.counter}`:''}${e.first?' · 상대가 먼저 쳤다':''}`,e.ao);
      const d0=e.first?260:0, a0=e.first?0:260;
      ui.fx.push({k:'hit',x:e.dx,y:e.dy,t0:now+d0,dur:420},{k:'num',x:e.dx,y:e.dy,t0:now+d0,dur:900,text:'-'+e.dmg,col:'#ffe27a'});
      if(e.counter) ui.fx.push({k:'hit',x:e.ax,y:e.ay,t0:now+a0,dur:420},{k:'num',x:e.ax,y:e.ay,t0:now+a0,dur:900,text:'-'+e.counter,col:'#ffb0a0'}); }
    else if(e.k==='hitb'){ log(`<b>${UN(e.at)}</b> → ${side(e.bo)}의 ${BN(e.bt)} ${e.dmg}`,e.ao); ui.fx.push({k:'hit',x:e.dx,y:e.dy,t0:now,dur:420},{k:'num',x:e.dx,y:e.dy,t0:now,dur:900,text:'-'+e.dmg,col:'#ffe27a'}); }
    else if(e.k==='ruin'){ log(`${side(e.owner)}의 <b>${BN(e.bt)}</b> 무너짐${e.bt==='tc'?'':' · 중립이 되었다'}`,e.by); ui.fx.push({k:'boom',x:e.x,y:e.y,t0:now+120,dur:650}); }
    else if(e.k==='destroy'){ log(`${side(e.owner)}의 <b>${UN(e.type)}</b> 쓰러짐`,3-e.owner); ui.fx.push({k:'boom',x:e.x,y:e.y,t0:now+120,dur:650}); }
    else if(e.k==='capture'){ log(e.done?`<b>${UN(e.type)}</b> ${BN(e.bt)} 점령 완료`:`<b>${UN(e.type)}</b> ${BN(e.bt)} 점령 중 · 남은 ${e.left}`,e.owner); }
    else if(e.k==='build'){ log(`<b>${UN(e.type)}</b> 생산`,e.owner); }
    else if(e.k==='heal'){ log(`<b>${UN(e.type)}</b> ${UN(e.tt)} 치유 +${e.add}`,e.owner); ui.fx.push({k:'glow',x:e.x,y:e.y,t0:now,dur:700,rgb:'140,240,150'},{k:'num',x:e.x,y:e.y,t0:now,dur:900,text:'+'+e.add,col:'#a8f5b0'}); }
    else if(e.k==='convert'){ log(`<b>${UN('monk')}</b> ${UN(e.tt)} 개종 ${e.ok?'성공':'실패'} (${e.pct}%)`,e.owner); ui.fx.push({k:'glow',x:e.x,y:e.y,t0:now,dur:800,rgb:e.ok?'255,236,140':'200,200,200'},{k:'num',x:e.x,y:e.y,t0:now,dur:900,text:e.ok?'개종':'실패',col:e.ok?'#ffe27a':'#ddd'}); }
    else if(e.k==='turn'){ log(`${e.day}일째 · ${side(e.p)} 차례 · 식량 +${e.food} · 금 +${e.gold}`,e.p); }
  }
  S.events.length=0;
}

/* ---------- 정보 표시 ---------- */
function hud(){
  if(!S) return;
  $('#co-cards').innerHTML=[1,2].map(p=>{const P=S.players[p], civ=CIVS[P.civ-1], n=E.unitCount(S,p), cap=E.unitCap(S,p), inc=E.income(S,p);
    return `<div class="co-card p${p} ${S.turn===p&&!S.winner?'turn':''}"><div class="who"><span>${p===1?'나 · 붉은 진영':'CPU · 푸른 진영'}</span><span>${S.turn===p?'차례':''}</span></div>
    <div class="nm"><span class="co-face">${civ.name[0]}</span><div><strong>${civ.name}</strong><small>${UN(civ.unique)} · ${UN(civ.hero)}</small></div></div>
    <dl><dt>식량</dt><dd>${num(P.food)} <small>+${inc.f}</small></dd><dt>금</dt><dd>${num(P.gold)} <small>+${inc.g}</small></dd><dt>유닛</dt><dd>${n}/${cap}</dd><dt>건물</dt><dd>${E.buildingsOf(S,p)}</dd></dl></div>`;}).join('');
  $('#day').textContent=`${S.day}일째`;
  const tb=$('#turn-badge'); tb.textContent=S.turn===1?'나의 차례':'CPU 차례'; tb.className='p'+S.turn;
  if(!S.winner) status(mode==='cpu'||S.turn===2?'CPU가 생각하는 중':'나의 차례 · '+({idle:'유닛을 고르자',move:'갈 곳을 고르자',action:'명령을 고르자',target:'대상을 고르자',menu:'메뉴',build:'생산',info:'정보'}[mode]||''));
  infoCard();
}
function forecastHTML(){
  const t=tgt.list[tgt.i];
  if(tgt.kind==='heal'){ const add=Math.min(100-t.unit.hp,UNITS[sel.type].heal); return [`${UN(sel.type)} → ${UN(t.unit.type)}<small>치유</small>`,`<div class="forecast"><div><span>회복</span><strong>+${add}</strong></div><div><span>상대 체력</span><strong>${t.unit.hp}</strong></div></div>`,`치유 +${add}`]; }
  if(tgt.kind==='convert'){ const pc=Math.round(E.convertChance(sel,t.unit)*100); return [`${UN(sel.type)} → ${UN(t.unit.type)}<small>개종</small>`,`<div class="forecast"><div><span>성공 확률</span><strong>${pc}%</strong></div><div><span>거리</span><strong>${E.dist(sel.x,sel.y,t.x,t.y)}</strong></div></div><p>수도사 체력에 비례하고, 두 칸 떨어지면 반으로 준다. 영웅과 고유 병종은 개종하지 않는다.</p>`,`개종 확률 ${pc}%`]; }
  const f=E.forecast(S,sel,t,sel.x,sel.y);
  if(t.bldg) return [`${UN(sel.type)} → ${BN(t.bldg.type)}<small>예상</small>`,`<div class="forecast"><div><span>건물 피해</span><strong>${f.lo}~${f.hi}</strong></div><div><span>건물 체력</span><strong>${t.bldg.hp}</strong></div></div><p>건물은 반격하지 않는다. 체력이 0이 되면 중립 건물로 돌아간다(마을회관은 무너지면 진다).</p>`,`건물 피해 ${f.lo}~${f.hi}`];
  const c=f.counter?(f.counterLo===f.counter?f.counter:f.counterLo+'~'+f.counter):'없음';
  return [`${UN(sel.type)} → ${UN(t.unit.type)}<small>예상</small>`,`<div class="forecast"><div><span>내 공격</span><strong>${f.lo}~${f.hi}</strong></div><div><span>상대 반격</span><strong>${c}</strong></div></div><p>상대 체력 ${t.unit.hp} · ${coverName(t.x,t.y)}.${f.defFirst?' 상대가 먼저 친다.':''} 운에 따라 범위 안에서 정해진다.</p>`,`예상 피해 ${f.lo}~${f.hi} · 반격 ${c}`];
}
function coverName(x,y){ const c=S.map.grid[y][x]; return c.b?`${BN(c.b.type)} 방어 +${BUILDINGS[c.b.type].cover}%`:`${TN(c.t)} 방어 +${TERRAIN[c.t].def}%`; }
function infoCard(){
  const box=$('#info-card'); if(!S||!ui.cursor){ box.innerHTML=''; return; }
  if(mode==='target'&&tgt){ const [h,b,line]=forecastHTML(); box.innerHTML=`<h3>${h}</h3>${b}`; $('#tile-info').textContent=line; return; }
  const [x,y]=ui.cursor, c=S.map.grid[y][x], u=E.unitAt(S,x,y), td=TERRAIN[c.t];
  let h;
  if(c.b){ const B=BUILDINGS[c.b.type];
    h=`<h3>${B.name} · ${side(c.b.owner)}<small>체력 ${c.b.hp}/100</small></h3><div class="row"><span>위 유닛 방어 <b>+${B.cover}%</b></span><span>건물 방어 <b>${B.def}</b></span>${B.food?`<span>식량 <b>+${Math.round(B.food*c.b.hp/100)}</b></span>`:''}${B.gold?`<span>금 <b>+${Math.round(B.gold*c.b.hp/100)}</b></span>`:''}<span>점령값 <b>${c.capId?c.cp:E.capNeed(c.b)}</b></span></div>${c.b.type==='tc'?'<p>점령하거나 무너뜨리면 이긴다.</p>':''}`; }
  else h=`<h3>${td.name}<small>${td.cost?`이동 ${td.cost} · 방어 +${td.def}%`:'지날 수 없음'}</small></h3>`;
  if(u){ const d=UNITS[u.type];
    h+=`<h3 style="margin-top:8px">${d.name} · ${side(u.owner)}<small>체력 ${u.hp}/100</small></h3><div class="row"><span>공격 <b>${d.atk||'—'}</b></span><span>방어 <b>${d.def}</b></span><span>이동 <b>${d.mv}</b></span><span>사거리 <b>${rngText(E.rangeOf(S,u))}</b></span></div><p>${spText(d)}</p>`;
    if(u.owner===1&&S.turn===1&&mode==='idle') h+=`<p>${u.done?'이번 차례에 행동을 마쳤다.':'X로 고르면 이동 범위가 보인다.'}</p>`;
  } else if(mode==='idle'&&S.turn===1){ const b=E.canBuildAt(S,1,x,y); h+=`<p>${b.length?'X로 생산 메뉴를 연다.':'Enter로 메뉴(턴 종료 · 저장 · 불러오기)를 연다.'}</p>`; }
  box.innerHTML=h;
  $('#tile-info').textContent=`${c.b?BN(c.b.type)+' · '+side(c.b.owner)+' '+c.b.hp:td.name+' +'+td.def+'%'}${u?` · ${UNITS[u.type].name} ${u.hp}`:''}`;
}

/* ---------- 메뉴 ---------- */
function openMenu(title,items,onCancel){ menu={title,items,i:Math.max(0,items.findIndex(it=>!it.off)),onCancel}; drawMenu(); hud(); }
function drawMenu(){
  const m=$('#menu'); if(!menu){ m.hidden=true; return; }
  m.innerHTML=(menu.title?`<h4>${esc(menu.title)}</h4>`:'')+menu.items.map((it,i)=>`<div class="mi ${i===menu.i?'sel':''} ${it.off?'off':''}" role="menuitem" data-i="${i}"><span>${esc(it.label)}</span>${it.note?`<small>${esc(it.note)}</small>`:''}</div>`).join('');
  m.hidden=false;
  const right=ui.cursor && ui.cursor[0] < S.map.W/2;
  m.style.left=right?'auto':'8px'; m.style.right=right?'8px':'auto'; m.style.top='8px';
  m.querySelectorAll('.mi').forEach(el=>el.onclick=()=>{menu.i=+el.dataset.i;drawMenu();key('z');});
  m.querySelector('.sel')?.scrollIntoView({block:'nearest'});
}
function closeMenu(){ menu=null; $('#menu').hidden=true; }
function confirmMenu(q,opts){ const prev=mode; mode='menu'; openMenu(q,opts.map(([label,fn])=>({label,fn:()=>{closeMenu();mode=prev==='menu'?'idle':prev;fn();hud();}})),()=>{mode=prev==='menu'?'idle':prev;}); }
function mainMenu(){
  const items=[{label:'턴 종료',fn:endTurnAsk},{label:'저장',fn:saveMenu},{label:'불러오기',fn:loadMenu},{label:'항복',fn:()=>$('#concede').click()}];
  mode='menu'; openMenu(`${S.day}일째 · ${civName(S.players[1].civ)}`,items,()=>{mode='idle';});
}

/* ---------- 저장 · 불러오기 ----------
   판 전체(건물 주인·체력·점령값, 유닛, 식량·금, 시장 용병, 날짜, 차례, 난수 상태)를 JSON으로 옮긴다. */
const SAVE_FORMAT='donghyun-war-save', SAVE_VERSION=1, SLOT_KEY=n=>'donghyun-war:slot'+n, SLOTS=3;
function snapshot(){
  const state=JSON.parse(JSON.stringify(S,(k,v)=>k==='events'?[]:(k==='_aiTried'?undefined:v)));
  const logs=[...$('#log').children].reverse().map(li=>({c:li.className,h:li.innerHTML}));
  return {format:SAVE_FORMAT,version:SAVE_VERSION,savedAt:new Date().toISOString(),
    summary:{map:S.map.id,mapName:MAPNAME(S.map.id),day:S.day,civ1:civName(S.players[1].civ),civ2:civName(S.players[2].civ)},state,logs};
}
function restore(data){
  if(!data||data.format!==SAVE_FORMAT) throw new Error('동현워 저장 파일이 아니다.');
  if(data.version!==SAVE_VERSION) throw new Error('지원하지 않는 저장 형식 버전이다('+data.version+').');
  const st=data.state, m=MAPS.find(m=>m.id===st?.map?.id);
  if(!m||st.map.W!==m.W||st.map.H!==m.H||!Array.isArray(st.map.grid)||st.map.grid.length!==m.H||st.map.grid.some(r=>!Array.isArray(r)||r.length!==m.W)) throw new Error('지도 정보가 맞지 않는다.');
  if(st.map.grid.some(r=>r.some(c=>!TERRAIN[c.t]||(c.b&&!BUILDINGS[c.b.type])))) throw new Error('지형·건물 정보가 맞지 않는다.');
  if(!Array.isArray(st.units)||st.units.some(u=>!UNITS[u.type]||!(u.hp>0&&u.hp<=100))) throw new Error('유닛 정보가 맞지 않는다.');
  if(!st.players||!st.players[1]||!st.players[2]||!CIVS[st.players[1].civ-1]||!CIVS[st.players[2].civ-1]) throw new Error('문명 정보가 맞지 않는다.');
  if(st.winner) throw new Error('이미 끝난 판이다.');
  st.events=[];
  closeMenu(); $('#result-card').hidden=true; $('#banner').hidden=true; clearSel();
  S=st; ui={cursor:null,fx:[],terrainVer:(ui.terrainVer||0)+1}; size(S);
  ui.cursor=E.findTC(S,1);
  liveUI();
  const l=$('#log'); l.innerHTML=''; for(const e of (data.logs||[]).slice(-79)){ const li=document.createElement('li'); li.className=String(e.c||'').replace(/[^a-z0-9 ]/gi,''); li.textContent=String(e.h||'').replace(/<[^>]*>/g,''); l.prepend(li); }
  log(`${S.day}일째 판을 불러왔다.`,0);
  busy=false; fast=false; mode='idle'; $('#hint').textContent='X 확인 · Z 취소 · Enter 메뉴'; hud();
  if(S.turn===2) runCPU();
}
function readSlot(n){ try{ const t=localStorage.getItem(SLOT_KEY(n)); return t?JSON.parse(t):null; }catch(e){ return null; } }
function slotNote(d){ if(!d) return '비어 있음'; const t=new Date(d.savedAt); const pad=v=>String(v).padStart(2,'0');
  return `${d.summary.mapName} · ${d.summary.day}일째 · ${t.getMonth()+1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`; }
function toast(t){ log(esc(t),0); status(t); }
function saveToSlot(n){ try{ localStorage.setItem(SLOT_KEY(n),JSON.stringify(snapshot())); toast(`브라우저 칸 ${n}에 저장했다.`); } catch(e){ toast('브라우저 저장에 실패했다. 파일로 내려받아 저장하자.'); } }
function deleteSlot(n){ try{ localStorage.removeItem(SLOT_KEY(n)); }catch(e){} }
function saveToFile(){
  const d=snapshot(), a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:'application/json'}));
  a.download=`donghyun-war-map${d.summary.map}-day${d.summary.day}.dhsave`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast('저장 파일을 내려받았다.');
}
function saveMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n);
    items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),fn:()=>{ if(d) confirmMenu(`칸 ${n}에 덮어쓸까?`,[['덮어쓴다',()=>saveToSlot(n)],['그만둔다',()=>{}]]); else { closeMenu(); mode='idle'; saveToSlot(n); hud(); } }}); }
  items.push({label:'파일로 내려받기',note:'.dhsave',fn:()=>{ closeMenu(); mode='idle'; saveToFile(); hud(); }});
  items.push({label:'브라우저 칸 지우기',note:'',off:!Array.from({length:SLOTS},(_,i)=>readSlot(i+1)).some(Boolean),fn:()=>{ closeMenu(); deleteMenu(); }});
  mode='menu'; openMenu('저장',items,()=>{ mainMenu(); return false; });
}
function deleteMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n);
    items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu(`칸 ${n}${n===2?"를":"을"} 지울까? 되돌릴 수 없다.`,[['지운다',()=>{ deleteSlot(n); toast(`브라우저 칸 ${n}${n===2?"를":"을"} 지웠다.`); }],['그만둔다',()=>{}]])}); }
  mode='menu'; openMenu('지울 칸',items,()=>{ saveMenu(); return false; });
}
function loadFrom(d){ try{ restore(d); }catch(e){ const msg='불러오기 실패: '+e.message; if(S){ toast(msg); } else { result(msg,'error'); status('불러오기 실패','error'); } } }
function loadMenu(){
  const items=[];
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n);
    items.push({label:`브라우저 칸 ${n}`,note:slotNote(d),off:!d,fn:()=>confirmMenu('지금 판을 버리고 불러올까?',[['불러온다',()=>loadFrom(readSlot(n))],['그만둔다',()=>{}]])}); }
  items.push({label:'파일에서 불러오기',note:'.dhsave',fn:()=>{ closeMenu(); mode='idle'; hud(); $('#load-file').click(); }});
  mode='menu'; openMenu('불러오기',items,()=>{ mainMenu(); return false; });
}
$('#load-file').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ loadFrom(JSON.parse(await f.text())); }catch(err){ loadFrom(null); } };
$('#load-file-setup').onchange=$('#load-file').onchange;
document.querySelector('.load-head label').addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); $('#load-file-setup').click(); } });
function renderSlotList(){
  const box=$('#slot-list'); box.innerHTML='';
  for(let n=1;n<=SLOTS;n++){ const d=readSlot(n); const b=document.createElement('button'); b.className='slot-btn'; b.disabled=!d;
    b.innerHTML=`<b>칸 ${n}</b><span>${esc(slotNote(d))}</span>${d?`<small>${esc(d.summary.civ1)} 대 ${esc(d.summary.civ2)}</small>`:''}`;
    b.onclick=()=>loadFrom(readSlot(n));
    const row=document.createElement('div'); row.className='slot-row'; row.append(b);
    if(d){ const x=document.createElement('button'); x.className='slot-del'; x.type='button'; x.textContent='지우기'; x.setAttribute('aria-label',`칸 ${n} 지우기`);
      let t=0; x.onclick=()=>{ if(!x.classList.contains('armed')){ x.classList.add('armed'); x.textContent='정말 지운다'; t=setTimeout(()=>{ x.classList.remove('armed'); x.textContent='지우기'; },4000); return; }
        clearTimeout(t); deleteSlot(n); renderSlotList(); status(`브라우저 칸 ${n}${n===2?"를":"을"} 지웠다.`); };
      row.append(x); }
    box.append(row); }
}
function endTurnAsk(){
  closeMenu(); const n=E.readyUnits(S,1).length;
  if(n) confirmMenu(`아직 움직이지 않은 유닛이 ${n}개다. 턴을 끝낼까?`,[['턴을 끝낸다',endTurn],['돌아간다',()=>{}]]);
  else endTurn();
}
function endTurn(){ mode='idle'; clearSel(); E.endTurn(S); hud(); beginTurn(); }
function buildMenu(x,y){
  const P=S.players[1], list=E.canBuildAt(S,1,x,y), b=S.map.grid[y][x].b;
  mode='build';
  openMenu(`${BN(b.type)} · 식량 ${num(P.food)} · 금 ${num(P.gold)} · 유닛 ${E.unitCount(S,1)}/${E.unitCap(S,1)}`,list.map(t=>{const pr=E.priceOf(S,1,t), why=E.buildReason(S,1,x,y,t);
    return {label:UN(t),note:price(pr),off:!!why,type:t,fn:()=>{closeMenu();mode='idle';E.build(S,1,x,y,t);processEvents();hud();}};}),()=>{mode='idle';});
}

/* ---------- 유닛 조작 ---------- */
function clearSel(){ sel=null; orig=null; reachR=null; tgt=null; committed=false; ui.moveSet=null; ui.atkSet=null; ui.helpSet=null; ui.path=null; ui.spots=null; }
function rangeTiles(u){
  const set=new Set(); if(!UNITS[u.type].rng) return set;
  const R2=E.reach(S,u);
  for(const k of R2.dist.keys()){ const x=k%1000,y=Math.floor(k/1000);
    if(E.has(u,'noMA')&&(x!==u.x||y!==u.y)) continue;
    const r=E.rangeOf(S,u,x,y);
    for(let dy=-r[1];dy<=r[1];dy++) for(let dx=-r[1];dx<=r[1];dx++){ const d=Math.abs(dx)+Math.abs(dy), nx=x+dx, ny=y+dy; if(d>=r[0]&&d<=r[1]&&nx>=0&&ny>=0&&nx<S.map.W&&ny<S.map.H) set.add(E.key(nx,ny)); } }
  return set;
}
function select(u){
  sel=u; orig={x:u.x,y:u.y}; reachR=E.reach(S,u); mode='move';
  ui.moveSet=new Set([...reachR.dist.keys()].filter(k=>E.stopOK(S,u,k%1000,Math.floor(k/1000)))); ui.atkSet=null; ui.path=[[u.x,u.y]]; hud();
}
function updatePath(){
  if(mode!=='move') return; const [x,y]=ui.cursor;
  ui.path=reachR.dist.has(E.key(x,y))?E.pathTo(reachR,orig.x,orig.y,x,y):null;
}
async function moveTo(){
  const [x,y]=ui.cursor; if(!reachR.dist.has(E.key(x,y))||!E.stopOK(S,sel,x,y)) return;
  const path=E.pathTo(reachR,orig.x,orig.y,x,y);
  busy=true; ui.moveSet=null; ui.path=null;
  if(path.length>1){ ui.anim={id:sel.id,path,t0:performance.now(),dur:(reduced?20:70)*(path.length-1)}; await sleep(ui.anim.dur); ui.anim=null; }
  sel.x=x; sel.y=y; busy=false; actionMenu();
}
function actionMenu(){
  const u=sel, moved=u.x!==orig.x||u.y!==orig.y, d=UNITS[u.type], c=S.map.grid[u.y][u.x];
  const items=[];
  if(E.targetsFrom(S,u,u.x,u.y,moved).length) items.push({label:'공격',fn:()=>startTarget('attack')});
  if(d.heal){ if(E.healTargets(S,u).length) items.push({label:'치유',note:'+'+d.heal,fn:()=>startTarget('heal')});
    if(E.convertTargets(S,u).length) items.push({label:'개종',fn:()=>startTarget('convert')}); }
  if(E.canCapture(S,u)) items.push({label:'점령',note:`남은 ${c.capId===u.id?c.cp:E.capNeed(c.b)} · 이번 ${E.disp(u.hp)*d.cap}`,fn:()=>act('capture')});
  items.push({label:'대기',fn:()=>act('wait')});
  mode='action'; ui.cursor=[u.x,u.y];
  openMenu(UN(u.type),items,()=>{ if(committed) return false; sel.x=orig.x; sel.y=orig.y; select(sel); ui.cursor=[...ui.cursor]; updatePath(); });
}
function commit(){ if(committed) return; committed=true; const dx=sel.x,dy=sel.y; sel.x=orig.x; sel.y=orig.y; E.commitMove(S,sel,dx,dy); }
function act(kind){
  closeMenu(); commit(); const u=sel;
  if(kind==='capture') E.capture(S,u);
  if(S.units.includes(u)) u.done=true;
  done();
}
function done(){ processEvents(); clearSel(); mode='idle'; if(finishCheck()) return; hud(); if(!E.readyUnits(S,1).length) $('#hint').textContent='모든 유닛이 움직였다 · Enter로 턴 종료'; }
function startTarget(kind){
  closeMenu(); const moved=sel.x!==orig.x||sel.y!==orig.y;
  let list;
  if(kind==='attack') list=E.targetsFrom(S,sel,sel.x,sel.y,moved);
  else if(kind==='heal') list=E.healTargets(S,sel).map(o=>({unit:o,x:o.x,y:o.y}));
  else list=E.convertTargets(S,sel).map(o=>({unit:o,x:o.x,y:o.y}));
  tgt={list,i:0,kind}; mode='target';
  const set=new Set(list.map(t=>E.key(t.x,t.y)));
  if(kind==='heal'){ ui.helpSet=set; ui.atkSet=null; } else { ui.atkSet=set; ui.helpSet=null; }
  ui.cursor=[list[0].x,list[0].y]; hud();
}
async function fire(){
  const t=tgt.list[tgt.i], kind=tgt.kind; commit(); ui.atkSet=null; ui.helpSet=null; tgt=null; busy=true;
  if(kind==='attack') E.attack(S,sel,t); else if(kind==='heal') E.heal(S,sel,t.unit); else E.convert(S,sel,t.unit);
  if(S.units.includes(sel)) sel.done=true; processEvents(); hud();
  await sleep(reduced?100:520); busy=false; done();
}
function showInfo(){
  const [x,y]=ui.cursor, u=E.unitAt(S,x,y); if(!u) return;
  const d=UNITS[u.type];
  mode='info';
  const rows=[{label:`${CLS[d.cls]} · 공격 ${d.atk||'—'} · 방어 ${d.def}`},{label:`이동 ${d.mv} · 사거리 ${rngText(E.rangeOf(S,u))} · 체력 ${u.hp}`},
    ...(d.sp||[]).map(s=>({label:SPECIALS[s][0],note:SPECIALS[s][1]}))];
  if(d.bonus==='cav') rows.push({label:'기병식 상성',note:'보병·원거리에 +33%, 건물에 −50%'});
  if(d.heal) rows.push({label:'치유 · 개종',note:`이웃 아군 +${d.heal} · 1~2칸 적 개종 ${d.convert}%`});
  if(d.hero) rows.push({label:'영웅',note:'다시 만들 수 없다. 개종하지 않는다.'});
  else rows.push({label:'가격',note:price(E.priceOf(S,u.owner,u.type))});
  openMenu(`${d.name} · ${side(u.owner)}`,rows,()=>{mode='idle';});
}

/* ---------- CPU 차례 ---------- */
async function runCPU(){
  mode='cpu'; hud(); let guard=0;
  const wait=ms=>sleep(fast?ms/5:ms);
  while(S && !S.winner && S.turn===2 && guard++<400){
    const a=AI.next(S);
    if(a.k==='end'){ AI.apply(S,a); break; }
    if(a.k==='build'){ ui.cursor=[a.x,a.y]; hud(); await wait(220); AI.apply(S,a); processEvents(); hud(); await wait(160); continue; }
    if(a.k==='move'){
      const u=S.units.find(v=>v.id===a.id); ui.cursor=[u.x,u.y]; hud(); await wait(240);
      if(a.path.length>1){ ui.anim={id:u.id,path:a.path,t0:performance.now(),dur:(fast||reduced?14:65)*(a.path.length-1)}; await sleep(ui.anim.dur); ui.anim=null; }
      ui.cursor=[a.x,a.y];
      AI.apply(S,a); processEvents(); hud();
      await wait(a.act==='attack'||a.act==='convert'?560:a.act==='capture'||a.act==='heal'?300:120);
      if(finishCheck()) return;
    }
  }
  fast=false;
  if(finishCheck()) return;
  if(S.turn===2){ E.endTurn(S); }
  const first=E.readyUnits(S,1)[0]; ui.cursor=first?[first.x,first.y]:E.findTC(S,1);
  hud(); beginTurn();
}

/* ---------- 키보드 ---------- */
const KEYMAP={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyX:'z',KeyZ:'x',KeyS:'a',KeyA:'s',Enter:'enter',NumpadEnter:'enter',Space:'z'};
document.addEventListener('keydown',e=>{
  if(!S||tab!=='play') return;
  const el=document.activeElement; if(el&&(el.tagName==='TEXTAREA'||el.tagName==='SELECT'||el.tagName==='INPUT')) return;
  if(e.metaKey||e.ctrlKey||e.altKey) return;
  if(e.key==='Shift'){ if(mode==='idle'){ const u=E.unitAt(S,...ui.cursor); if(u){ ui.atkSet=rangeTiles(u); } } return; }
  const k=KEYMAP[e.code]||({x:'z',z:'x',s:'a',a:'s',X:'z',Z:'x',S:'a',A:'s'})[e.key]||(e.key==='Enter'?'enter':null)||({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'})[e.key];
  if(!k) return;
  e.preventDefault(); key(k);
});
document.addEventListener('keyup',e=>{ if(S&&e.key==='Shift'&&mode==='idle'){ ui.atkSet=null; } });
function key(k){
  if(!S) return;
  if(mode==='over'){ if(k==='z'||k==='enter') backToSetup(); return; }
  if(mode==='cpu'){ if(k==='x'||k==='z'){ fast=true; } return; }
  if(busy) return;
  const mv={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[k];
  if(menu){
    if(mv&&mv[1]){ const n=menu.items.length; let i=menu.i; for(let s=0;s<n;s++){ i=(i+mv[1]+n)%n; if(!menu.items[i].off||mode==='info') break; } menu.i=i; drawMenu(); }
    else if(k==='z'){ if(mode==='info'){ closeMenu(); mode='idle'; return hud(); } const it=menu.items[menu.i]; if(it&&!it.off&&it.fn) it.fn(); }
    else if(k==='x'||(k==='s'&&mode==='info')){ const cb=menu.onCancel; const keep=cb&&cb()===false; if(!keep){ closeMenu(); } hud(); }
    return;
  }
  if(mode==='target'){
    if(mv){ const n=tgt.list.length; tgt.i=(tgt.i+(mv[0]+mv[1]>0?1:-1)+n)%n; const t=tgt.list[tgt.i]; ui.cursor=[t.x,t.y]; hud(); }
    else if(k==='z') fire();
    else if(k==='x'){ tgt=null; ui.atkSet=null; ui.helpSet=null; actionMenu(); }
    return;
  }
  if(mv){ const [x,y]=ui.cursor; ui.cursor=[Math.max(0,Math.min(S.map.W-1,x+mv[0])),Math.max(0,Math.min(S.map.H-1,y+mv[1]))]; if(mode==='idle') ui.atkSet=null; updatePath(); hud(); return; }
  if(mode==='move'){
    if(k==='z') moveTo();
    else if(k==='x'){ ui.cursor=[orig.x,orig.y]; clearSel(); mode='idle'; hud(); }
    return;
  }
  if(mode==='idle'){
    const [x,y]=ui.cursor, u=E.unitAt(S,x,y);
    if(k==='z'){
      if(u&&u.owner===1&&!u.done) select(u);
      else if(u&&u.owner===2){ ui.atkSet=ui.atkSet?null:rangeTiles(u); }
      else if(!u&&E.canBuildAt(S,1,x,y).length) buildMenu(x,y);
      else mainMenu();
    } else if(k==='x'){ ui.atkSet=null; }
    else if(k==='a'){ const r=E.readyUnits(S,1); if(r.length){ const i=r.findIndex(v=>v.x===x&&v.y===y); const n=r[(i+1)%r.length]; ui.cursor=[n.x,n.y]; hud(); } }
    else if(k==='s') showInfo();
    else if(k==='enter') mainMenu();
  }
}
document.querySelectorAll('#touchpad [data-key]').forEach(b=>{
  b.addEventListener('pointerdown',e=>{e.preventDefault();const m={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',x:'z',z:'x',s:'a',a:'s',Enter:'enter'}[b.dataset.key];key(m);});
});
canvas.addEventListener('click',e=>{
  if(!S||mode==='cpu'||busy||menu) return;
  const r=canvas.getBoundingClientRect(), x=Math.floor((e.clientX-r.left)/r.width*S.map.W), y=Math.floor(((e.clientY-r.top)/r.height*canvas.height-R.PAD)/R.T);
  if(x<0||y<0||x>=S.map.W||y>=S.map.H) return;
  if(mode==='target'){ const i=tgt.list.findIndex(t=>t.x===x&&t.y===y); if(i<0) return; if(i===tgt.i) return key('z'); tgt.i=i; ui.cursor=[x,y]; return hud(); }
  if(ui.cursor[0]===x&&ui.cursor[1]===y) return key('z');
  ui.cursor=[x,y]; updatePath(); hud();
});

/* ---------- 시험용 연결 ---------- */
window.render_game_to_text=()=>JSON.stringify(S?{mode,day:S.day,turn:S.turn,winner:S.winner,cursor:ui.cursor,menu:menu?menu.items.map(i=>i.label):null,menuIndex:menu?menu.i:null,
  food:[S.players[1].food,S.players[2].food],gold:[S.players[1].gold,S.players[2].gold],cap:[E.unitCap(S,1),E.unitCap(S,2)],
  units:S.units.map(u=>({id:u.id,t:u.type,o:u.owner,x:u.x,y:u.y,hp:u.hp,done:u.done}))}:{mode:'setup',cfg});
window.__dongHyunWar={get state(){return S;},key,get mode(){return mode;}};
sortieCard(cfg); preview(cfg); renderSlotList();
})();
