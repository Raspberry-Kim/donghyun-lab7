/* 동현워 규칙 엔진. 화면과 분리된 순수 규칙이라 Node 시험에서도 그대로 돌린다.
   피해 공식은 원작의 정확한 식이 공개되지 않아 근사식을 쓴다:
   피해 = 50 × (실효 공격 ÷ 실효 방어) × 운(0.9~1.1). 실효 공격은 체력에 비례해 줄어든다(광분 제외).
   건물을 칠 때는 계수 35를 쓴다. */
(function(root){
const G = (typeof module!=='undefined') ? require('./data.js') : root.DH_DATA;
const {TERRAIN,BUILDINGS,UNITS,BUILD,TECH_DISCOUNT,MERC_RATE,CIVS,MAPS,MERCS} = G;
const key = (x,y) => y*1000+x;
const disp = hp => Math.ceil(hp/10);
const has = (u,sp) => !!(UNITS[u.type].sp && UNITS[u.type].sp.includes(sp));

function rng(state){ // 상태 안에 둔 결정론적 난수(재현 시험용)
  let s = state.seed>>>0; s ^= s<<13; s>>>=0; s ^= s>>>17; s ^= s<<5; s>>>=0; state.seed = s||1; return (s>>>0)/4294967296;
}
const civOf = (s,p) => CIVS[s.players[p].civ-1];
const tile = (s,x,y) => (x>=0&&y>=0&&x<s.map.W&&y<s.map.H) ? s.map.grid[y][x] : null;
const unitAt = (s,x,y) => s.units.find(u=>u.x===x&&u.y===y) || null;
const dist = (ax,ay,bx,by) => Math.abs(ax-bx)+Math.abs(ay-by);
function event(s, e){ s.events.push(e); if(s.events.length>2000) s.events.shift(); }

function newGame(opts){
  const m = MAPS.find(m=>m.id===opts.map) || MAPS[0];
  const grid = m.grid.map(r=>r.map(c=>({t:c.t, b:c.b?{...c.b}:null, cp:20, capId:0})));
  const funds = opts.funds!=null ? opts.funds : 500;
  const state = {
    map:{id:m.id,name:m.name,W:m.W,H:m.H,grid},
    units:[], nextId:1, day:1, turn:opts.first||1, first:opts.first||1, winner:0, reason:'',
    seed: opts.seed || (Math.floor(Math.random()*2147483646)+1),
    players:[null,
      {civ:opts.civ1||1, food:funds, gold:funds, ai:false, had:true, built:0, lost:0, kills:0, converted:0, mercs:[]},
      {civ:opts.civ2||1, food:funds, gold:funds, ai:true,  had:true, built:0, lost:0, kills:0, converted:0, mercs:[]}],
    events:[]
  };
  // 영웅은 마을회관 곁 빈 칸에서 시작한다
  for(const p of [1,2]){
    const [hx,hy]=findTC(state,p), type=civOf(state,p).hero;
    let spot=null;
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1],[0,2],[0,-2],[2,0],[-2,0]]){
      const x=hx+dx,y=hy+dy,t=tile(state,x,y); if(!t||t.b||unitAt(state,x,y)) continue;
      if(!moveCost(state,{type,owner:p},x,y)) continue; spot=[x,y]; break; }
    if(!spot) spot=[hx,hy];
    state.units.push({id:state.nextId++, type, owner:p, x:spot[0], y:spot[1], hp:100, done:false});
  }
  rollMercs(state,1); rollMercs(state,2);
  startTurn(state, state.turn, true);
  return state;
}
function findTC(s,p){ for(let y=0;y<s.map.H;y++) for(let x=0;x<s.map.W;x++){ const b=s.map.grid[y][x].b; if(b&&b.type==='tc'&&b.owner===p) return [x,y]; } return [0,0]; }

