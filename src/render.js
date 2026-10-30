/* 동현워 그림: 16px 칸의 도트 지형·건물·유닛. 원작 그림은 쓰지 않고 모든 그림을 이 파일의 코드로 새로 그린다. */
(function(root){
const {UNITS,BUILDINGS}=root.DH_DATA;
const T=16, PAD=4;
const PAL={
  1:{m:'#e5483a',d:'#9a2620',l:'#ff9f86'},
  2:{m:'#3a78e8',d:'#1f3f99',l:'#97c0ff'},
  0:{m:'#b9b1a2',d:'#7a7266',l:'#e2dccf'}
};
const C={k:'#231d18',g:'#b4b2a8',G:'#6c6a62',w:'#f6f2e8',s:'#f1c493',S:'#c99a6a',y:'#f2b705',Y:'#a87a06',t:'#9a6634',T:'#5f3b1c',
  h:'#9b6a3e',H:'#5e3a1f',c:'#d8b77a',C:'#a7864d',e:'#9aa0a6',E:'#686e75',r:'#3d2a1d',b:'#2c2722',o:'#e08a2e',n:'#f4ead2',R:'#6c2a1c',v:'#4a4038'};

/* ---- 유닛: 몸통 틀 + 덧그림 ----
   글자: m 진영색 · d 진영 어두운색 · l 밝은색 · k 윤곽 · s 피부 · g/G 쇠 · w 흰색 · t/T 나무 · h/H 말 · c/C 낙타 · e/E 코끼리 · y 금 · n 무명천 */
const FOOT=[
'................',
'................',
'......kkkk......',
'.....kHHHHk.....',
'.....kHHHHk.....',
'.....kssssk.....',
'.....ksskSk.....',
'......kssk......',
'.....kmmmmk.....',
'....kmmmmmmk....',
'....kmmmmmmk....',
'....kdmmmmdk....',
'.....kddddk.....',
'.....kdkkdk.....',
'.....kGk.kGk....',
'....kkk..kkk....'];
const HORSE=[
'................',
'................',
'.......kkkk.....',
'......kHHHHk....',
'......kHHHHk....',
'......kssssk....',
'......ksskSk....',
'.......kssk.kk..',
'......kmmmmkhhk.',
'.....kmmmmmkhhhk',
'..kkkkmmmmmkkhhk',
'.khhhhhhhhhhhhk.',
'kkhhhhhhhhhhhk..',
'.khhHhhhhhHhhk..',
'..khk.kk.khk....',
'..kHk....kHk....'];
const CAMEL=[
'................',
'.......kkkk.....',
'......kHHHHk....',
'......kHHHHk....',
'......kssssk....',
'......ksskSk....',
'.......kssk..k..',
'......kmmmmk.kck',
'.....kmmmmmk.kck',
'...kkkmmmmmkkcck',
'..kcccccccccck..',
'.kcccccCCccck...',
'.kcCcccccccCk...',
'..kck....kck....',
'..kck....kck....',
'..kCk....kCk....'];
const ELEPH=[
'.......kkk......',
'......kHHHk.....',
'......ksssk.....',
'.....kmmmmmk....',
'...kkkmmmmmkk...',
'..keeeeeeeeeek..',
'.keeeeeeeeeeeek.',
'keeeeeeeeeeeEeek',
'keeeeeeeeeeeEewk',
'keeeeeeeeeeeEek.',
'keeEeeeeeeEeeke.',
'.keeeeeeeeeeek.k',
'.keek.keek.kek..',
'.keek.keek......',
'.kEEk.kEEk......',
'.kkkk.kkkk......'];
function grid(rows){ return rows.map(r=>r.padEnd(T,'.').slice(0,T).split('')); }
function put(g,list){ for(const [x,y,ch] of list) if(x>=0&&y>=0&&x<T&&y<g.length) g[y][x]=ch; }
function line(x0,y0,x1,y1,ch){ const out=[], n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0)); for(let i=0;i<=n;i++) out.push([Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),ch]); return out; }
function headgear(gr,kind,ox){ // ox: 틀의 머리 왼쪽 x(FOOT 5, HORSE 6)
  const set=(x,y,ch)=>{ if(gr[y]) gr[y][x]=ch; };
  const H=[[1,3],[2,3],[3,3],[4,3],[1,4],[2,4],[3,4],[4,4]], y0=gr._top||3;
  const fill=(ch)=>{ for(const [dx,dy] of H) set(ox+dx,y0+dy-3,ch); };
  if(kind==='helm'){ fill('g'); set(ox+1,y0+1,'G'); set(ox+4,y0,'G'); set(ox+2,y0-2,'k'); set(ox+3,y0-2,'k'); }
  else if(kind==='plume'){ fill('g'); set(ox+4,y0,'G'); set(ox+2,y0-2,'m'); set(ox+3,y0-2,'m'); set(ox+1,y0-2,'m'); set(ox+2,y0-3,'k'); set(ox+1,y0-3,'k'); set(ox+3,y0-3,'k'); }
  else if(kind==='hood'){ fill('m'); set(ox+1,y0+1,'d'); set(ox,y0+2,'k'); set(ox,y0+3,'k'); set(ox+1,y0+2,'m'); set(ox+1,y0+3,'m'); }
  else if(kind==='robe'){ fill('n'); set(ox+1,y0+1,'C'); set(ox,y0+2,'k'); set(ox+1,y0+2,'n'); set(ox+1,y0+3,'n'); }
  else if(kind==='hat'){ fill('c'); set(ox-1,y0+1,'k'); set(ox+5,y0+1,'k'); set(ox-1,y0+1,'c'); set(ox+5,y0+1,'c'); set(ox-2,y0+1,'k'); set(ox+6,y0+1,'k'); }
  else if(kind==='turban'){ fill('w'); set(ox+1,y0+1,'n'); set(ox+3,y0,'n'); set(ox+4,y0+1,'R'); }
  else if(kind==='kabuto'){ fill('b'); set(ox+1,y0+1,'v'); set(ox-1,y0+1,'k'); set(ox+5,y0+1,'k'); set(ox+2,y0-2,'y'); set(ox+3,y0-2,'y'); set(ox+1,y0-3,'k'); set(ox+4,y0-3,'k'); set(ox+1,y0-2,'k'); set(ox+4,y0-2,'k'); }
  else if(kind==='fur'){ fill('h'); set(ox+1,y0+1,'H'); set(ox+4,y0,'H'); set(ox+2,y0-2,'k'); set(ox+3,y0-2,'k'); }
  else if(kind==='hair'){ fill('r'); set(ox+1,y0+1,'r'); set(ox+4,y0+1,'r'); }
  else if(kind==='horned'){ fill('g'); set(ox+4,y0,'G'); set(ox,y0-1,'k'); set(ox-1,y0-2,'w'); set(ox+5,y0-1,'k'); set(ox+6,y0-2,'w'); set(ox+2,y0-2,'k'); set(ox+3,y0-2,'k'); }
  else if(kind==='cap'){ fill('m'); set(ox+4,y0+1,'k'); set(ox+5,y0+1,'k'); }
  else if(kind==='tall'){ fill('w'); set(ox+1,y0-2,'k'); set(ox+2,y0-3,'k'); set(ox+3,y0-3,'k'); set(ox+4,y0-2,'k'); set(ox+2,y0-2,'w'); set(ox+3,y0-2,'w'); set(ox+1,y0+1,'n'); }
}
function crown(gr,ox,y0){ // 영웅의 금관
  for(let i=0;i<6;i++) gr[y0-1][ox+i-0]= i%2? 'y':'k';
  for(let i=0;i<6;i++) gr[y0][ox+i]='y';
  gr[y0][ox-1]='k'; gr[y0][ox+6]='k'; gr[y0-1][ox-1]='.'; gr[y0+1]&&(gr[y0+1][ox+1]='Y');
  gr[y0-2][ox]='k'; gr[y0-2][ox+2]='k'; gr[y0-2][ox+4]='k';
}
// 무기 덧그림(오른손 x≈11, y≈9)
const WEAPON={
  sword: ()=>[...line(12,2,12,8,'w'),[13,3,'g'],[13,4,'g'],[13,5,'g'],[13,6,'g'],[13,7,'g'],[12,1,'k'],[11,9,'y'],[12,9,'y'],[13,9,'y'],[12,10,'s'],[11,10,'k'],[13,10,'k'],[12,11,'t']],
  katana:()=>[...line(14,1,12,9,'w'),[13,0,'k'],[12,10,'s'],[11,10,'b'],[13,10,'b'],[12,11,'b']],
  scim:  ()=>[[11,9,'s'],[12,8,'y'],[13,7,'w'],[14,6,'w'],[14,5,'w'],[14,4,'w'],[13,3,'w'],[15,6,'k'],[15,5,'k'],[12,3,'k']],
  spear: ()=>[...line(13,0,13,15,'t'),[13,0,'w'],[12,1,'g'],[14,1,'g'],[13,1,'w'],[13,2,'g'],[12,9,'s']],
  javelin:()=>[...line(11,4,15,0,'t'),[15,0,'w'],[14,0,'g'],[11,9,'s'],[3,8,'t'],[3,9,'t'],[3,10,'t'],[3,7,'g']],
  axe:   ()=>[...line(12,3,12,11,'t'),[13,2,'g'],[14,2,'g'],[13,3,'w'],[14,3,'g'],[15,3,'g'],[13,4,'g'],[14,4,'g'],[12,9,'s']],
  bow:   ()=>[[12,2,'t'],[13,3,'t'],[14,4,'t'],[14,5,'t'],[14,6,'t'],[14,7,'t'],[14,8,'t'],[13,9,'t'],[12,10,'t'],...line(12,3,12,9,'w'),[11,6,'s'],[13,6,'s'],[15,6,'g']],
  longbow:()=>[[12,0,'t'],[13,1,'t'],[14,2,'t'],[14,3,'t'],[14,4,'t'],[14,5,'t'],[14,6,'t'],[14,7,'t'],[14,8,'t'],[14,9,'t'],[13,10,'t'],[12,11,'t'],...line(12,1,12,10,'w'),[13,6,'s'],[15,6,'g']],
  xbow:  ()=>[...line(9,8,15,8,'t'),[15,6,'g'],[15,7,'g'],[15,9,'g'],[15,10,'g'],[14,7,'k'],[14,9,'k'],[11,9,'s'],[12,7,'w']],
  repeat:()=>[...line(9,8,15,8,'t'),[12,6,'t'],[13,6,'t'],[12,7,'t'],[13,7,'t'],[15,6,'g'],[15,7,'g'],[15,9,'g'],[15,10,'g'],[11,9,'s']],
  gun:   ()=>[...line(8,9,15,7,'G'),[15,6,'k'],[9,10,'t'],[8,10,'t'],[11,9,'s'],[14,6,'o']],
  fork:  ()=>[...line(13,3,13,15,'t'),[12,1,'g'],[12,2,'g'],[14,1,'g'],[14,2,'g'],[13,1,'g'],[13,2,'g'],[12,3,'g'],[14,3,'g'],[12,9,'s']],
  staff: ()=>[...line(12,1,12,15,'t'),[11,2,'y'],[13,2,'y'],[12,1,'y'],[12,0,'y'],[12,3,'y'],[11,9,'s']],
  lance: ()=>[...line(11,8,15,3,'t'),[15,3,'w'],[14,3,'g'],[15,4,'g'],[10,8,'s']],
  flag:  ()=>[...line(13,0,13,13,'t'),[14,0,'w'],[15,0,'w'],[14,1,'y'],[15,1,'w'],[14,2,'w'],[15,2,'w'],[14,3,'y'],[12,9,'s'],[11,7,'w'],[12,6,'w'],[11,5,'w']],
};
// 병종 → [몸통, 머리, 무기, 덧옷]
const LOOK={
  villager:['foot','hat','fork'],
  champion:['foot','plume','sword','shield'],
  pike:['foot','helm','spear'],
  arbalest:['foot','helm','xbow'],
  skirm:['foot','cap','javelin'],
  hha:['horse','helm','bow'],
  cannon:['foot','cap','gun'],
  scout:['horse','cap','sword'],
  paladin:['horse','plume','lance','barding'],
  camel:['camel','turban','scim'],
  monk:['foot','robe','staff','robe'],
  longbow:['foot','hood','longbow'],
  axeman:['foot','hair','axe'],
  mangudai:['horse','fur','bow'],
  mameluke:['camel','turban','scim','sash'],
  samurai:['foot','kabuto','katana'],
  woad:['foot','hair','sword','woad'],
  berserk:['foot','horned','axe'],
  templar:['horse','helm','sword','cross'],
  janissary:['foot','tall','gun'],
  elephant:['eleph','turban','spear'],
  chukonu:['foot','cap','repeat'],
  richard:['horse','helm','sword','barding'],
  joan:['foot','helm','flag','shield'],
  genghis:['horse','fur','bow'],
  saladin:['horse','turban','scim'],
  yoshitsune:['foot','kabuto','katana']
};
function bodyRows(kind){ return kind==='horse'?HORSE:kind==='camel'?CAMEL:kind==='eleph'?ELEPH:FOOT; }
function unitPixels(type){
  const L=LOOK[type]; if(!L) return siegePixels(type);
  const g=grid(bodyRows(L[0]));
  const ox=L[0]==='foot'?5:L[0]==='eleph'?6:6, y0=L[0]==='foot'?3:L[0]==='camel'?2:L[0]==='eleph'?1:3;
  g._top=y0;
  if(L[0]==='eleph'){ /* 코끼리 위 몰이꾼은 작게 */ }
  else headgear(g,L[1],ox);
  // 몸통 위치에 맞춰 무기를 옮긴다
  let w=WEAPON[L[2]](); const shift=L[0]==='foot'?0:L[0]==='eleph'?-4:1, dy=L[0]==='foot'?0:L[0]==='eleph'?-5:-1;
  if(L[0]==='horse'||L[0]==='camel'){ w=w.map(([x,y,c])=>[x+(x>=11?-2:0)+shift,y+dy,c]).filter(([x,y])=>!(x>=11&&y>=9)); }
  if(L[0]==='eleph') w=[];
  put(g,w);
  const extra=L[3];
  if(extra==='shield'){ put(g,[[3,8,'k'],[3,9,'k'],[3,10,'k'],[3,11,'k'],[4,8,'k'],[4,12,'k'],[4,9,'y'],[4,10,'l'],[4,11,'m'],[2,9,'k'],[2,10,'k']]); }
  if(extra==='robe'){ for(let y=8;y<=13;y++) for(let x=0;x<T;x++) if('mdl'.includes(g[y][x])) g[y][x]=y>=12?'C':'c'; put(g,[[6,9,'m'],[7,9,'m'],[6,10,'m'],[7,10,'m']]); }
  if(extra==='woad'){ put(g,[[6,5,'l'],[8,5,'d'],[7,9,'d'],[8,10,'d']]); }
  if(extra==='barding'){ for(let y=11;y<=13;y++) for(let x=0;x<T;x++) if(g[y][x]==='h') g[y][x]=(x+y)%3?'m':'l'; }
  if(extra==='cross'){ put(g,[[8,8,'w'],[7,9,'w'],[8,9,'w'],[9,9,'w'],[8,10,'w']]); }
  if(extra==='sash'){ put(g,[[7,10,'y'],[8,10,'y'],[9,10,'y']]); }
  if(L[0]==='eleph'){ put(g,[[8,4,'d'],[9,4,'m'],...line(10,0,10,4,'t'),[10,0,'w'],[11,6,'w'],[12,5,'k']]); }
  if(UNITS[type].hero) crown(g,ox,y0);
  return g;
}
// 공성 무기
function siegePixels(type){
  const W=(rows)=>grid(rows);
  if(type==='ram') return W([
'................','................','................','................',
'....kkkkkkk.....','...kmmmmmmmk....','..kmmmmmmmmmk...','.kddddddddddddk.',
'.kTTTTTTTTTTkGGk','.kttttttttttkggk','.kTTTTTTTTTTkGGk','..kkkkkkkkkkkk..',
'..kGk..kGk..kGk.','.kGgGkkGgGkkGgGk','..kGk..kGk..kGk.','................']);
  if(type==='onager') return W([
'................','................','.........kkkk...','........kGGGGk..',
'........ktttk...','.......ktk......','......ktk.......','.....ktk........',
'..kkkktkkkkkk...','..kttttttttttk..','..kTtmmmmmtTTk..','..kTTTTTTTTTTk..',
'..kkkkkkkkkkkk..','.kGgGk....kGgGk.','..kGk......kGk..','................']);
  if(type==='scorpion') return W([
'................','................','................','.....k.....k....',
'....ktk...ktk...','....ktk...ktk...','.....ktk.ktk....','..kkkkktkkkkkkk.',
'..kggggggggggggw','..kkkkkkkkkkkkk.','....kmmmmmk.....','....kddddk......',
'.....kttk.......','....kGggGk......','...kGk..kGk.....','................']);
  if(type==='bombard') return W([
'................','................','................','................',
'................','....kkkkkkkkkkk.','...kGGGGGGGGGGGk','...kgggggggggggk',
'...kGGGGGGGGGGGk','....kkkkkkkkkkk.','..kttmmtk.......','.kGkkkkGk.......',
'kGgGk.kGgGk.....','.kGk...kGk......','................','................']);
  if(type==='trebuchet') return W([
'............kk..','...........kgk..','..........ktk...','.........ktk....',
'........ktk.....','.......ktk......','..k...ktk.......','..kk.ktk........',
'..kk.kk.........','.kGGk.ktk.......','.kGGkktttk......','..kkktkmtk......',
'..kkkkkkkkkkk...','..kTTTTTTTTTk...','.kGgGk...kGgGk..','..kGk.....kGk...']);
  return W(FOOT);
}
function mk(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return c; }
const cache={};
function sprite(type,owner,gray){
  const k=type+owner+(gray?'g':''); if(cache[k]) return cache[k];
  const c=mk(T,T), x=c.getContext('2d'), P=PAL[owner], rows=unitPixels(type);
  for(let y=0;y<T;y++) for(let i=0;i<T;i++){ const ch=(rows[y]||[])[i]; if(!ch||ch==='.') continue;
    let col=P[ch]||C[ch]; if(!col) continue; if(gray) col=grayify(col);
    const px=owner===2?T-1-i:i; x.fillStyle=col; x.fillRect(px,y,1,1); }
  return cache[k]=c;
}
function grayify(hex){ const n=parseInt(hex.slice(1),16), r=n>>16&255,g=n>>8&255,b=n&255, v=Math.round((r*.3+g*.55+b*.15)*.72+30); return `rgb(${v},${v},${v-6})`; }
function hash(x,y,s=0){ let h=(x*374761393+y*668265263+s*982451653)>>>0; h=(h^(h>>>13))*1274126177>>>0; return (h^(h>>>16))>>>0; }

