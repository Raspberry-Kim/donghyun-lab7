/* 동현워 데이터: 지형·건물·병종·문명·지도.
   병종의 공격·방어·이동·사거리·가격·특수 능력은 원작 NDS 판의 내장 수치(본인이 가진 ROM에서 숫자만 읽음)와
   공개 해설(Age of Empires 위키 「The Age of Kings」 항목, GameFAQs 해설)을 맞대어 정했다.
   모든 판은 최종 시대(제국 시대)에서 시작하고 모든 연구는 끝난 것으로 본다. */

// 지형: 이동 비용(이동력 7 기준 평지 2), 방어 보너스(%), 사거리 보정
const TERRAIN = {
  plain:  {name:'평지',     cost:2, def:0,  rng:0,  plains:true},
  road:   {name:'길',       cost:1, def:0,  rng:0,  plains:true},
  desert: {name:'사막',     cost:2, def:0,  rng:0,  desert:true},
  droad:  {name:'사막길',   cost:1, def:0,  rng:0,  desert:true},
  hill:   {name:'언덕',     cost:3, def:20, rng:1},
  forest: {name:'숲',       cost:3, def:20, rng:-1, forest:true},
  mountain:{name:'산',      cost:4, def:40, rng:1,  noSiege:true},
  bridge: {name:'다리',     cost:2, def:40, rng:0},
  ford:   {name:'여울',     cost:3, def:20, rng:0,  noSiege:true},
  swamp:  {name:'늪',       cost:3, def:20, rng:-1, noSiege:true, noHorse:true},
  river:  {name:'강',       cost:0, def:0,  rng:0},
  ocean:  {name:'바다',     cost:0, def:0,  rng:0}
};
const TERRAIN_ORDER = Object.keys(TERRAIN);

/* 건물: 방어력(원작 수치) · 위에 선 유닛의 방어 보너스 · 수입(모든 연구를 마친 값) · 생산.
   건물 위는 이동 비용 1. 적 건물은 지나갈 수 없고, 점령하러 들어가 멈출 수만 있다. */
const BUILDINGS = {
  tc:      {name:'마을회관',     def:500, cover:20, food:25, gold:25, hq:true},
  barracks:{name:'병영',         def:300, cover:20},
  archery: {name:'궁수 훈련소',  def:300, cover:20},
  stable:  {name:'마구간',       def:300, cover:20},
  workshop:{name:'공성 무기 공방',def:300, cover:20},
  church:  {name:'교회',         def:300, cover:20},
  market:  {name:'시장',         def:300, cover:20},
  castle:  {name:'성',           def:750, cover:40},
  tower:   {name:'탑',           def:300, cover:40},
  mill:    {name:'방앗간',       def:250, cover:20, food:65},
  farm:    {name:'농장',         def:100, cover:10, food:65},
  mine:    {name:'광산',         def:300, cover:20, gold:245}
};
const BUILDING_ORDER = Object.keys(BUILDINGS);

/* 병종.
   cls: inf 보병 · rng 원거리 · cav 기병 · siege 공성 · monk 수도사
   horse: 말을 탄 기병(겁주는 낙타의 대상) · mt: foot · horse(늪 불가) · siege(산·여울·늪 불가)
   f/g: 식량/금 가격(연구 할인 전) · src: 수치의 출처(rom 내장 기록, wiki 공개 해설) */