/* ---- 이동 ---- */
function moveCost(s,u,x,y){
  const c=tile(s,x,y); if(!c) return 0;
  const d=UNITS[u.type];
  if(c.b) return 1; // 건물 위는 길과 같다(산 위 성·광산도 공성 무기가 지날 수 있다)
  const T=TERRAIN[c.t]; let k=T.cost; if(!k) return 0;
  if(d.mt==='siege' && T.noSiege) return 0;
  if(d.mt==='horse' && T.noHorse) return 0;
  if(has(u,'scout')) k=Math.min(k,2);
  return k;
}
function reach(s,u){
  // 다익스트라. 적 유닛은 지나갈 수 없다. 적 건물에는 들어가 멈출 수만 있다.
  const pts=UNITS[u.type].mv, W=s.map.W,H=s.map.H, dist=new Map(), prev=new Map();
  const open=[[0,u.x,u.y]]; dist.set(key(u.x,u.y),0);
  while(open.length){
    let bi=0; for(let i=1;i<open.length;i++) if(open[i][0]<open[bi][0]) bi=i;
    const [c,x,y]=open.splice(bi,1)[0]; if(c>dist.get(key(x,y))) continue;
    const here=s.map.grid[y][x];
    if((x!==u.x||y!==u.y) && here.b && here.b.owner && here.b.owner!==u.owner) continue;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue;
      const mc=moveCost(s,u,nx,ny); if(!mc) continue;
      const nc=c+mc; if(nc>pts) continue;
      const o=unitAt(s,nx,ny); if(o && o.owner!==u.owner) continue;
      const k=key(nx,ny); if(!dist.has(k)||nc<dist.get(k)){ dist.set(k,nc); prev.set(k,key(x,y)); open.push([nc,nx,ny]); }
    }
  }
  return {dist, prev};
}
function pathTo(r, sx,sy, x,y){
  const p=[]; let k=key(x,y); if(!r.dist.has(k)) return null;
  while(k!==undefined){ p.unshift([k%1000, Math.floor(k/1000)]); if(k===key(sx,sy)) break; k=r.prev.get(k); }
  return p;
}
function stopOK(s,u,x,y){ const o=unitAt(s,x,y); return !o||o===u; }