/* ---- 지형 ---- */
const TC={grass:'#8fc85b',grassB:'#96cd63',grass2:'#7ab349',grass3:'#a6d872',tree:'#3f8a3a',tree2:'#2d6b2c',trunk:'#6b4a2c',
  rock:'#a08467',rock2:'#7a604a',snow:'#f4efe4',water:'#4c8fd9',water2:'#3b78c4',wave:'#9cc6f2',sand:'#ead79a',sandB:'#e3cf8f',sand2:'#c9b06e',sand3:'#f4e6b6',
  road:'#d3c7a6',road2:'#a39578',road3:'#e3d9bc',plank:'#b8854f',plank2:'#7d5530',plank3:'#d9a66a',foam:'#e8f4ff',deep:'#4384d0',bank:'#6f9c3e',river:'#5aa0e6',river2:'#3f86d2',
  hill:'#7fb24f',hill2:'#5f8f3a',hill3:'#a9d173',swamp:'#5f7d4a',swamp2:'#4b6a3b',mud:'#6d6440',pool:'#5b8a8a',pool2:'#7fb0aa',reed:'#a5b56a',ford:'#86b9e8',stone:'#b8b2a4'};
const WATERY=t=>t==='river'||t==='ocean'||t==='bridge'||t==='ford';
const isDesert=t=>t==='desert'||t==='droad';
function drawTerrain(g,map,x,y){
  const cell=map.grid[y][x], t=cell.t, X=x*T, Y=y*T;
  const at=(dx,dy)=>{ const yy=y+dy,xx=x+dx; if(yy<0||xx<0||yy>=map.H||xx>=map.W) return null; return map.grid[yy][xx].t; };
  const atB=(dx,dy)=>{ const yy=y+dy,xx=x+dx; if(yy<0||xx<0||yy>=map.H||xx>=map.W) return null; return map.grid[yy][xx].b; };
  const R=(a,b,w,h,c)=>{ g.fillStyle=c; g.fillRect(X+a,Y+b,w,h); };
  const grass=()=>{ R(0,0,T,T,(x+y)%2?TC.grass:TC.grassB); for(let i=0;i<3;i++){ const h=hash(x,y,i); R(h%14+1,(h>>>4)%14+1,1,1,TC.grass2); R((h>>>8)%14+1,(h>>>12)%14+1,1,1,TC.grass3);} };
  const sand=()=>{ R(0,0,T,T,(x+y)%2?TC.sand:TC.sandB); for(let i=0;i<3;i++){ const h=hash(x,y,i+20); R(h%13+1,(h>>>4)%14+1,2,1,TC.sand2); R((h>>>8)%14+1,(h>>>12)%14+1,1,1,TC.sand3);} };
  const ground=()=>{ const near=[at(0,-1),at(0,1),at(-1,0),at(1,0)].filter(isDesert).length; (isDesert(t)||(cell.b&&near>=2))?sand():grass(); };
  const sea=()=>{ R(0,0,T,T,TC.water); for(let i=0;i<T;i+=4) for(let j=(i/4)%2*2;j<T;j+=4) R(j,i,1,1,TC.deep);
    const h=hash(x,y,7); R(h%10+2,(h>>>5)%10+3,3,1,TC.wave);
    const land=(dx,dy)=>{ const n=at(dx,dy); return n && !WATERY(n); };
    if(land(0,-1)){ R(0,0,T,2,TC.sand); R(0,2,T,1,TC.foam); } if(land(0,1)){ R(0,T-2,T,2,TC.sand); R(0,T-3,T,1,TC.foam); }
    if(land(-1,0)){ R(0,0,2,T,TC.sand); } if(land(1,0)){ R(T-2,0,2,T,TC.sand); } };
  if(t==='plain'||t==='desert'){ ground(); if(t==='plain'){ const h=hash(x,y,11); if(h%3===0){ const fx=2+h%11, fy=3+(h>>>5)%10; R(fx,fy,1,1,'#fff7e0'); R(fx+1,fy+1,1,1,(h>>>9)%2?'#ffd34d':'#ffb3c7'); } }
    else { const h=hash(x,y,12); if(h%4===0){ const fx=2+h%10, fy=4+(h>>>5)%8; R(fx,fy,1,3,'#6f9c3e'); R(fx-1,fy+1,1,1,'#6f9c3e'); R(fx+1,fy,1,1,'#6f9c3e'); } } }
  else if(t==='forest'){ grass(); const pp=bpal(0); R(1,13,14,2,'rgba(20,30,10,.22)'); for(const [a,b] of [[5,-3],[1,3],[8,4]]) stamp(g,TREE,X+a,Y+b,pp); }
  else if(t==='mountain'){ grass(); stamp(g,MOUNTAIN,X,Y-4,bpal(0)); }
  else if(t==='hill'){ grass(); const pal={k:'#41612a',a:TC.hill3,b:TC.hill,c:TC.hill2};
    stamp(g,['......kkkk......','....kkaaaakk....','...kaaabbbbbk...','..kabbbbbbbbck..','.kabbbbbbbbbcck.','kabbbbbbbbbbbcck','kbbbbbbbbbbbcccck'.slice(0,16),'.kkkkkkkkkkkkkk.'],X,Y+6,pal); }
  else if(t==='swamp'){ R(0,0,T,T,TC.swamp); const h=hash(x,y,31);
    R(2+h%3,3,7,3,TC.mud); R(3+h%3,4,5,1,TC.pool); R(8,9+(h>>>3)%2,6,3,TC.mud); R(9,10+(h>>>3)%2,4,1,TC.pool); R(4+(h>>>5)%3,10,1,1,TC.pool2);
    for(const [a,b] of [[1,8],[12,2],[6,12],[14,12]]){ R(a,b,1,3,TC.reed); R(a+1,b-1,1,3,TC.reed); R(a,b-1,1,1,'#6b4a2c'); }
    for(let i=0;i<4;i++){ const k=hash(x,y,40+i); R(k%15,(k>>>4)%15,1,1,TC.swamp2); } }
  else if(t==='road'||t==='droad'){
    const base=t==='road'?grass:sand; base();
    const conn=n=>n==='road'||n==='droad'||n==='bridge';
    const connB=(dx,dy)=>conn(at(dx,dy))||!!atB(dx,dy);
    const col=TC.road, edge=TC.road2, side=t==='road'?TC.grass:TC.sand;
    const up=connB(0,-1),dn=connB(0,1),lf=connB(-1,0),rt=connB(1,0);
    R(0,0,T,T,col);
    if(!up){ R(0,0,T,3,side); R(0,3,T,1,edge); } if(!dn){ R(0,T-3,T,3,side); R(0,T-4,T,1,edge); }
    if(!lf){ R(0,0,3,T,side); R(3,up?0:3,1,T-(up?0:3)-(dn?0:3),edge); } if(!rt){ R(T-3,0,3,T,side); R(T-4,up?0:3,1,T-(up?0:3)-(dn?0:3),edge); }
    if(!up&&!lf) R(0,0,4,4,side); if(!up&&!rt) R(T-4,0,4,4,side); if(!dn&&!lf) R(0,T-4,4,4,side); if(!dn&&!rt) R(T-4,T-4,4,4,side);
    if(lf||rt){ const a=lf?0:7,b=rt?T:8; R(a,7,b-a,1,TC.road3); } if(up||dn){ const a=up?0:7,b=dn?T:8; R(7,a,1,b-a,TC.road3); }
    const h=hash(x,y,9); R(4+h%8,4+(h>>>4)%8,1,1,edge); }
  else if(t==='river'||t==='ford'||t==='bridge'){
    const wet=n=>n==='river'||n==='ford'||n==='bridge'||n==='ocean';
    grass(); R(0,0,T,T,t==='ford'?TC.ford:TC.river);
    const up=wet(at(0,-1)),dn=wet(at(0,1)),lf=wet(at(-1,0)),rt=wet(at(1,0)), B=3;
    if(!up){ R(0,0,T,B,TC.grass); R(0,B,T,1,TC.bank); } if(!dn){ R(0,T-B,T,B,TC.grass); R(0,T-B-1,T,1,TC.bank); }
    if(!lf){ R(0,0,B,T,TC.grass); R(B,up?0:B,1,T-(up?0:B)-(dn?0:B),TC.bank); } if(!rt){ R(T-B,0,B,T,TC.grass); R(T-B-1,up?0:B,1,T-(up?0:B)-(dn?0:B),TC.bank); }
    const h=hash(x,y,3); R(5+(h%4),5+(h>>>3)%3,3,1,TC.wave);
    if(t==='ford'){ for(const [a,b] of [[2,4],[7,3],[11,6],[4,10],[9,11],[13,12]]){ R(a,b,3,2,TC.stone); R(a,b+2,3,1,TC.rock2); } }
    if(t==='bridge'){ const vt=!wet(at(0,-1))||!wet(at(0,1)); const hz=!wet(at(-1,0))||!wet(at(1,0));
      if(vt&&!hz){ R(2,0,12,T,'rgba(20,40,70,.25)'); R(3,0,10,T,TC.plank); for(let i=1;i<T;i+=3) R(3,i,10,1,TC.plank2); R(2,0,1,T,C.k); R(13,0,1,T,C.k); }
      else { R(0,4,T,10,'rgba(20,40,70,.25)'); R(0,3,T,10,TC.plank); for(let i=1;i<T;i+=3) R(i,3,1,10,TC.plank2); R(0,2,T,1,C.k); R(0,13,T,1,C.k); } } }
  else if(t==='ocean') sea();
  else grass();
  if(cell.b) drawBuilding(g,cell,X,Y);
}
const TREE=['..kkk..','.kaabk.','kaabbbk','kabbbck','kbbbcck','.kccck.','..ktk..','..kkk..'];
const MOUNTAIN=['................','.......kk.......','......kwwk......','.....kwwwRk.....','.....kwwrRk.....','....krrwrRRk....',
'....krrrrRRk....','...krrrrrRRRk...','...krrrrrRRRk...','..krrrrrrRRRRk..','..krrrrrRRRRRk..','.krrrrrrRRRRRRk.',
'.krrrrrrRRRRRRk.','krrrrrrrRRRRRRRk','krrrrrrRRRRRRRRk','kkkkkkkkkkkkkkkk','.SSSSSSSSSSSSSS.'];
/* 건물 도트(칸보다 4px 높다). m/d/l 진영색 · w 벽(회반죽) · W 벽 그늘 · t/T 나무 · g/G 돌 · y 금 · S 그림자 */
const BLD={
tc:[
'.......kk.......','......kmmk......','.....kmmmmk.....','....kmmmmmmk....','...kmmmmmmmmk...','..kllllllllllk..',
'..kkkkkkkkkkkk..','...kwwwwwwwwk...','...kwkkwwkkwk...','...kwkykwkykWk..'.slice(0,16),'...kwkkwwkkwk...','...kwwwwwwwwWk..'.slice(0,16),
'...kwwwkkwwwWk..','...kwwwkTkwwWk..','...kwwwkTkwwWk..','...kkkkkkkkkkk..','..SSSSSSSSSSSS..','................','................','................'],
barracks:[
'................','................','..k...........k.','.kmk.........kmk','.kmk.........kmk','.kmkkkkkkkkkkkmk',
'.kmmmmmmmmmmmmmk','.kddddddddddddk.','.kggggggggggggk.','.kgGgkkkkkgGgGk.','.kggkTTTkggggGk.','.kgGkTTTkgGgGgk.',
'.kggkTTTkggggGk.','.kgGkTTTkgGgGgk.','.kkkkkkkkkkkkkk.','.SSSSSSSSSSSSSS.'],
archery:[
'................','................','.......kk.......','......kmmk......','.....kmmmmk.....','....kmmmmmmk....',
'...kllllllllk...','..kkkkkkkkkkkk..','..kttttttttttk..','..ktkwwkkwwktk..','..ktkkykkykktk..','..ktttttttttTk..',
'..ktkkk.kkktTk..','..ktkTk.kTktTk..','..kkkkkkkkkkkk..','..SSSSSSSSSSSS..'],
stable:[
'................','................','................','..kkkkkkkkkkkk..','.kmmmmmmmmmmmmk.','kmmmmmmmmmmmmmmk',
'kllllllllllllllk','.kttttttttttttk.','.ktTkkkktTkkkkk.','.ktTkhhkktkhhkk.','.ktTkhHkktkhHkk.','.ktTkkkkktkkkkk.',
'.ktttttttttttttk','.kkkkkkkkkkkkkk.','.SSSSSSSSSSSSSS.','................'],
workshop:[
'................','.........kk.....','........kGGk....','........kGGk....','..kkkkkkkGGkk...','.kmmmmmmmmmmmk..',
'kmmmmmmmmmmmmmk.','klllllllllllllk.','.kttttttttttttk.','.ktkkkkkkkktttk.','.ktkGGGGGGktTtk.','.ktkGgGgGgktTtk.',
'.ktkGGGGGGktTtk.','.ktkkkkkkkktttk.','.kkkkkkkkkkkkkk.','.SSSSSSSSSSSSSS.'],
church:[
'.......kk.......','......kyyk......','.....kkyykk.....','.......kk.......','......kmmk......','.....kmmmmk.....',
'....kmmmmmmk....','...kllllllllk...','...kwwwwwwwwk...','...kwwwkkwwwWk..','...kwwkyykwwWk..','...kwwwkkwwwWk..',
'...kwwwwwwwwWk..','...kwwwkTkwwWk..','...kwwwkTkwwWk..','...kkkkkkkkkkk..','..SSSSSSSSSSSS..'],
market:[
'................','................','................','..kkkkkkkkkkkk..','.kmwmwmwmwmwmwk.','kmwmwmwmwmwmwmwk',
'kkkkkkkkkkkkkkkk','.kt..........tk.','.kt..........tk.','.kt.kyk.kok..tk.','.kkkkkkkkkkkkkk.','.kttttttttttttk.',
'.kTTTTTTTTTTTTk.','.kkkkkkkkkkkkkk.','.SSSSSSSSSSSSSS.','................'],
castle:[
'.......kk.......','.......kmk......','.......kmmk.....','.......kk.......','kkk.kkk.kkk.kkk.'.slice(0,16),'kgk.kgk.kgk.kgk.',
'kgkkkgkkkgkkkgk.','kggggggggggggGk.','kgGgggggggggGgk.','kggkkggggggkkGk.','kggkkgggggGkkgk.','kgggggkkkkgggGk.',
'kgGgGkTTTTkgGgk.','kgggGkTTTTkggGk.','kgGggkTTTTkgGgk.','kkkkkkkkkkkkkkk.','.SSSSSSSSSSSSSS.'],
tower:[
'................','.....kmmk.......','.....kmmmk......','.....kk.........','....kkkkkkk.....','....kgkgkgk.....',
'....kgggggGk....','....kggkkgGk....','....kggkkgGk....','....kgggggGk....','....kgGggggk....','....kggkkgGk....',
'....kgggggGk....','....kggTTgGk....','....kkkkkkkk....','....SSSSSSSS....'],
mill:[
'..k.....k.......','...k...k........','....k.k.........','.....k..........','....k.k.........','...k.kkkk.......',
'..k.kwwwwk......','...kmmmmmmk.....','..kmmmmmmmmk....','..kllllllllk....','...kwwwwwwk.....','...kwkkwwWk.....',
'...kwkkwwWk.....','...kwwwTwWk.....','...kkkkkkkk.....','...SSSSSSSS.....'],
farm:[
'................','................','................','................','................','................',
'kkkkkkkkkkkkkkkk','kyYyYyYyYyYyYyYk','kYtYtYtYtYtYtYtk','kyYyYyYyYyYyYyYk','kYtYtYtYtYtYtYtk','kyYyYyYyYyYyYyYk',
'kYtYtYtYtYtYtYtk','kyYyYyYyYyYyYyYk','kmmmkkkkkkkkkkkk','kmmmk...........'],
mine:[
'................','................','................','...........kk...','..........kmmk..','..........kmk...',
'....kkkkkk.kk...','...krrrrrRk.k...','..krrrrrrRRk.k..','.krrkkkkkkRRk...','.krkTTTTTTkRRk..','.krkTbbbbTkRRk..',
'.krkTbyybTkRRRk.','krrkTbbbbTkRRRk.','kkkkkkkkkkkkkkkk','.SSSSSSSSSSSSSS.']
};
function stamp(g,rows,X,Y,pal){ for(let y=0;y<rows.length;y++){ const r=rows[y]; for(let i=0;i<r.length;i++){ const ch=r[i]; if(ch==='.') continue; const c=pal[ch]||C[ch]; if(!c) continue; g.fillStyle=c; g.fillRect(X+i,Y+y,1,1); } } }
function bpal(owner){ const P=PAL[owner||0]; return {m:P.m,d:P.d,l:P.l,S:'rgba(20,30,10,.28)',w:'#efe6d2',W:'#c9bda3',g:'#bdb6a8',G:'#8d8578',
  r:TC.rock,R:TC.rock2,a:TC.grass3,b:TC.tree,c:TC.tree2,t:'#a06c3a',T:'#5f3b1c',y:'#f2b705',Y:'#c48f12',o:'#e08a2e'}; }