const UNITS = {
  villager: {name:'마을 사람',        short:'마을', cls:'inf',  atk:50,  def:50,  mv:7,  rng:[1,1], f:100, g:100, mt:'foot', cap:2, src:'rom'},
  champion: {name:'챔피언',           short:'챔피', cls:'inf',  atk:300, def:300, mv:7,  rng:[1,1], f:250, g:85,  mt:'foot', cap:1, src:'rom'},
  pike:     {name:'정예 장창병',      short:'장창', cls:'inf',  atk:200, def:250, mv:7,  rng:[1,1], f:160, g:55,  mt:'foot', cap:1, sp:['anticav'], src:'rom·wiki'},
  arbalest: {name:'아발레스트',       short:'아발', cls:'rng',  atk:250, def:225, mv:7,  rng:[1,3], f:180, g:75,  mt:'foot', sp:['noMA'], src:'rom'},
  skirm:    {name:'정예 산병',        short:'산병', cls:'rng',  atk:190, def:190, mv:7,  rng:[1,2], f:145, g:55,  mt:'foot', sp:['skirmish'], src:'rom·wiki'},
  hha:      {name:'중기마 궁수',      short:'기궁', cls:'rng',  atk:200, def:200, mv:10, rng:[1,2], f:180, g:75,  mt:'foot', src:'rom'},
  cannon:   {name:'핸드 캐논병',      short:'캐논', cls:'rng',  atk:300, def:225, mv:7,  rng:[1,3], f:205, g:90,  mt:'foot', sp:['noMA'], src:'rom'},
  scout:    {name:'정찰 기병',        short:'정찰', cls:'cav',  atk:100, def:100, mv:12, rng:[1,1], f:110, g:20,  mt:'horse', sp:['scout'], src:'rom·wiki'},
  paladin:  {name:'팔라딘',           short:'팔라', cls:'cav',  atk:300, def:300, mv:10, rng:[1,1], f:335, g:85,  mt:'horse', horse:true, sp:['plains'], src:'rom·wiki'},
  camel:    {name:'중낙타 기병',      short:'낙타', cls:'cav',  atk:250, def:250, mv:10, rng:[1,1], f:280, g:75,  mt:'horse', sp:['desert','scares'], src:'rom·wiki'},
  ram:      {name:'공성 망치',        short:'망치', cls:'siege',atk:500, def:375, mv:7,  rng:[1,1], f:70,  g:230, mt:'siege', sp:['bldgOnly','noCounter'], src:'rom·wiki'},
  onager:   {name:'오나거',           short:'오나', cls:'siege',atk:275, def:275, mv:7,  rng:[1,3], f:60,  g:180, mt:'siege', sp:['noMA','noCounter'], src:'rom·wiki'},
  scorpion: {name:'중 스콜피온',      short:'스콜', cls:'siege',atk:400, def:300, mv:7,  rng:[1,3], f:80,  g:250, mt:'siege', sp:['unitsOnly','noMA','noCounter'], src:'rom·wiki'},
  bombard:  {name:'사석포',           short:'사석', cls:'siege',atk:325, def:325, mv:7,  rng:[1,3], f:70,  g:235, mt:'siege', sp:['noMA','noCounter'], src:'rom·wiki'},
  trebuchet:{name:'트레뷰셋',         short:'트레', cls:'siege',atk:375, def:350, mv:7,  rng:[2,3], f:75,  g:255, mt:'siege', sp:['noMA','noCounter'], src:'rom·wiki'},
  monk:     {name:'정예 수도사',      short:'수도', cls:'monk', atk:0,   def:200, mv:9,  rng:null,  f:75,  g:220, mt:'foot', heal:30, convert:40, src:'rom'},
  // 문명 고유 병종(성에서 생산)
  longbow:  {name:'정예 장궁병',      short:'장궁', cls:'rng',  atk:275, def:200, mv:7,  rng:[1,3], f:245, g:95,  mt:'foot', sp:['volley'], unique:true, src:'rom·wiki'},
  axeman:   {name:'정예 도끼 투척병', short:'도끼', cls:'inf',  atk:275, def:300, mv:7,  rng:[1,1], f:280, g:80,  mt:'foot', cap:1, sp:['skirmish','woodsman'], unique:true, src:'rom·wiki'},
  mangudai: {name:'정예 망구다이',    short:'망구', cls:'rng',  atk:200, def:200, mv:10, rng:[1,2], f:250, g:95,  mt:'foot', sp:['first'], unique:true, src:'rom·wiki'},
  mameluke: {name:'정예 맘루크',      short:'맘루', cls:'cav',  atk:300, def:250, mv:10, rng:[1,1], f:295, g:60,  mt:'horse', sp:['desert','scares'], unique:true, src:'rom·wiki'},
  samurai:  {name:'정예 사무라이',    short:'사무', cls:'inf',  atk:300, def:300, mv:9,  rng:[1,1], f:280, g:85,  mt:'foot', cap:1, bonus:'cav', unique:true, src:'rom·wiki'},
  // 용병(시장에서 날마다 바뀌는 세 자리)
  woad:     {name:'정예 대청 전사',   short:'대청', cls:'inf',  atk:250, def:250, mv:9,  rng:[1,1], f:260, g:100, mt:'foot', cap:1, sp:['fear'], merc:true, src:'rom·wiki'},
  berserk:  {name:'정예 광전사',      short:'광전', cls:'inf',  atk:250, def:250, mv:7,  rng:[1,1], f:220, g:90,  mt:'foot', cap:1, sp:['frenzy'], merc:true, src:'rom·wiki'},
  templar:  {name:'정예 성전 기사',   short:'성전', cls:'cav',  atk:250, def:250, mv:10, rng:[1,1], f:285, g:85,  mt:'horse', horse:true, sp:['plains','zeal'], merc:true, src:'rom·wiki'},
  janissary:{name:'정예 예니체리',    short:'예니', cls:'rng',  atk:300, def:225, mv:7,  rng:[1,3], f:190, g:100, mt:'foot', sp:['noMA'], merc:true, src:'rom·wiki'},
  elephant: {name:'정예 전투 코끼리', short:'코끼', cls:'cav',  atk:250, def:300, mv:7,  rng:[1,1], f:275, g:85,  mt:'horse', sp:['fear'], merc:true, src:'rom·wiki'},
  chukonu:  {name:'정예 제갈노병',    short:'제갈', cls:'rng',  atk:200, def:200, mv:7,  rng:[1,3], f:165, g:85,  mt:'foot', sp:['rapid','noMA'], merc:true, src:'rom·wiki'},
  // 영웅: 영웅 능력 없이 강한 일반 유닛. 판마다 한 명씩 마을회관 곁에서 시작하고 다시 만들 수 없다.
  richard:  {name:'사자심왕 리처드',  short:'리처', cls:'cav',  atk:350, def:400, mv:10, rng:[1,1], f:0, g:0, mt:'horse', horse:true, sp:['plains'], hero:true, src:'rom·wiki'},
  joan:     {name:'잔 다르크',        short:'잔',   cls:'inf',  atk:350, def:500, mv:7,  rng:[1,1], f:0, g:0, mt:'foot', cap:1, hero:true, src:'rom·wiki'},
  genghis:  {name:'칭기즈 칸',        short:'칭기', cls:'rng',  atk:245, def:350, mv:10, rng:[1,2], f:0, g:0, mt:'foot', sp:['first'], hero:true, src:'rom·wiki'},
  saladin:  {name:'살라딘',           short:'살라', cls:'cav',  atk:315, def:450, mv:10, rng:[1,1], f:0, g:0, mt:'horse', sp:['desert','scares'], hero:true, src:'rom·wiki'},
  yoshitsune:{name:'미나모토노 요시쓰네',short:'요시',cls:'inf', atk:280, def:450, mv:7,  rng:[1,1], f:0, g:0, mt:'foot', cap:1, sp:['anticav'], hero:true, src:'rom·wiki'}
};
const UNIT_ORDER = Object.keys(UNITS);
const MERCS = ['woad','berserk','templar','janissary','elephant','chukonu'];

