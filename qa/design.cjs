// Usage in either repository: node qa/design.cjs [URL]
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
  const root=path.resolve(__dirname,'..'),war=path.basename(root).includes('war'),name=war?'war':'jeon';
  const out=path.join(root,'qa','design-output');fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({channel:'chromium'}),ctx=await b.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});
  const p=await ctx.newPage(),errors=[],checks=[];p.on('pageerror',e=>errors.push(e.message));
  const ok=(s)=>{checks.push(s);console.log('PASS',s)};
  const url=process.argv[2]||'file://'+path.join(root,'index.html');
  await p.goto(url);await p.waitForFunction(()=>typeof Render!=='undefined'&&typeof render_game_to_text==='function');
  await p.evaluate(()=>document.fonts.ready);
  const state=()=>p.evaluate(()=>JSON.parse(render_game_to_text()));
  const pick=async label=>{const s=await state();assert(s.menu?.includes(label),JSON.stringify(s));await p.locator('#menu .mi').filter({has:p.locator('span',{hasText:new RegExp('^'+label+'$')})}).click()};
  const idle=()=>p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='idle'&&document.querySelector('#banner').hidden);
  const go=async([x,y])=>{await p.locator('#board-wrap').focus();for(let i=0;i<100;i++){const c=(await state()).cursor;if(c[0]===x&&c[1]===y)return;await p.keyboard.press(c[0]!==x?(c[0]<x?'ArrowRight':'ArrowLeft'):(c[1]<y?'ArrowDown':'ArrowUp'))}throw Error('cursor did not reach target')};
  assert.equal((await state()).mode,'setup');
  await p.selectOption('#example',war?'desert':'strait');
  await p.waitForFunction(()=>document.querySelector('#day').textContent.includes('사막')||document.querySelector('#day').textContent.includes('해협'));
  assert.equal((await state()).mode,'setup');ok('예제 선택은 미리보기만 갱신');
  await p.screenshot({path:path.join(out,'setup.png')});
  // Every map, every unit, every ownership/completion variant, no state mutations.
  const matrix=await p.evaluate(war=>{
    const sums=[],types=Object.keys(DH_DATA.UNITS);
    for(const map of DH_DATA.MAPS){
      const orig=JSON.stringify(map),layer=Render.terrainLayer(map);
      if(layer.width!==map.W*16||layer.height!==map.H*16+4)throw Error('map dimensions');
      if(JSON.stringify(map)!==orig)throw Error('map mutation');
      const s=Engine.newGame({map:map.id,co1:1,co2:2,civ1:1,civ2:2,first:1,seed:5,funds:0});
      s.units=types.map((type,i)=>({id:i+1,type,owner:i%2+1,x:i%map.W,y:1+Math.floor(i/map.W),hp:60,done:i%3===0,cargo:[],fuel:99,ammo:9}));
      const before=JSON.stringify(s),c=document.createElement('canvas');c.width=layer.width;c.height=layer.height;
      const g=c.getContext('2d'),ui={terrainVer:1,fx:[],moveSet:new Set([1001,1002]),atkSet:new Set([2001,2002]),cursor:[1,1]};
      Render.draw(g,s,ui,0);Render.draw(g,s,ui,900);
      if(JSON.stringify(s)!==before)throw Error('renderer mutates game');
      const pixels=g.getImageData(0,0,c.width,c.height).data;
      if(!pixels.some(v=>v>0))throw Error('blank map');
      sums.push([map.id,map.W,map.H]);
    }
    const variants=[];
    for(const type of types){
      const all=[];
      for(const owner of [1,2])for(const gray of [false,true]){
        const c=Render.sprite(type,owner,gray),d=c.getContext('2d').getImageData(0,0,16,16).data;
        let count=0;for(let i=3;i<d.length;i+=4)if(d[i])count++;
        if(count<30||count>250)throw Error('invalid sprite '+type);
        all.push(c.toDataURL());
      }
      if(new Set(all).size!==4)throw Error('variant collision '+type);
      variants.push(type);
    }
    return {maps:sums.length,types:variants.length,variants:variants.length*4};
  },war);
  assert.equal(matrix.maps,war?12:28);assert.equal(matrix.types,war?32:21);ok(JSON.stringify(matrix)+' 지도·부대 전수 렌더와 상태 불변');
  await p.selectOption('#example',war?'first':'field');
  const valid=await p.locator('#code').inputValue();await p.fill('#code','틀린 코드');await p.click('#run');
  assert.equal((await state()).mode,'setup');assert.equal(await p.locator('#result').getAttribute('data-kind'),'error');
  await p.fill('#code',valid);await p.click('#run');await idle();ok('오류 코드 거부 후 정상 출전');
  // Build through the real facility menu.
  const facility=await p.evaluate(war=>{const s=(war?__dongHyunWar:__dongHyunJeon).state;for(let y=0;y<s.map.H;y++)for(let x=0;x<s.map.W;x++){const list=Engine.canBuildAt(s,1,x,y);if(list.length&&!Engine.unitAt(s,x,y))return [x,y]}},war);
  assert(facility);await go(facility);await p.keyboard.press('x');assert.equal((await state()).mode,'build');
  const beforeCount=(await state()).units.length;await p.screenshot({path:path.join(out,'production.png')});
  await p.keyboard.press('x');assert.equal((await state()).units.length,beforeCount+1);ok('시설 생산 메뉴와 실제 생산');
  // Stage adjacent units on existing plain tiles; execute movement and combat with real input.
  const fixture=await p.evaluate(war=>{
    const s=(war?__dongHyunWar:__dongHyunJeon).state;
    for(let y=2;y<s.map.H-2;y++)for(let x=2;x<s.map.W-4;x++){
      if([0,1,2].some(dx=>s.map.grid[y][x+dx].t!=='plain'||s.map.grid[y][x+dx].b||Engine.unitAt(s,x+dx,y)))continue;
      const make=(type,owner,xx)=>{const d=DH_DATA.UNITS[type],u={id:s.nextId++,type,owner,x:xx,y,hp:100,done:false,cargo:[],fuel:d.fuel||99,ammo:d.ammo||9,dived:false};s.units.push(u);s.players[owner].had=true;return u.id};
      return {x,y,a:make(war?'champion':'tank',1,x),e:make(war?'villager':'inf',2,x+2)};
    }throw Error('no fixture space');
  },war);
  await go([fixture.x,fixture.y]);await p.keyboard.press('x');assert.equal((await state()).mode,'move');
  await p.screenshot({path:path.join(out,'move-range.png')});await p.keyboard.press('ArrowRight');await p.keyboard.press('x');
  await p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='action');await pick('공격');
  assert.equal((await state()).mode,'target');await p.screenshot({path:path.join(out,'attack-range.png')});
  await p.keyboard.press('x');await idle();const post=await state(),victim=post.units.find(u=>u.id===fixture.e);
  assert(!victim||victim.hp<100);assert(post.units.find(u=>u.id===fixture.a).done);
  await p.screenshot({path:path.join(out,'combat.png')});ok('선택·이동·공격·반격·체력·행동 완료');
  // Save, mutate fixture, load; compare all serialized units.
  await p.keyboard.press('Enter');await pick('저장');await pick('브라우저 칸 1');
  const saved=(await state()).units;
  await p.evaluate(war=>{const s=(war?__dongHyunWar:__dongHyunJeon).state;s.units[0].hp=1},war);
  await p.keyboard.press('Enter');await pick('불러오기');await pick('브라우저 칸 1');await pick('불러온다');await idle();
  assert.deepEqual((await state()).units,saved);ok('브라우저 칸 저장·불러오기 상태 동일');
  // One opponent turn, allowing the existing fast-forward input.
  await p.keyboard.press('Enter');await pick('턴 종료');
  if((await state()).menu?.includes('턴을 끝낸다'))await pick('턴을 끝낸다');
  await p.keyboard.press('x');
  await p.waitForFunction(()=>{const s=JSON.parse(render_game_to_text());return s.turn===1&&s.day>=2&&s.mode==='idle'&&document.querySelector('#banner').hidden},null,{timeout:120000});
  ok('AI 차례 후 다음 날 내 차례');
  await p.click('#full');await p.waitForFunction(()=>document.querySelector('#stage-full').classList.contains('fs'));
  await p.locator('#board-wrap').focus();await p.keyboard.press('Enter');await p.waitForSelector('#menu .mi');
  const fsMenu=await p.evaluate(()=>{const m=document.querySelector('#menu'),ink=getComputedStyle(m).getPropertyValue('--ink').trim();const hex=c=>'#'+c.match(/\d+/g).slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('');return {ink,menu:hex(getComputedStyle(m).color),items:[...m.querySelectorAll('.mi:not(.sel)')].map(e=>hex(getComputedStyle(e).color)),pads:[...document.querySelectorAll('.pad-keys button')].filter(e=>getComputedStyle(e).backgroundColor===getComputedStyle(m).backgroundColor).map(e=>hex(getComputedStyle(e).color))}});
  assert.equal(fsMenu.menu,fsMenu.ink,'fullscreen menu ink');for(const c of [...fsMenu.items,...fsMenu.pads]) assert.equal(c,fsMenu.ink,'fullscreen item ink');
  await p.screenshot({path:path.join(out,'fullscreen-menu.png')});await p.keyboard.press('z');await p.waitForFunction(()=>!document.querySelector('#menu .mi')||document.querySelector('#menu').hidden);
  ok('전체 화면 메뉴·터치 단추 글자색이 종이색 바탕용 잉크색');
  await p.screenshot({path:path.join(out,'fullscreen.png')});await p.click('#exit-full');
  await p.waitForFunction(()=>!document.querySelector('#stage-full').classList.contains('fs'));ok('전체 화면 열기·닫기');
  for(const tab of ['protocol','rules','about','play']){await p.click('[data-tab="'+tab+'"]');assert.equal(await p.locator('[data-tab="'+tab+'"]').getAttribute('aria-current'),'page')}
  const snd=await p.locator('#sound').getAttribute('aria-pressed');await p.click('#sound');assert.notEqual(await p.locator('#sound').getAttribute('aria-pressed'),snd);await p.click('#sound');
  await p.click('#theme');await p.screenshot({path:path.join(out,'dark.png')});await p.click('#theme');ok('설명 탭·소리·밝기 전환 왕복');
  for(const vp of [{width:375,height:812},{width:1440,height:650},{width:1440,height:1000}]){
    await p.setViewportSize(vp);await p.locator('#board').scrollIntoViewIfNeeded();
    const fit=await p.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,board:document.querySelector('#board').getBoundingClientRect().toJSON()}));
    assert(fit.doc<=fit.w+1,JSON.stringify(fit));assert(fit.board.width<=fit.w+1);
    await p.screenshot({path:path.join(out,'viewport-'+vp.width+'-'+vp.height+'.png')});
  }
  const prevCursor=(await state()).cursor;
  await p.setViewportSize({width:375,height:812});await p.locator('#touchpad [data-key="ArrowRight"]').click();
  assert.notDeepEqual((await state()).cursor,prevCursor);ok('375px·짧은 데스크톱·다시 넓은 화면·화면 방향 단추');
  const timing=await p.evaluate(()=>new Promise(resolve=>{let prev=performance.now(),times=[];function tick(now){times.push(now-prev);prev=now;if(times.length<61)requestAnimationFrame(tick);else resolve(times.slice(1).sort((a,b)=>a-b)[30])}requestAnimationFrame(tick)}));
  assert(timing<50,'frame median '+timing);ok('중앙 프레임 간격 '+timing.toFixed(1)+'ms');
  assert.deepEqual(errors,[]);ok('브라우저 오류 없음');
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({name,matrix,checks,errors,medianFrameMs:timing},null,2));
  await b.close();console.log(checks.length+' groups passed');
})().catch(e=>{console.error(e);process.exit(1)});