function drawBuilding(g,cell,X,Y){
  const b=cell.b, rows=BLD[b.type], pal=bpal(b.owner);
  if(b.type==='farm'){ pal.Y='#8aa83f'; pal.y='#c9b45a'; pal.t='#a07f3e'; }
  if(b.type==='mine'){ pal.b='#2c2722'; }
  stamp(g,rows,X,Y+T-rows.length,pal);
}
function terrainLayer(map){
  const c=mk(map.W*T,map.H*T+PAD), g=c.getContext('2d'); g.translate(0,PAD);
  for(let y=0;y<map.H;y++) for(let x=0;x<map.W;x++) drawTerrain(g,map,x,y);
  return c;
}
const DIG={0:['111','101','101','101','111'],1:['010','110','010','010','111'],2:['111','001','111','100','111'],3:['111','001','111','001','111'],4:['101','101','111','001','001'],5:['111','100','111','001','111'],6:['111','100','111','101','111'],7:['111','001','010','010','010'],8:['111','101','111','101','111'],9:['111','101','111','001','111']};
function digit(g,n,x,y,col){ const s=String(n); let ox=x; for(const ch of s){ const d=DIG[ch]; g.fillStyle=C.k; g.fillRect(ox-1,y-1,5,7); g.fillStyle=col||C.w;
  for(let r=0;r<5;r++) for(let i=0;i<3;i++) if(d[r][i]==='1') g.fillRect(ox+i,y+r,1,1); ox+=4; } }