/* ---- 전투 ---- */
function coverAt(s,x,y){ const c=tile(s,x,y); return c.b ? BUILDINGS[c.b.type].cover : TERRAIN[c.t].def; }
function rangeOf(s,u,x,y){
  const d=UNITS[u.type]; if(!d.rng) return null; let [a,b]=d.rng;
  if(b>1){ const c=tile(s,x==null?u.x:x,y==null?u.y:y); b=Math.max(a,b+TERRAIN[c.t].rng); }
  return [a,b];
}
function canHit(s,a,tx,ty,isBldg){
  if(!UNITS[a.type].rng) return false;
  if(isBldg) return !has(a,'unitsOnly');
  if(has(a,'bldgOnly')) return false;
  // 말 탄 근접 기병은 늪 안의 유닛을 칠 수 없다
  if(UNITS[a.type].cls==='cav' && TERRAIN[tile(s,tx,ty).t].noHorse) return false;
  return true;
}
function targetsFrom(s,u,x,y,moved){
  const r=rangeOf(s,u,x,y); if(!r) return [];
  if(moved && has(u,'noMA')) return [];
  const out=[];
  for(const o of s.units){ if(o.owner===u.owner) continue; const dd=dist(x,y,o.x,o.y); if(dd>=r[0]&&dd<=r[1]&&canHit(s,u,o.x,o.y,false)) out.push({unit:o,x:o.x,y:o.y}); }
  for(let yy=0;yy<s.map.H;yy++) for(let xx=0;xx<s.map.W;xx++){ const c=s.map.grid[yy][xx];
    if(!c.b||!c.b.owner||c.b.owner===u.owner||unitAt(s,xx,yy)) continue;
    const dd=dist(x,y,xx,yy); if(dd>=r[0]&&dd<=r[1]&&canHit(s,u,xx,yy,true)) out.push({bldg:c.b,x:xx,y:yy}); }
  return out;
}
const firstAgainst = (d,a,dd) => has(d,'first') || (has(d,'skirmish')&&dd===1) || (has(d,'anticav')&&UNITS[a.type].cls==='cav');
function canCounter(s,d,a,ax,ay){
  if(!UNITS[d.type].rng || has(d,'noCounter')) return false;
  const r=rangeOf(s,d,d.x,d.y), dd=dist(ax,ay,d.x,d.y);
  if(dd<r[0]||dd>r[1]) return false;
  return !has(d,'bldgOnly');
}
/* 한 번 치는 피해. att는 치는 쪽, def는 맞는 쪽. bx,by는 싸우는 칸(맞는 쪽이 선 칸). */
function strike(s,att,ahp,def,dhp,bx,by,ax,ay,luck){
  const A0=UNITS[att.type], D0=UNITS[def.type], c=tile(s,bx,by), T=TERRAIN[c.t];
  let A=A0.atk*(has(att,'frenzy')?1:ahp/100), D=D0.def*(1+coverAt(s,def.x,def.y)/100);
  const bc=A0.bonus||A0.cls;
  if(bc==='inf' && D0.cls==='siege') A*=1.33;
  if(bc==='cav' && (D0.cls==='inf'||D0.cls==='rng'||D0.cls==='monk')) A*=1.33;
  const flat=!c.b;
  if(has(att,'plains') && T.plains && flat && !has(def,'plains')) A*=1.33;
  if(has(att,'desert') && T.desert && flat && !has(def,'desert')) A*=1.33;
  if(has(att,'scares') && D0.horse) A*=1.33;
  if(has(att,'anticav') && D0.cls==='cav') A*=1.83;
  if(has(def,'anticav') && A0.cls==='cav') D*=1.83;
  if(has(att,'volley') && ahp>50) A*=1.5;
  if(T.forest){ if(has(att,'woodsman')) A*=1.33; if(has(def,'woodsman')) D*=1.33; }
  if(has(def,'fear')) A*=0.67;
  if(has(att,'fear')) D*=0.67;
  return Math.max(1, Math.round(50*A/D*luck));
}
function strikeBldg(s,att,ahp,b,luck){
  const A0=UNITS[att.type]; let A=A0.atk*(has(att,'frenzy')?1:ahp/100);
  const bc=A0.bonus||A0.cls;
  if(bc==='inf') A*=1.33; else if(bc==='cav'||bc==='rng') A*=0.5; else if(bc==='siege') A*=1.5;
  if(has(att,'volley') && ahp>50) A*=1.5;
  return Math.max(1, Math.round(35*A/BUILDINGS[b.type].def*luck));
}
const LUCK = {min:()=>0.9, max:()=>1.1, mid:()=>1};
/* 싸움 한 번을 순서대로 계산한다. mode: rand(실제) · min · max · mid(예상). 상태는 바꾸지 않는다. */
function simulate(s,a,tg,ax,ay,mode){
  const L = mode==='rand' ? ()=>0.9+0.2*rng(s) : LUCK[mode];
  let ahp=a.hp;
  if(tg.bldg){ const d=strikeBldg(s,a,ahp,tg.bldg,L()); return {steps:[['a',Math.min(d,tg.bldg.hp)]], dDmg:Math.min(d,tg.bldg.hp), aDmg:0}; }
  const d=tg.unit; let dhp=d.hp; const steps=[];
  const save={x:a.x,y:a.y}; a.x=ax; a.y=ay;
  const cc=canCounter(s,d,a,ax,ay), dd=dist(ax,ay,d.x,d.y);
  const defFirst=cc && firstAgainst(d,a,dd) && !firstAgainst(a,d,dd);
  const hitD=()=>{ if(ahp<=0||dhp<=0) return; const x=Math.min(dhp,strike(s,a,ahp,d,dhp,d.x,d.y,ax,ay,L())); dhp-=x; steps.push(['a',x]); };
  const hitA=()=>{ if(ahp<=0||dhp<=0||!cc) return; const x=Math.min(ahp,strike(s,d,dhp,a,ahp,d.x,d.y,d.x,d.y,L())); ahp-=x; steps.push(['d',x]); };
  if(defFirst){ hitA(); hitD(); } else { hitD(); hitA(); }
  if(has(a,'rapid')) hitD();
  if(has(d,'rapid')) hitA();
  a.x=save.x; a.y=save.y;
  return {steps, dDmg:d.hp-dhp, aDmg:a.hp-ahp, defFirst};
}
function forecast(s,a,tg,ax,ay){
  const lo=simulate(s,a,tg,ax,ay,'min'), hi=simulate(s,a,tg,ax,ay,'max'), mid=simulate(s,a,tg,ax,ay,'mid');
  return {lo:Math.min(lo.dDmg,hi.dDmg), hi:Math.max(lo.dDmg,hi.dDmg), counterLo:Math.min(lo.aDmg,hi.aDmg), counter:Math.max(lo.aDmg,hi.aDmg), mid, defFirst:mid.defFirst};
}
function destroy(s,u,by){
  const i=s.units.indexOf(u); if(i>=0) s.units.splice(i,1);
  const t=tile(s,u.x,u.y); if(t && t.capId===u.id){ t.cp=20; t.capId=0; }
  s.players[u.owner].lost++; if(by) s.players[by].kills++;
  event(s,{k:'destroy', id:u.id, type:u.type, owner:u.owner, x:u.x, y:u.y});
}
function attack(s,a,tg){
  if(tg.bldg){
    const r=simulate(s,a,tg,a.x,a.y,'rand'), b=tg.bldg, old=b.owner;
    b.hp-=r.dDmg;
    event(s,{k:'hitb', a:a.id, at:a.type, ao:a.owner, bt:b.type, bo:old, ax:a.x, ay:a.y, dx:tg.x, dy:tg.y, dmg:r.dDmg});
    if(b.hp<=0){
      if(b.type==='tc'){ b.hp=0; s.winner=a.owner; s.reason='마을회관 파괴'; }
      else { b.owner=0; b.hp=50; }
      const c=tile(s,tg.x,tg.y); c.cp=20; c.capId=0;
      event(s,{k:'ruin', bt:b.type, owner:old, by:a.owner, x:tg.x, y:tg.y});
    }
    checkEnd(s); return {dmg:r.dDmg, counter:0};
  }
  const d=tg.unit, r=simulate(s,a,tg,a.x,a.y,'rand');
  d.hp-=r.dDmg; a.hp-=r.aDmg;
  event(s,{k:'attack', a:a.id, d:d.id, at:a.type, dt:d.type, ao:a.owner, do:d.owner, ax:a.x, ay:a.y, dx:d.x, dy:d.y, dmg:r.dDmg, counter:r.aDmg, first:r.defFirst});
  // 열의: 유닛(공성 무기 제외)과 싸우고 살아남으면 +20
  for(const [me,foe] of [[a,d],[d,a]]) if(me.hp>0 && has(me,'zeal') && UNITS[foe.type].cls!=='siege' && (me===a||r.steps.some(x=>x[0]==='d'))){ me.hp=Math.min(100,me.hp+20); }
  if(d.hp<=0) destroy(s,d,a.owner);
  if(a.hp<=0) destroy(s,a,d.owner);
  checkEnd(s);
  return {dmg:r.dDmg, counter:r.aDmg};
}

