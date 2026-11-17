// 윈도우의 ‘애니메이션 효과’ 끔(prefers-reduced-motion: reduce)에서도 이동·전투·차례 알림·동현AI 차례의
// 기다림이 통상과 같은지 본다. 게임이 건 기다림(setTimeout)의 길이를 조건마다 적어 대조한다.
// 주소의 ?motion=reduce 로 동작을 줄인 조건은 따로 확인한다. 두 저장소(동현전·동현워)에서 같은 파일을 쓴다.
// 사용: node qa/windows-motion.cjs [URL]
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const WIN='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
(async()=>{
  const root=path.resolve(__dirname,'..'),war=path.basename(root).includes('war');
  const url=process.argv[2]||'file://'+path.join(root,'index.html');
  const b=await chromium.launch({channel:'chromium'});
  const play=async(options,query='')=>{
    const ctx=await b.newContext({viewport:{width:1440,height:1000},...options});
    await ctx.addInitScript(()=>{
      let seed=20261117;Math.random=()=>(seed=(seed*48271)%2147483647)/2147483647;
      const real=window.setTimeout;window.__waits=[];
      window.setTimeout=function(f,ms,...rest){window.__waits.push(Math.round(ms||0));return real.call(window,f,ms,...rest);};
    });
    const p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(url+query);await p.waitForFunction(()=>typeof render_game_to_text==='function');
    const state=()=>p.evaluate(()=>JSON.parse(render_game_to_text()));
    const take=()=>p.evaluate(()=>window.__waits.splice(0));
    const idle=()=>p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='idle'&&document.querySelector('#banner').hidden,null,{timeout:120000});
    const pick=async label=>{const s=await state();assert(s.menu?.includes(label),JSON.stringify(s.menu));await p.locator('#menu .mi').filter({has:p.locator('span',{hasText:new RegExp('^'+label+'$')})}).click();};
    const go=async([x,y])=>{await p.locator('#board-wrap').focus();for(let i=0;i<100;i++){const c=(await state()).cursor;if(c[0]===x&&c[1]===y)return;await p.keyboard.press(c[0]!==x?(c[0]<x?'ArrowRight':'ArrowLeft'):(c[1]<y?'ArrowDown':'ArrowUp'));}throw Error('cursor');};
    const os=await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
    await p.selectOption('#example',war?'first':'field');await p.waitForTimeout(400);await take();
    await p.click('#run');await idle();const start=await take();
    // 평지나 길 네 칸에 내 유닛과 상대 유닛을 놓고, 실제 키 입력으로 두 칸 이동한 뒤 공격한다.
    const f=await p.evaluate(war=>{
      const s=(war?__dongHyunWar:__dongHyunJeon).state;
      for(let y=1;y<s.map.H-1;y++)for(let x=1;x<s.map.W-4;x++){
        if([0,1,2,3].some(dx=>!['plain','road'].includes(s.map.grid[y][x+dx].t)||s.map.grid[y][x+dx].b||Engine.unitAt(s,x+dx,y)))continue;
        const make=(type,owner,xx)=>{const d=DH_DATA.UNITS[type],u={id:s.nextId++,type,owner,x:xx,y,hp:100,done:false,cargo:[],fuel:d.fuel||99,ammo:d.ammo||9,dived:false};s.units.push(u);s.players[owner].had=true;return u.id;};
        return {x,y,a:make(war?'champion':'tank',1,x),e:make(war?'villager':'inf',2,x+3)};
      }throw Error('no fixture space');
    },war);
    await go([f.x,f.y]);await p.keyboard.press('x');assert.equal((await state()).mode,'move');await take();
    await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');
    const t0=Date.now();await p.keyboard.press('x');
    await p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='action');const moveMs=Date.now()-t0,move=await take();
    await pick('공격');assert.equal((await state()).mode,'target');await take();
    await p.keyboard.press('x');await idle();const fire=await take();
    await p.keyboard.press('Enter');await pick('턴 종료');
    if((await state()).menu?.includes('턴을 끝낸다'))await pick('턴을 끝낸다');
    await take();const t1=Date.now();
    await p.waitForFunction(()=>{const s=JSON.parse(render_game_to_text());return s.turn===1&&s.day>=2&&s.mode==='idle'&&document.querySelector('#banner').hidden;},null,{timeout:240000});
    const cpuMs=Date.now()-t1,cpu=await take(),end=await state();
    await ctx.close();
    return {os,errors,start,move,fire,cpu,moveMs,cpuMs,units:end.units};
  };
  let checks=0;const pass=s=>{checks++;console.log('PASS',s);};
  try{
    const usual=await play({});
    assert.equal(usual.os,false);assert.deepEqual(usual.errors,[]);
    assert(usual.start.includes(950),'차례 알림 950ms: '+usual.start);
    assert(usual.move.includes(140),'두 칸 이동 140ms: '+usual.move);assert(usual.moveMs>=130,'이동에 걸린 시간 '+usual.moveMs);
    assert(usual.fire.includes(520),'전투 뒤 520ms: '+usual.fire);
    assert(usual.cpu.includes(950)&&usual.cpu.some(ms=>ms>=65&&ms%65===0),'동현AI 차례의 알림과 이동: '+usual.cpu);
    pass(`통상 조건: 알림 950ms · 두 칸 이동 140ms · 전투 520ms · 동현AI 차례 기다림 ${usual.cpu.length}번 ${(usual.cpuMs/1000).toFixed(1)}초`);
    for(const [label,options] of [['윈도우 크롬',{userAgent:WIN,reducedMotion:'reduce'}],['윈도우 엣지',{userAgent:WIN+' Edg/130.0.0.0',reducedMotion:'reduce'}]]){
      const win=await play(options);
      assert.equal(win.os,true);assert.deepEqual(win.errors,[]);
      for(const k of ['start','move','fire','cpu'])assert.deepEqual(win[k],usual[k],`${label} 동작 줄이기: ${k} 기다림이 통상과 다르다`);
      assert.deepEqual(win.units,usual.units,label+': 동현AI 차례 뒤 유닛 상태');
      assert(win.moveMs>=130&&win.cpuMs>=usual.cpuMs*.7,JSON.stringify([win.moveMs,win.cpuMs,usual.cpuMs]));
      pass(`${label} UA + 동작 줄이기: 기다림 ${win.start.length+win.move.length+win.fire.length+win.cpu.length}번의 길이가 통상과 같음 · 동현AI 차례 ${(win.cpuMs/1000).toFixed(1)}초`);
    }
    const reduced=await play({},'?motion=reduce');
    assert.deepEqual(reduced.errors,[]);
    assert(reduced.start.includes(350)&&!reduced.start.includes(950),'줄인 알림 350ms: '+reduced.start);
    assert(reduced.move.includes(40)&&!reduced.move.includes(140),'줄인 이동 40ms: '+reduced.move);
    assert(reduced.fire.includes(100)&&!reduced.fire.includes(520),'줄인 전투 100ms: '+reduced.fire);
    assert.deepEqual(reduced.units,usual.units,'줄인 조건에서도 같은 진행');
    assert(reduced.cpuMs<usual.cpuMs);
    pass(`?motion=reduce: 알림 350ms · 두 칸 이동 40ms · 전투 100ms · 동현AI 차례 ${(reduced.cpuMs/1000).toFixed(1)}초 · 진행 결과는 통상과 같음`);
    console.log(`PASS ${checks} windows-motion groups`);
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
