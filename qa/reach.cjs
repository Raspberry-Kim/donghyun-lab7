// 지도 검사: 줄 길이·마을회관 사이 보병/기병/공성 도달·건물 수. 사용: node qa/reach.cjs [id ...]
const D=require('../src/data.js');
const ids=process.argv.slice(2).map(Number); const pass={foot:t=>!['river','ocean'].includes(t),horse:t=>!['river','ocean','swamp'].includes(t),siege:t=>!['river','ocean','mountain','ford','swamp'].includes(t)};
for(const m of D.MAPS){ if(ids.length&&!ids.includes(m.id)) continue;
  const tc=[];for(let y=0;y<m.H;y++)for(let x=0;x<m.W;x++){const b=m.grid[y][x].b;if(b&&b.type==='tc')tc.push([x,y,b.owner]);}
  const res={};for(const k in pass){const seen=new Set([tc[0][0]+','+tc[0][1]]),q=[tc[0]];while(q.length){const [x,y]=q.shift();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=m.W||yy>=m.H)continue;if(!pass[k](m.grid[yy][xx].t))continue;const key=xx+','+yy;if(seen.has(key))continue;seen.add(key);q.push([xx,yy]);}}res[k]=seen.has(tc[1][0]+','+tc[1][1]);}
  const cnt={};for(const r of m.grid)for(const c of r)if(c.b){const k=c.b.type+c.b.owner;cnt[k]=(cnt[k]||0)+1;}
  console.log(m.id,m.name,m.W+'x'+m.H,JSON.stringify(res),JSON.stringify(cnt)); }
