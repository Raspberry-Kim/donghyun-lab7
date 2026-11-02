// 동현AI™끼리 자동 대전: 지도마다 n판(60일 상한), 오류·멈춤 검사. 사용: node qa/sim.cjs [id ...]
global.self=global; const D=require('../src/data.js'); global.DH_DATA=D; const E=require('../src/engine.js'); global.Engine=E; const AI=require('../src/ai.js');
const ids=process.argv.slice(2).map(Number);
for(const m of D.MAPS){ if(ids.length&&!ids.includes(m.id)) continue;
  const out=[];
  for(let seed=1;seed<=4;seed++){
    const s=E.newGame({map:m.id,civ1:((seed-1)%5)+1,civ2:(seed%5)+1,first:1,funds:0,seed});
    let guard=0;
    try{
      while(!s.winner && s.day<=60 && guard++<20000){
        // 두 진영 모두 AI 규칙으로 둔다
        const a=AI.next(s); if(a.k==='end'){ AI.apply(s,a); } else if(!AI.apply(s,a)) { E.endTurn(s); }
      }
      out.push(`${s.winner?'P'+s.winner:'-'}@${s.day}`);
    }catch(e){ out.push('ERR '+e.message); }
  }
  console.log(m.id,m.name,m.W+'x'+m.H,out.join(' '));
}