// 특수 능력 설명(규칙 문서와 정보 창에 쓴다)
const SPECIALS = {
  anticav: ['대기병','기병과 싸울 때 공격·방어 +83%, 그리고 먼저 친다.'],
  noMA:    ['이동 후 공격 불가','움직인 날에는 공격하지 못한다. 반격은 한다.'],
  skirmish:['산개','근접 공격을 받으면 먼저 친다.'],
  first:   ['선제공격','공격을 받으면 먼저 친다.'],
  scout:   ['정찰','어떤 지형도 이동 비용 2를 넘지 않는다.'],
  plains:  ['평원 돌격','싸우는 칸이 평지·길이면 공격 +33%. 상대도 평원 돌격이면 둘 다 없어진다.'],
  desert:  ['사막 돌격','싸우는 칸이 사막·사막길이면 공격 +33%. 상대도 사막 돌격이면 둘 다 없어진다.'],
  scares:  ['말 겁주기','말을 탄 기병에게 공격 +33%.'],
  bldgOnly:['건물만','건물만 공격한다.'],
  unitsOnly:['유닛만','유닛만 공격한다.'],
  noCounter:['반격 없음','공격을 받아도 반격하지 못한다.'],
  volley:  ['일제 사격','체력이 50보다 많으면 공격 +50%.'],
  woodsman:['숲 사람','숲에서 싸우면 공격·방어 +33%.'],
  fear:    ['공포','맞붙은 상대의 공격·방어 −33%.'],
  frenzy:  ['광분','체력이 줄어도 공격이 약해지지 않는다.'],
  zeal:    ['열의','유닛과 싸우고 살아남으면 체력 +20.'],
  rapid:   ['연사','한 번 싸울 때 두 번 쏜다.']
};