// 지형 키: 건물 주인·체력이 바뀌면 지형층을 다시 그린다
function terrainKey(map){ let s=''; for(const r of map.grid) for(const c of r) if(c.b) s+=c.b.owner; return s; }

/* ---- 장면 ---- */
function draw(g, s, ui, now){
  const map=s.map, tk=terrainKey(map)+':'+(ui.terrainVer||0);
  if(!ui.terrain || ui.terrainKey!==tk){ ui.terrain=terrainLayer(map); ui.terrainKey=tk; ui.waterTiles=null; }
  g.imageSmoothingEnabled=false;
  g.drawImage(ui.terrain,0,0); g.save(); g.translate(0,PAD);
  if(!ui.waterTiles){ ui.waterTiles=[]; for(let y=0;y<map.H;y++) for(let x=0;x<map.W;x++){ const t=map.grid[y][x].t; if(t==='river'||t==='ocean'||t==='ford') ui.waterTiles.push([x,y]); } }
  { const ph=Math.floor(now/650); g.fillStyle='rgba(235,246,255,.8)';
    for(const [x,y] of ui.waterTiles){ const h=hash(x,y,ph&7); if(h%4) continue; g.fillRect(x*T+4+(h>>>3)%7,y*T+4+(h>>>7)%7,2,1); } }
  // 건물 체력(100 아래일 때 막대)
  for(let y=0;y<map.H;y++) for(let x=0;x<map.W;x++){ const b=map.grid[y][x].b; if(!b||b.hp>=100) continue;
    g.fillStyle=C.k; g.fillRect(x*T+1,y*T-3,14,3); g.fillStyle=b.hp>50?'#7fd04b':b.hp>25?'#f2b705':'#e5483a'; g.fillRect(x*T+2,y*T-2,Math.max(1,Math.round(12*b.hp/100)),1); }
  if(ui.moveSet){ g.fillStyle='rgba(120,190,255,.48)'; for(const k of ui.moveSet){ g.fillRect((k%1000)*T,Math.floor(k/1000)*T,T,T);} }
  if(ui.atkSet){ g.fillStyle='rgba(240,70,50,.42)'; for(const k of ui.atkSet){ g.fillRect((k%1000)*T,Math.floor(k/1000)*T,T,T);} }
  if(ui.helpSet){ g.fillStyle='rgba(120,230,140,.45)'; for(const k of ui.helpSet){ g.fillRect((k%1000)*T,Math.floor(k/1000)*T,T,T);} }
  if(ui.spots){ g.fillStyle='rgba(255,220,80,.55)'; for(const [x,y] of ui.spots) g.fillRect(x*T,y*T,T,T); }
  if(ui.path && ui.path.length>1){
    g.fillStyle='rgba(255,246,214,.95)';
    for(let i=0;i<ui.path.length;i++){ const [x,y]=ui.path[i]; g.fillRect(x*T+6,y*T+6,4,4);
      if(i){ const [px,py]=ui.path[i-1]; g.fillRect(Math.min(px,x)*T+6,Math.min(py,y)*T+6,Math.abs(px-x)*T+4,Math.abs(py-y)*T+4); } }
    const [ex,ey]=ui.path[ui.path.length-1]; g.fillStyle=C.k; g.fillRect(ex*T+5,ey*T+5,6,6); g.fillStyle=C.y; g.fillRect(ex*T+6,ey*T+6,4,4);
  }
  for(let y=0;y<map.H;y++) for(let x=0;x<map.W;x++){ const c=map.grid[y][x]; if(c.capId){ g.fillStyle=C.k; g.fillRect(x*T,y*T,7,7); g.fillStyle=C.y; g.fillRect(x*T+1,y*T+1,5,5); g.fillStyle=C.k; g.fillRect(x*T+2,y*T+2,1,4); g.fillRect(x*T+3,y*T+2,2,2);} }
  for(const u of s.units){
    let px=u.x*T, py=u.y*T;
    if(ui.anim && ui.anim.id===u.id){ const a=ui.anim, f=Math.min(1,(now-a.t0)/a.dur)*(a.path.length-1), i=Math.min(a.path.length-2,Math.floor(f)), r=f-i;
      if(a.path.length>1){ const [x0,y0]=a.path[Math.max(0,i)],[x1,y1]=a.path[Math.max(0,i)+1]; px=(x0+(x1-x0)*r)*T; py=(y0+(y1-y0)*r)*T; } }
    if(ui.hide===u.id) continue;
    const bob=(!u.done && u.owner===s.turn && !ui.anim && Math.floor(now/400)%2)?1:0;
    const spr=sprite(u.type,u.owner,u.done&&u.owner===s.turn);
    const rx=Math.round(px), ry=Math.round(py), tc=u.owner===1?'rgba(229,72,58,.6)':'rgba(58,120,232,.6)';
    g.fillStyle='rgba(15,20,10,.25)'; g.fillRect(rx+3,ry+15,10,1);
    g.fillStyle=tc; g.fillRect(rx+2,ry+14,12,1);
    g.drawImage(spr,rx,ry-bob);
    const hp=Math.ceil(u.hp/10);
    if(hp<10) digit(g,hp,u.owner===2?rx+1:rx+12,ry+10);
  }
  ui.fx=(ui.fx||[]).filter(f=>now-f.t0<f.dur);
  for(const f of ui.fx){ const p=(now-f.t0)/f.dur, X=f.x*T, Y=f.y*T;
    if(f.k==='boom'){ const r=2+p*9; g.fillStyle=p<.5?'#fff3c0':'#f08a2e'; g.fillRect(X+8-r,Y+8-r/1.4,r*2,r*1.4); g.fillStyle='#d8483a'; for(let i=0;i<6;i++){ const a=i*1.05+p, rr=r*1.2; g.fillRect(X+8+Math.cos(a)*rr-1,Y+8+Math.sin(a)*rr-1,2,2);} }
    else if(f.k==='hit'){ if(Math.floor(p*6)%2===0){ g.fillStyle='rgba(255,255,255,.7)'; g.fillRect(X,Y,T,T);} }
    else if(f.k==='glow'){ g.fillStyle=`rgba(${f.rgb||'255,236,140'},${.55*(1-p)})`; g.fillRect(X,Y-p*6,T,T); }
    else if(f.k==='num'){ g.font='bold 8px monospace'; g.textAlign='center'; const yy=Y+2-p*8; g.fillStyle=C.k; g.fillText(f.text,X+9,yy+1); g.fillStyle=f.col||'#fff'; g.fillText(f.text,X+8,yy); }
  }
  if(ui.cursor && ui.showCursor!==false){ const [cx,cy]=ui.cursor, o=Math.floor(now/300)%2?0:1, X=cx*T, Y=cy*T;
    g.fillStyle=C.k; for(const [a,b] of [[-1-o,-1-o],[T-4+o,-1-o],[-1-o,T-4+o],[T-4+o,T-4+o]]){ g.fillRect(X+a,Y+b,5,5);}
    g.fillStyle='#fff'; for(const [a,b,w,h] of [[-o,-o,4,1],[-o,-o,1,4],[T-4+o,-o,4,1],[T-1+o,-o,1,4],[-o,T-1+o,4,1],[-o,T-4+o,1,4],[T-4+o,T-1+o,4,1],[T-1+o,T-4+o,1,4]]) g.fillRect(X+a,Y+b,w,h);
  }
  g.restore();
}
const Render={T,PAD,draw,sprite,terrainLayer,PAL};
root.Render=Render;
})(typeof self!=='undefined'?self:this);