/* ---- 수도사 ---- */
function healTargets(s,m){ return s.units.filter(o=>o.owner===m.owner&&o!==m&&o.hp<100&&UNITS[o.type].cls!=='siege'&&dist(o.x,o.y,m.x,m.y)===1); }
function heal(s,m,o){ const add=Math.min(100-o.hp,UNITS[m.type].heal); o.hp+=add; event(s,{k:'heal',id:m.id,type:m.type,owner:m.owner,tt:o.type,add,x:o.x,y:o.y}); return add; }
function convertTargets(s,m){ return s.units.filter(o=>o.owner!==m.owner&&!UNITS[o.type].hero&&!UNITS[o.type].unique&&dist(o.x,o.y,m.x,m.y)>=1&&dist(o.x,o.y,m.x,m.y)<=2); }
function convertChance(m,o){ return UNITS[m.type].convert/100*(m.hp/100)*(dist(o.x,o.y,m.x,m.y)===1?1:0.5); }
function convert(s,m,o){
  const p=convertChance(m,o), ok=rng(s)<p, from=o.owner;
  if(ok){ const t=tile(s,o.x,o.y); if(t.capId===o.id){t.cp=20;t.capId=0;} o.owner=m.owner; o.done=true; s.players[m.owner].converted++; s.players[from].lost++; }
  event(s,{k:'convert',id:m.id,owner:m.owner,tt:o.type,ok,from,x:o.x,y:o.y,pct:Math.round(p*100)});
  checkEnd(s); return ok;
}