// 생산 건물별 목록(용병은 시장에서 날마다 세 가지)
const BUILD = {
  tc:['villager'],
  barracks:['champion','pike'],
  archery:['arbalest','skirm','hha','cannon'],
  stable:['scout','paladin','camel'],
  workshop:['ram','onager','scorpion','bombard'],
  church:['monk'],
  castle:['UNIQUE','trebuchet'],
  market:['MERC']
};
// 모든 연구를 마친 값: 징병제·축산·궁술 대회·기계공 조합(각 −15 식량 −15 금), 상인 조직망(용병 −25%)
const TECH_DISCOUNT = {inf:15, rng:15, cav:15, siege:15, monk:0};
const MERC_RATE = 0.75;

/* 문명: 고유 병종과 영웅만 다르다(원작의 문명별 가격 보정은 따르지 않는다). */
const CIVS = [
  {id:1, name:'브리튼', en:'Britons',  unique:'longbow',  hero:'richard'},
  {id:2, name:'프랑크', en:'Franks',   unique:'axeman',   hero:'joan'},
  {id:3, name:'몽골',   en:'Mongols',  unique:'mangudai', hero:'genghis'},
  {id:4, name:'사라센', en:'Saracens', unique:'mameluke', hero:'saladin'},
  {id:5, name:'일본',   en:'Japanese', unique:'samurai',  hero:'yoshitsune'}
];

/* 지도: 위쪽 절반만 적고 180° 회전으로 아래쪽 절반을 만든다(두 진영이 같은 조건). 위는 CPU, 아래는 나.
   지형  . 평지  = 길  : 사막  - 사막길  h 언덕  f 숲  ^ 산  # 다리  _ 여울  % 늪  r 강  ~ 바다
   건물(소문자 중립, 대문자 CPU)  t 마을회관  b 병영  a 궁수 훈련소  s 마구간  w 공성 무기 공방  c 교회
   k 시장  x 성  o 탑  m 방앗간  p 농장  g 광산(언덕 위) */
