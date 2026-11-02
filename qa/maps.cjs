// 지도 12장을 한 장에 그려 qa/maps.png로 남긴다(공개 파일 아님). 사용: node qa/maps.cjs [out.png]
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{
  const out=process.argv[2]||path.join(__dirname,'maps.png');
  const b=await chromium.launch(), p=await b.newPage({viewport:{width:1600,height:1200}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+path.join(__dirname,'..','dist','index.html'));
  const url=await p.evaluate(()=>{
    const M=DH_DATA.MAPS, T=Render.T, S=2, cols=3, cw=24*T*S+20, ch=(16*T+Render.PAD)*S+40;
    const c=document.createElement('canvas'); c.width=cols*cw; c.height=Math.ceil(M.length/cols)*ch; const g=c.getContext('2d');
    g.fillStyle='#1b1a17'; g.fillRect(0,0,c.width,c.height); g.imageSmoothingEnabled=false;
    M.forEach((m,i)=>{ const L=Render.terrainLayer(m), x=(i%cols)*cw+10, y=Math.floor(i/cols)*ch+30;
      g.fillStyle='#f4efe4'; g.font='bold 20px sans-serif'; g.fillText(m.id+' '+m.name+' · '+m.note,x,y-8);
      g.drawImage(L,x,y,L.width*S,L.height*S); });
    return c.toDataURL();
  });
  fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64'));
  console.log(JSON.stringify({out,errs}));
  await b.close();
})();