/* ---- 점령·생산·수입 ---- */
function canCapture(s,u){ const t=tile(s,u.x,u.y); return !!(UNITS[u.type].cap && t.b && t.b.owner!==u.owner); }
function capNeed(b){ return Math.max(1,Math.ceil(20*b.hp/100)); }
function capture(s,u){
  const t=tile(s,u.x,u.y), b=t.b;
  const pts=disp(u.hp)*UNITS[u.type].cap;
  if(t.capId!==u.id){ t.cp=capNeed(b); t.capId=u.id; }
  t.cp-=pts;
  const done=t.cp<=0, old=b.owner;
  if(done){ b.owner=u.owner; t.cp=20; t.capId=0; if(b.type==='tc'){ s.winner=u.owner; s.reason='마을회관 점령'; } }
  event(s,{k:'capture', id:u.id, type:u.type, owner:u.owner, bt:b.type, from:old, x:u.x, y:u.y, left:done?0:t.cp, done});
  checkEnd(s);
  return done;
}
function priceOf(s,p,type){
  const d=UNITS[type], off=TECH_DISCOUNT[d.cls]||0; let f=Math.max(0,d.f-off), g=Math.max(0,d.g-off);
  if(d.merc){ f=Math.round(d.f*MERC_RATE/5)*5; g=Math.round(d.g*MERC_RATE/5)*5; }
  return {f,g};
}
function canBuildAt(s,p,x,y){
  const t=tile(s,x,y); if(!t||!t.b||t.b.owner!==p||!BUILD[t.b.type]) return [];
  const out=[];
  for(const k of BUILD[t.b.type]){ if(k==='UNIQUE') out.push(civOf(s,p).unique); else if(k==='MERC') out.push(...s.players[p].mercs); else out.push(k); }
  return out;
}
function income(s,p){
  let f=0,g=0;
  for(const r of s.map.grid) for(const c of r) if(c.b&&c.b.owner===p){ const B=BUILDINGS[c.b.type], k=c.b.hp/100; f+=Math.round((B.food||0)*k); g+=Math.round((B.gold||0)*k); }
  return {f,g};
}
// 원작의 인구 한도: (식량 수입 + 금 수입) ÷ 100, 올림
function unitCap(s,p){ const i=income(s,p); return Math.ceil((i.f+i.g)/100); }
const unitCount=(s,p)=>s.units.filter(u=>u.owner===p).length;
function buildReason(s,p,x,y,type){
  if(!canBuildAt(s,p,x,y).includes(type)) return '여기서 만들 수 없다';
  if(unitAt(s,x,y)) return '건물 위에 유닛이 있다';
  if(unitCount(s,p)>=unitCap(s,p)) return `인구 한도 ${unitCap(s,p)}`;
  const pr=priceOf(s,p,type), P=s.players[p];
  if(P.food<pr.f||P.gold<pr.g) return '자원이 모자란다';
  return '';
}
function build(s,p,x,y,type){
  if(buildReason(s,p,x,y,type)) return null;
  const pr=priceOf(s,p,type), P=s.players[p]; P.food-=pr.f; P.gold-=pr.g;
  const u={id:s.nextId++, type, owner:p, x, y, hp:100, done:true};
  s.units.push(u); P.built++;
  if(UNITS[type].merc) P.mercs=P.mercs.filter(m=>m!==type); // 고용한 용병 자리는 그날 비운다
  event(s,{k:'build',id:u.id,type,x,y,owner:p});
  return u;
}
function rollMercs(s,p){ const pool=[...MERCS], out=[]; while(out.length<3){ out.push(pool.splice(Math.floor(rng(s)*pool.length),1)[0]); } s.players[p].mercs=out; }
function buildingsOf(s,p){ let n=0; for(const r of s.map.grid) for(const c of r) if(c.b&&c.b.owner===p) n++; return n; }
function startTurn(s,p,first){
  s.turn=p; const P=s.players[p];
  const inc=income(s,p);
  P.food+=inc.f; P.gold+=inc.g; // 첫 턴에도 수입을 받는다
  rollMercs(s,p);
  for(const u of s.units) if(u.owner===p){ u.done=false;
    const t=tile(s,u.x,u.y); if(!first && t.b && t.b.owner===p && u.hp<100) u.hp=Math.min(100,u.hp+20); }
  if(!first) for(const r of s.map.grid) for(const c of r) if(c.b&&c.b.owner===p&&c.b.hp<100) c.b.hp=Math.min(100,c.b.hp+10);
  event(s,{k:'turn',p,day:s.day,food:inc.f,gold:inc.g});
  checkEnd(s);
}
function endTurn(s){
  if(s.winner) return;
  const p=s.turn, q=3-p;
  if(q===s.first) s.day++;
  startTurn(s,q,false);
}
function commitMove(s,u,x,y){
  if(u.x!==x||u.y!==y){ const t=tile(s,u.x,u.y); if(t.capId===u.id){ t.cp=20; t.capId=0; } u.x=x; u.y=y; }
}
function checkEnd(s){
  if(s.winner) return s.winner;
  for(const p of [1,2]){
    // 유닛이 하나도 없고 만들 곳도 없으면 진다
    if(!s.units.some(u=>u.owner===p)){
      let canMake=false; for(let y=0;y<s.map.H&&!canMake;y++) for(let x=0;x<s.map.W;x++){ const b=s.map.grid[y][x].b; if(b&&b.owner===p&&BUILD[b.type]){ canMake=true; break; } }
      if(!canMake){ s.winner=3-p; s.reason='전멸'; }
    }
  }
  return s.winner;
}
function concede(s,p){ s.winner=3-p; s.reason='항복'; }
function readyUnits(s,p){ return s.units.filter(u=>u.owner===p&&!u.done); }
function unitValue(type){ const d=UNITS[type]; return d.hero?900:(d.f+1.5*d.g); }

const API={newGame,tile,unitAt,moveCost,reach,pathTo,stopOK,rangeOf,targetsFrom,canCounter,simulate,forecast,attack,commitMove,
  capture,canCapture,capNeed,healTargets,heal,convertTargets,convertChance,convert,priceOf,canBuildAt,buildReason,build,income,unitCap,unitCount,
  startTurn,endTurn,checkEnd,concede,readyUnits,dist,key,disp,rng,civOf,findTC,coverAt,has,unitValue,buildingsOf};
if(typeof module!=='undefined') module.exports=API; else root.Engine=API;
})(typeof self!=='undefined'?self:this);