const MAP_SRC = [
  {id:1, name:'첫 마을', note:'18×12 · 탁 트인 들판 · 빠른 한 판', half:[
    '^^f..g....fPMP=T=G',
    '^f...p.m..=PP.=B=.',
    'f..o......=.A===S.',
    '...f..h..==W.C=K.X',
    '.g..ff..=.....f.h.',
    '....x.===...f..p.m']},
  {id:2, name:'강 건너', note:'18×12 · 가운데 강 · 다리 둘과 여울 둘', half:[
    'hhf..g...fPMP=T=G^',
    'hf..p.m..=PP.=B=.f',
    'f.o.....==.A===S..',
    '..f..h.=..W.C=K.X.',
    '.g..f..=..f...h..g',
    'rrr#rrrr__rrrr#rrr']},
  {id:3, name:'사막 오아시스', note:'18×14 · 모래와 늪 · 낙타의 땅', half:[
    '::::g:::::PMP-T-G:',
    ':h::::p:m:PP:-B-::',
    '::::::::--:A---S::',
    '::o::%%:-:W:C-K:X:',
    ':g:::%f:-::::::h::',
    '::::::::-::::p:m::',
    '::x::----:::::::g:']},
  {id:4, name:'산맥 고개', note:'20×14 · 산맥 사이 고개 · 성을 쥐어라', half:[
    '^^^^g..f.fPMP=T=G^^^',
    '^^h..p.m..PP.=B=..h^',
    '^^...o...=.A===S...^',
    '^f..h...==W.C=K.X..^',
    '^^^^^^.=..^^^^...f.^',
    '.g.^^^.=.hh^^^^.p.m.',
    '.....x.=====.....f..']},
  {id:5, name:'늪과 숲', note:'18×12 · 늪이 기병을 막는다 · 숲 사람의 땅', half:[
    'fff.g..f.fPMP=T=Gf',
    'ff.%%p.m..PP.=B=.f',
    'f.%%o..ff=.A===S..',
    '.%%f..f.==W.C=K.X.',
    '.g.%f..=..ff..%%.g',
    '..%%x.==..%%.p.m.f']},
  {id:6, name:'대평원', note:'22×14 · 가장 큰 지도 · 중립 성 둘', half:[
    '^^f..g.....f..PMP=T=G^',
    '^f...p.m...=..PP.=B=.f',
    'f..o.....h.=..WA===S..',
    '..f..x..h..=====C=K.X.',
    '.g..f....f.=.....f..h.',
    '...p.m.....=.g.....o..',
    'f.......====.....p.m..']}
];
const CELL = {
  '.':'plain','=':'road',':':'desert','-':'droad','h':'hill','f':'forest','^':'mountain','#':'bridge','_':'ford','%':'swamp','r':'river','~':'ocean'
};
const BCHAR = {t:'tc',b:'barracks',a:'archery',s:'stable',w:'workshop',c:'church',k:'market',x:'castle',o:'tower',m:'mill',p:'farm',g:'mine'};
function buildMap(src){
  const top=src.half, W=top[0].length, Hh=top.length, H=Hh*2;
  const desertish=top.join('').split(':').length>W*Hh/3;
  for(const r of top) if(r.length!==W) throw Error(`지도 ${src.id}: 줄 길이가 다르다 (${r})`);
  const grid=[];
  for(let y=0;y<H;y++){const row=[];for(let x=0;x<W;x++){
    let ch, swap=false;
    if(y<Hh) ch=top[y][x]; else {ch=top[H-1-y][W-1-x]; swap=true;}
    const lo=ch.toLowerCase();
    if(CELL[ch]) row.push({t:CELL[ch], b:null});
    else if(BCHAR[lo]){
      let owner=ch===lo?0:2; if(swap&&owner) owner=3-owner;
      const bt=BCHAR[lo], base=bt==='mine'?'hill':desertish?'desert':'plain';
      row.push({t:base, b:{type:bt, owner, hp:100}});
    } else throw Error('지도 문자 오류: '+ch);
  } grid.push(row);}
  return {id:src.id, name:src.name, note:src.note, W, H, grid};
}
const MAPS = MAP_SRC.map(buildMap);

const DH_DATA={TERRAIN,TERRAIN_ORDER,BUILDINGS,BUILDING_ORDER,UNITS,UNIT_ORDER,MERCS,SPECIALS,BUILD,TECH_DISCOUNT,MERC_RATE,CIVS,MAPS,buildMap};
if(typeof module!=='undefined') module.exports=DH_DATA; else self.DH_DATA=DH_DATA;
