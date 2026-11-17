// 승리 축하: 이기면 팡파르(pomp)와 꽃비가 나오고, 지면 예전 소리(lose)만 나며 꽃비가 없는지 본다.
// 꽃비가 결과 카드 자리를 비우고 버튼을 가리지 않는지, 약 10초 뒤 스스로 걷히는지, 결과 카드를 닫으면 함께 멈추는지,
// 소리를 꺼도 꽃비는 내리는지, ?motion=reduce에서는 멈춘 꽃잎인지, 휴대폰 크기와 전체 화면에서도 맞는지 확인한다.
// 두 저장소(동현전·동현워)에서 같은 파일을 쓴다. 승리는 상대의 마지막 유닛을 실제 키 입력으로 공격해 만든다.
// 사용: node qa/victory.cjs [chromium|firefox|webkit] [URL]
const pw=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const WIN='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async()=>{
  const root=path.resolve(__dirname,'..'),war=path.basename(root).includes('war'),name=process.argv[2]||'chromium';
  const url=process.argv[3]||'file://'+path.join(root,'index.html'),out=path.join(root,'qa');   // qa/*.png는 저장소에 올리지 않는다
  const b=await pw[name].launch(name==='chromium'?{channel:'chromium'}:{});
  let checks=0;const pass=s=>{checks++;console.log('PASS',s);};
  const open=async(options={},query='')=>{
    const ctx=await b.newContext({viewport:{width:1440,height:1000},locale:'ko-KR',...options});
    const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await p.goto(url+query);await p.waitForFunction(()=>typeof render_game_to_text==='function');
    const H=()=>p.evaluate(war=>{const h=war?__dongHyunWar:__dongHyunJeon,c=document.querySelector('.dh-petals'),card=document.querySelector('#result-card');
      return {mode:h.mode,sounds:h.sounds,on:DHPETALS.on,count:DHPETALS.count,ended:DHPETALS.ended,canvases:document.querySelectorAll('.dh-petals').length,
        inStage:!!c&&c.parentNode===document.querySelector('.board-stage'),pe:c?getComputedStyle(c).pointerEvents:null,card:card.hidden?null:card.querySelector('h3').textContent,
        size:c?[c.clientWidth,c.clientHeight,document.querySelector('.board-stage').clientWidth,document.querySelector('.board-stage').clientHeight]:null};},war);
    const state=()=>p.evaluate(()=>JSON.parse(render_game_to_text()));
    const idle=()=>p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='idle'&&document.querySelector('#banner').hidden,null,{timeout:120000});
    const pick=async label=>{const s=await state();assert(s.menu?.includes(label),JSON.stringify(s.menu));await p.locator('#menu .mi').filter({has:p.locator('span',{hasText:new RegExp('^'+label+'$')})}).click();};
    const go=async([x,y])=>{await p.locator('#board-wrap').focus();for(let i=0;i<100;i++){const c=(await state()).cursor;if(c[0]===x&&c[1]===y)return;await p.keyboard.press(c[0]!==x?(c[0]<x?'ArrowRight':'ArrowLeft'):(c[1]<y?'ArrowDown':'ArrowUp'));}throw Error('cursor');};
    const start=async()=>{await p.selectOption('#example',war?'first':'field');await p.waitForTimeout(300);await p.click('#run');await idle();};
    // 상대 유닛을 하나만 남기고(체력 1) 내 유닛 두 칸 옆에 둔다. 동현워는 상대가 유닛을 더 만들 건물도 중립으로 돌린다.
    const win=async()=>{
      const f=await p.evaluate(war=>{
        const s=(war?__dongHyunWar:__dongHyunJeon).state;
        s.units=s.units.filter(u=>u.owner===1);
        if(war)for(const r of s.map.grid)for(const c of r)if(c.b&&c.b.owner===2)c.b.owner=0;
        for(let y=1;y<s.map.H-1;y++)for(let x=1;x<s.map.W-4;x++){
          if([0,1,2,3].some(dx=>!['plain','road'].includes(s.map.grid[y][x+dx].t)||s.map.grid[y][x+dx].b||Engine.unitAt(s,x+dx,y)))continue;
          const make=(type,owner,xx,hp)=>{const d=DH_DATA.UNITS[type],u={id:s.nextId++,type,owner,x:xx,y,hp,done:false,cargo:[],fuel:d.fuel||99,ammo:d.ammo||9,dived:false};s.units.push(u);s.players[owner].had=true;return u.id;};
          return {x,y,a:make(war?'champion':'tank',1,x,100),e:make(war?'villager':'inf',2,x+3,1)};
        }throw Error('no fixture space');
      },war);
      await go([f.x,f.y]);await p.keyboard.press('x');assert.equal((await state()).mode,'move');
      await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');await p.keyboard.press('x');
      await p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='action');await pick('공격');await p.keyboard.press('x');
      await p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='over',null,{timeout:30000});
    };
    const pixels=()=>p.evaluate(()=>{const c=document.querySelector('.dh-petals');if(!c)return 0;const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n;});
    /** 결과 카드 자리 안쪽에 찍힌 꽃잎 점의 수(0이어야 한다) */
    const inCard=()=>p.evaluate(()=>{const c=document.querySelector('.dh-petals'),card=document.querySelector('#result-card>div');if(!c||!card)return -1;
      const a=card.getBoundingClientRect(),b=c.getBoundingClientRect(),k=c.width/b.width,x=Math.ceil((a.left-b.left+1)*k),y=Math.ceil((a.top-b.top+1)*k),w=Math.floor((a.width-2)*k),h=Math.floor((a.height-2)*k);
      const d=c.getContext('2d').getImageData(x,y,w,h).data;let n=0;for(let i=3;i<d.length;i+=4)if(d[i])n++;return n;});
    const picture=()=>p.evaluate(()=>{const c=document.querySelector('.dh-petals');return c?c.toDataURL():'';});
    return {ctx,p,errors,H,state,idle,pick,go,start,win,pixels,inCard,picture};
  };
  try{
    // 1. 데스크톱: 승리 → 팡파르와 꽃비, 약 10초 뒤 스스로 걷힘, 그 뒤에도 카드는 남는다
    let t=await open();await t.start();
    assert.deepEqual([(await t.H()).on,(await t.H()).canvases],[false,0],'시작할 때는 꽃비가 없다');
    await t.win();const t0=Date.now();await t.p.waitForFunction(()=>DHPETALS.count>10,null,{timeout:5000});
    let h=await t.H();
    assert.equal(h.card,'승리');assert(h.sounds.includes('pomp')&&!h.sounds.includes('win')&&!h.sounds.includes('lose'),'승리 소리: '+h.sounds);
    assert.deepEqual([h.on,h.canvases,h.inStage,h.pe],[true,1,true,'none']);assert.deepEqual(h.size.slice(0,2),h.size.slice(2),'꽃비가 판 전체를 덮는다');
    assert(await t.pixels()>200,'꽃잎이 그려진다');
    const a=await t.picture();await t.p.waitForTimeout(700);assert.notEqual(await t.picture(),a,'꽃잎이 움직인다');
    assert.equal(await t.p.evaluate(war=>(war?__dongHyunWar:__dongHyunJeon).ringing,war),true,'팡파르가 울리는 중');
    await t.p.waitForTimeout(Math.max(0,2500-(Date.now()-t0)));assert.equal(await t.inCard(),0,'카드 자리는 비어 있다');await t.p.locator('.board-stage').screenshot({path:path.join(out,`victory-${name}-desktop.png`)});
    await t.p.waitForFunction(()=>!DHPETALS.on,null,{timeout:15000});const took=(Date.now()-t0)/1000;h=await t.H();
    assert(took>9&&took<12.5,'꽃비 길이 '+took.toFixed(1)+'초');assert.deepEqual([h.ended,h.canvases,h.card],[1,0,'승리']);
    await t.p.waitForFunction(war=>!(war?__dongHyunWar:__dongHyunJeon).ringing,war,{timeout:3000});
    await t.p.click('#again');assert.equal((await t.state()).mode,'setup');assert.deepEqual(t.errors,[]);
    pass(`데스크톱 승리: 소리 pomp · 꽃비가 카드 자리를 비우고 ${took.toFixed(1)}초 뒤 걷힘 · 결과 카드 유지 · 출전 준비로 이동`);
    // 2. 꽃비가 내리는 중에 버튼을 실제 좌표로 누른다 → 카드가 닫히고 꽃비와 팡파르가 함께 멈춘다
    await t.start();await t.win();await t.p.waitForFunction(()=>DHPETALS.count>10);
    const box=await t.p.locator('#again').boundingBox();await t.p.mouse.click(box.x+box.width/2,box.y+box.height/2);
    assert.equal((await t.state()).mode,'setup','꽃비가 버튼 클릭을 막지 않는다');
    await t.p.waitForFunction(()=>!DHPETALS.on,null,{timeout:2000});h=await t.H();
    assert.deepEqual([h.canvases,h.ended,await t.p.evaluate(war=>(war?__dongHyunWar:__dongHyunJeon).ringing,war)],[0,1,false],'카드를 닫으면 꽃비와 팡파르가 멈춘다');
    assert.deepEqual(t.errors,[]);pass('꽃비 중 버튼 클릭: 출전 준비로 이동 · 꽃비와 팡파르 함께 멈춤');
    // 3. 패배: 예전 소리만, 꽃비 없음
    await t.start();await t.p.click('#concede');await t.pick('항복한다');
    await t.p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='over');await t.p.waitForTimeout(600);h=await t.H();
    assert.deepEqual([h.card,h.on,h.canvases,h.sounds.at(-1),h.sounds.filter(k=>k==='pomp').length],['패배',false,0,'lose',2]);
    assert.deepEqual(t.errors,[]);await t.ctx.close();pass('패배: 소리 lose · 꽃비 없음');
    // 4. 소리를 꺼 둔 채 승리: 팡파르는 없고 꽃비는 내린다. 켠 채 승리한 뒤 M으로 끄면 팡파르만 멈춘다
    t=await open();await t.start();await t.p.click('#sound');await t.win();await t.p.waitForFunction(()=>DHPETALS.count>10);h=await t.H();
    assert.deepEqual([h.card,h.on,h.sounds.includes('pomp')],['승리',true,false]);
    await t.p.click('#again');await t.p.click('#sound');await t.start();await t.win();await t.p.waitForFunction(()=>DHPETALS.count>10);
    const ring=()=>t.p.evaluate(war=>(war?__dongHyunWar:__dongHyunJeon).ringing,war);
    assert.equal(await ring(),true);await t.p.locator('#board-wrap').focus();await t.p.keyboard.press('m');
    assert.deepEqual([await ring(),(await t.H()).on],[false,true],'M: 팡파르는 멈추고 꽃비는 남는다');
    assert.deepEqual(t.errors,[]);await t.ctx.close();pass('소리 끔: 팡파르 없이 꽃비 · 도중에 M으로 끄면 팡파르만 멈춤');
    // 5. ?motion=reduce: 꽃잎이 멈춘 채로 보이고 약 10초 뒤 걷힌다. 운영체제의 동작 줄이기(윈도우 UA)는 따르지 않아 꽃잎이 움직인다
    t=await open({},'?motion=reduce');await t.start();await t.win();await t.p.waitForFunction(()=>DHPETALS.on);await t.p.waitForTimeout(300);
    const s1=await t.picture();await t.p.waitForTimeout(800);assert(await t.pixels()>200);assert.equal(await t.inCard(),0);assert.equal(await t.picture(),s1,'멈춘 꽃잎');
    await t.p.waitForFunction(()=>!DHPETALS.on,null,{timeout:15000});assert.deepEqual(t.errors,[]);await t.ctx.close();
    if(name==='chromium'){
      t=await open({userAgent:WIN,reducedMotion:'reduce'});assert.equal(await t.p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
      await t.start();await t.win();await t.p.waitForFunction(()=>DHPETALS.count>10);const w1=await t.picture();await t.p.waitForTimeout(700);assert.notEqual(await t.picture(),w1);
      assert.deepEqual(t.errors,[]);await t.ctx.close();
    }
    pass('?motion=reduce: 멈춘 꽃잎'+(name==='chromium'?' · 윈도우 UA + 동작 줄이기: 꽃잎이 움직임':''));
    // 6. 휴대폰 크기와 전체 화면
    t=await open({viewport:{width:390,height:844},hasTouch:true,...(name==='firefox'?{}:{isMobile:true})});await t.start();await t.win();await t.p.waitForFunction(()=>DHPETALS.count>10);h=await t.H();
    assert.deepEqual([h.card,h.inStage,h.pe],['승리',true,'none']);assert.deepEqual(h.size.slice(0,2),h.size.slice(2));
    await t.p.waitForTimeout(1500);assert(await t.pixels()>100);assert.equal(await t.inCard(),0);await t.p.locator('.board-stage').screenshot({path:path.join(out,`victory-${name}-phone.png`)});
    await t.p.locator('#again').tap();assert.equal((await t.state()).mode,'setup');assert.deepEqual(t.errors,[]);await t.ctx.close();
    t=await open({viewport:{width:1280,height:720}});await t.start();await t.p.click('#full');await t.p.waitForFunction(()=>document.querySelector('#stage-full').classList.contains('fs'));await t.p.waitForTimeout(400);
    await t.win();await t.p.waitForFunction(()=>DHPETALS.count>10);h=await t.H();
    assert.deepEqual([h.card,h.inStage,h.pe],['승리',true,'none']);assert.deepEqual(h.size.slice(0,2),h.size.slice(2),'전체 화면에서도 판 전체를 덮는다');
    await t.p.waitForTimeout(1500);assert(await t.pixels()>200);assert.equal(await t.inCard(),0);await t.p.screenshot({path:path.join(out,`victory-${name}-full.png`)});
    const fb=await t.p.locator('#again').boundingBox();await t.p.mouse.click(fb.x+fb.width/2,fb.y+fb.height/2);
    assert.equal((await t.state()).mode,'setup');await t.p.waitForFunction(()=>!DHPETALS.on,null,{timeout:2000});assert.deepEqual(t.errors,[]);await t.ctx.close();
    pass('휴대폰 390×844 · 전체 화면 1280×720: 꽃비가 판 전체를 덮고 카드 자리는 비움 · 버튼이 눌림');
    console.log(`PASS ${checks} victory groups (${name})`);
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
