/* 동현워 CPU. 한 번에 행동 하나를 고른다: 유닛 행동 → 생산 → 턴 종료.
   안개 없이 공개 정보만 쓰며, 운은 평균값(1.0)으로 예상한다. 가치 = 식량 + 1.5 × 금. */
(function(root){
const E = (typeof module!=='undefined') ? require('./engine.js') : root.Engine;
const D = (typeof module!=='undefined') ? require('./data.js') : root.DH_DATA;
const {UNITS,BUILDINGS}=D;
const BVAL={tc:30000,castle:2600,market:1400,barracks:1800,archery:1800,stable:1800,workshop:1600,church:1400,mine:2400,mill:1500,farm:900,tower:700};
const val=t=>E.unitValue(t);

function field(s,u,sources){ // 여러 목표에서 거꾸로 퍼지는 이동 비용 지도(유닛 무시)
  const W=s.map.W,H=s.map.H, d=new Float64Array(W*H).fill(Infinity), open=[];
  const probe={type:u.type,owner:u.owner};
  for(const [x,y] of sources){ d[y*W+x]=0; open.push([0,x,y]); }
  while(open.length){
    let bi=0; for(let i=1;i<open.length;i++) if(open[i][0]<open[bi][0]) bi=i;
    const [c,x,y]=open.splice(bi,1)[0]; if(c>d[y*W+x]) continue;
    const here=E.moveCost(s,probe,x,y)||99;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=W||ny>=H) continue;
      if(!E.moveCost(s,probe,nx,ny)) continue;
      const nc=c+here; if(nc<d[ny*W+nx]){ d[ny*W+nx]=nc; open.push([nc,nx,ny]); }
    }
  }
  return (x,y)=>d[y*W+x];
}
function makeCtx(s,p){
  const q=3-p, ctx={p,q,fields:{}};
  ctx.enemies=s.units.filter(u=>u.owner===q);
  ctx.mine=s.units.filter(u=>u.owner===p);
  ctx.threat=[];
  for(const e of ctx.enemies){
    const d=UNITS[e.type]; if(!d.rng) continue;
    const cells=new Set(), R=E.reach(s,e);
    for(const k of R.dist.keys()){ const x=k%1000,y=Math.floor(k/1000), r=E.rangeOf(s,e,x,y);
      if(E.has(e,'noMA') && (x!==e.x||y!==e.y)) continue;
      for(let dy=-r[1];dy<=r[1];dy++) for(let dx=-r[1];dx<=r[1];dx++){ const dd=Math.abs(dx)+Math.abs(dy); if(dd>=r[0]&&dd<=r[1]) cells.add(E.key(x+dx,y+dy)); } }
    ctx.threat.push([e,cells]);
  }
  ctx.bldgs=[]; ctx.myB=[];
  for(let y=0;y<s.map.H;y++) for(let x=0;x<s.map.W;x++){ const b=s.map.grid[y][x].b; if(!b) continue; if(b.owner!==p) ctx.bldgs.push([x,y]); else ctx.myB.push([x,y]); }
  return ctx;
}
function getField(s,ctx,u,name,src){ const k=UNITS[u.type].mt+(E.has(u,'scout')?'s':'')+':'+name; if(!ctx.fields[k]){ const a=src(); ctx.fields[k]=a.length?field(s,u,a):()=>Infinity; } return ctx.fields[k]; }
function threatAt(s,ctx,u,x,y){
  let v=0; const sx=u.x,sy=u.y; u.x=x; u.y=y;
  for(const [e,cells] of ctx.threat){ if(!cells.has(E.key(x,y))) continue;
    if(E.has(e,'bldgOnly')) continue;
    const r=E.simulate(s,e,{unit:u},e.x,e.y,'mid'); v+=Math.min(u.hp,r.dDmg)/100*val(u.type); }
  u.x=sx; u.y=sy; return v;
}
function bestFor(s,ctx,u){
  const d=UNITS[u.type], R=E.reach(s,u), cost=val(u.type), P=ctx.p;
  const enemyField=getField(s,ctx,u,'enemy',()=>ctx.enemies.map(e=>[e.x,e.y]));
  const bField=getField(s,ctx,u,'bldg',()=>ctx.bldgs);
  const tcField=getField(s,ctx,u,'tc',()=>ctx.bldgs.filter(([x,y])=>s.map.grid[y][x].b.type==='tc'));
  const homeField=getField(s,ctx,u,'home',()=>ctx.myB);
  const hurtField=d.cls==='monk'?getField(s,ctx,u,'hurt',()=>ctx.mine.filter(o=>o!==u&&o.hp<70&&UNITS[o.type].cls!=='siege').map(o=>[o.x,o.y])):null;
  const wantHeal=u.hp<=40 && !d.cap;
  let best={v:-Infinity};
  const consider=(v,plan)=>{ if(v>best.v) best={v,...plan}; };
  for(const k of R.dist.keys()){
    const x=k%1000,y=Math.floor(k/1000);
    if(!E.stopOK(s,u,x,y)) continue;
    const moved=(x!==u.x||y!==u.y), t=s.map.grid[y][x];
    const risk=threatAt(s,ctx,u,x,y)*(d.hero?0.9:0.55);
    const cover=E.coverAt(s,x,y);
    for(const tg of E.targetsFrom(s,u,x,y,moved)){
      const r=E.simulate(s,u,tg,x,y,'mid');
      let v;
      if(tg.bldg){ const bv=BVAL[tg.bldg.type]||800; v=r.dDmg/100*bv*0.8 + (r.dDmg>=tg.bldg.hp?bv*(tg.bldg.type==='tc'?5:0.4):0); }
      else { const tv=val(tg.unit.type); v=r.dDmg/100*tv - r.aDmg/100*cost*0.9; if(r.dDmg>=tg.unit.hp) v+=tv*0.35;
        const tt=s.map.grid[tg.y][tg.x]; if(tt.capId===tg.unit.id && tt.b && tt.b.owner===P) v+=2500+(tt.b.type==='tc'?20000:0); }
      consider(v-risk*0.5+cover*10+300,{x,y,act:'attack',tx:tg.x,ty:tg.y});
    }
    if(d.cls==='monk'){
      const sx=u.x,sy=u.y; u.x=x;u.y=y;
      for(const o of E.healTargets(s,u)){ const add=Math.min(100-o.hp,d.heal); consider(add/100*val(o.type)*1.1-risk*0.6+200,{x,y,act:'heal',tx:o.x,ty:o.y}); }
      for(const o of E.convertTargets(s,u)){ const pc=E.convertChance(u,o); consider(pc*val(o.type)*2*o.hp/100-risk*0.7+150,{x,y,act:'convert',tx:o.x,ty:o.y}); }
      u.x=sx;u.y=sy;
    }
    if(d.cap && t.b && t.b.owner!==P){
      const left=t.capId===u.id?t.cp:E.capNeed(t.b), pts=E.disp(u.hp)*d.cap, finish=pts>=left;
      const bv=BVAL[t.b.type]||800;
      consider(bv*(finish?1.4:0.9)+(t.b.owner?600:0)+(t.capId===u.id?1500:0)+(t.b.type==='tc'&&finish?50000:0)-risk*0.6,{x,y,act:'capture'});
    }
    let pos;
    if(wantHeal) pos=-homeField(x,y)*200+(t.b&&t.b.owner===P?1200:0);
    else if(d.cls==='monk') pos=-Math.min(hurtField(x,y),enemyField(x,y)+3)*150;
    else if(d.cap) pos=-Math.min(bField(x,y),enemyField(x,y)+6)*180;
    else if(E.has(u,'bldgOnly')) pos=-bField(x,y)*170;
    else if(d.rng && d.rng[1]>1){ const r=E.rangeOf(s,u,x,y), ef=enemyField(x,y); pos=-Math.max(0,ef-r[1])*160-(ef<r[0]?300:0); }
    else pos=-Math.min(enemyField(x,y),tcField(x,y)+4)*170;
    if(!isFinite(pos)) pos=-tcField(x,y)*100; if(!isFinite(pos)) pos=-5000;
    if(t.b&&t.b.owner!==P&&!d.cap) pos-=2500; // 점령 못 하는 유닛이 적 건물 칸을 막지 않는다
    if(t.b&&t.b.owner===P&&D.BUILD[t.b.type]&&!wantHeal) pos-=moved?250:600; // 생산 건물을 막지 않는다
    consider(pos-risk+cover*20,{x,y,act:'wait'});
  }
  return best;
}
function chooseBuild(s,ctx,x,y,options){
  const p=ctx.p, P=s.players[p], ok=t=>{ if(!options.includes(t)) return false; const pr=E.priceOf(s,p,t); return P.food>=pr.f&&P.gold>=pr.g; };
  const cnt=(arr,f)=>arr.filter(f).length;
  const eCav=cnt(ctx.enemies,u=>UNITS[u.type].cls==='cav'), eInf=cnt(ctx.enemies,u=>UNITS[u.type].cls==='inf'), eRng=cnt(ctx.enemies,u=>UNITS[u.type].cls==='rng');
  const myCap=cnt(ctx.mine,u=>UNITS[u.type].cap), freeB=ctx.bldgs.filter(([bx,by])=>!s.map.grid[by][bx].b.owner).length;
  const kind=s.map.grid[y][x].b.type, r=E.rng(s);
  const pick=list=>{ for(const t of list) if(ok(t)) return t; return null; };
  if(kind==='tc') return myCap<Math.min(4,1+Math.ceil(freeB/3)) ? pick(['villager']) : null;
  if(kind==='barracks') return eCav>eInf ? pick(['pike','champion']) : pick(r<0.6?['champion','pike']:['pike','champion']);
  if(kind==='stable') return eCav>=2&&r<0.5 ? pick(['camel','paladin']) : pick(eRng>1&&r<0.4?['paladin','scout']:['paladin','camel','scout']);
  if(kind==='archery') return eInf>eRng ? pick(r<0.5?['arbalest','hha']:['hha','arbalest']) : pick(['skirm','arbalest']);
  if(kind==='workshop'){ const sg=cnt(ctx.mine,u=>UNITS[u.type].cls==='siege'); if(sg>=Math.max(1,ctx.mine.length/4)) return null; return pick(r<0.4?['onager','ram']:r<0.7?['bombard','scorpion']:['ram','onager']); }
  if(kind==='church'){ const m=cnt(ctx.mine,u=>u.type==='monk'); return m<Math.min(2,Math.floor(ctx.mine.length/4))?pick(['monk']):null; }
  if(kind==='castle') return pick(r<0.75?options.filter(t=>t!=='trebuchet'):['trebuchet',...options]);
  if(kind==='market') return r<0.35?pick(options):null;
  return null;
}
function next(s){
  if(s.winner) return null;
  const p=s.turn, ready=E.readyUnits(s,p);
  if(ready.length){
    const ctx=makeCtx(s,p);
    const order=u=>{const d=UNITS[u.type]; return d.cls==='monk'?3 : (d.rng&&d.rng[1]>1)?0 : E.targetsFrom(s,u,u.x,u.y,false).length?1 : d.cap?2 : 4;};
    ready.sort((a,b)=>order(a)-order(b));
    const u=ready[0], b=bestFor(s,ctx,u);
    if(!isFinite(b.v)) return {k:'move',id:u.id,x:u.x,y:u.y,path:[[u.x,u.y]],act:'wait'};
    const R=E.reach(s,u), path=E.pathTo(R,u.x,u.y,b.x,b.y)||[[u.x,u.y]];
    return {k:'move',id:u.id,x:b.x,y:b.y,path,act:b.act,tx:b.tx,ty:b.ty};
  }
  const ctx=makeCtx(s,p), cap=E.unitCap(s,p);
  if(E.unitCount(s,p)<cap){
    const rank={castle:0,stable:1,barracks:2,archery:3,tc:4,church:5,workshop:6,market:7};
    const spots=[];
    for(const [x,y] of ctx.myB){ const o=E.canBuildAt(s,p,x,y); if(o.length&&!E.unitAt(s,x,y)) spots.push([x,y,o]); }
    spots.sort((a,b)=>(rank[s.map.grid[a[1]][a[0]].b.type]??9)-(rank[s.map.grid[b[1]][b[0]].b.type]??9));
    if(!s._aiTried) s._aiTried=new Set();
    for(const [x,y,o] of spots){ const k=E.key(x,y); if(s._aiTried.has(k)) continue; s._aiTried.add(k);
      const type=chooseBuild(s,ctx,x,y,o); if(type) return {k:'build',x,y,type}; }
  }
  s._aiTried=null;
  return {k:'end'};
}
function apply(s,a){
  if(a.k==='build') return E.build(s,s.turn,a.x,a.y,a.type);
  if(a.k==='end'){ s._aiTried=null; E.endTurn(s); return true; }
  if(a.k==='move'){
    const u=s.units.find(u=>u.id===a.id); if(!u) return false;
    const moved=u.x!==a.x||u.y!==a.y;
    E.commitMove(s,u,a.x,a.y);
    if(a.act==='attack'){ const tg=E.targetsFrom(s,u,u.x,u.y,moved).find(t=>t.x===a.tx&&t.y===a.ty); if(tg) E.attack(s,u,tg); }
    else if(a.act==='capture') E.capture(s,u);
    else if(a.act==='heal'){ const o=E.unitAt(s,a.tx,a.ty); if(o) E.heal(s,u,o); }
    else if(a.act==='convert'){ const o=E.unitAt(s,a.tx,a.ty); if(o) E.convert(s,u,o); }
    if(s.units.includes(u)) u.done=true;
    return true;
  }
}
const AI={next,apply};
if(typeof module!=='undefined') module.exports=AI; else root.AI=AI;
})(typeof self!=='undefined'?self:this);
