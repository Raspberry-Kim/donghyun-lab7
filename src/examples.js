/* 동현워 출전 예제. 동현랭 출력 정수: 명령 번호 뒤에 값. 1 지도 · 2 나의 문명 · 3 CPU 문명 · 4 선공 · 5 시작 자원 · 7 난수 시드 · 6 출전 */
function expression(n){
  if(n===0)return '도옹ㅠ';
  if(n<0)return 'ㅠ '+expression(-n);
  if(n<=10)return '도'+'오'.repeat(n-1)+'옹';
  for(let a=10;a>=2;a--)if(n%a===0)return expression(a)+' '+expression(n/a);
  return '도'+'오'.repeat(n-1)+'옹';
}
const output=(...ns)=>ns.map(n=>'뿡뿡 '+expression(n)+'~뿡뿡뿡').join('~');
const block=(label,...ns)=>'ㅋㅋ '+label+'\n'+output(...ns);
const wrap=a=>['나는 동현이냐?',...a,'동현이구나'].join('\n');
const sortie=block('출전',6);
const examples=[
 {id:'first',title:'01 · 첫 마을',note:'18×12의 탁 트인 들판. 브리튼(장궁병 · 사자심왕 리처드)으로 프랑크와 겨룬다. 내가 먼저 움직인다.',
  code:wrap([block('지도 1 · 첫 마을',1,1),block('나의 문명 1 · 브리튼',2,1),block('CPU 문명 2 · 프랑크',3,2),block('선공 1 · 내가 먼저',4,1),sortie])},
 {id:'river',title:'02 · 강 건너',note:'가운데 강을 다리 둘과 여울 둘로 건넌다. 공성 무기는 여울을 지나지 못한다. 일본(사무라이 · 요시쓰네)으로 몽골과 겨룬다.',
  code:wrap([block('지도 2 · 강 건너',1,2),block('나의 문명 5 · 일본',2,5),block('CPU 문명 3 · 몽골',3,3),sortie])},
 {id:'desert',title:'03 · 사막 오아시스',note:'모래땅에서는 사막 돌격(낙타 · 맘루크 · 살라딘)이 강하다. 사라센으로 브리튼과 겨루고, 시작 자원을 1000으로 늘린다.',
  code:wrap([block('지도 3 · 사막 오아시스',1,3),block('나의 문명 4 · 사라센',2,4),block('CPU 문명 1 · 브리튼',3,1),block('시작 자원 1000',5,1000),sortie])},
 {id:'pass',title:'04 · 산맥 고개',note:'산맥 사이 고개 하나로 부딪친다. 산 위에서는 사거리가 1 늘고 방어가 40% 오른다. 이번에는 CPU가 먼저 움직인다.',
  code:wrap([block('지도 4 · 산맥 고개',1,4),block('나의 문명 3 · 몽골',2,3),block('CPU 문명 4 · 사라센',3,4),block('선공 2 · CPU가 먼저',4,2),sortie])},
 {id:'swamp',title:'05 · 늪과 숲',note:'늪에는 말이 들어가지 못하고, 숲에서는 도끼 투척병이 강하다. 프랑크(잔 다르크)로 일본과 겨룬다.',
  code:wrap([block('지도 5 · 늪과 숲',1,5),block('나의 문명 2 · 프랑크',2,2),block('CPU 문명 5 · 일본',3,5),sortie])},
 {id:'plain',title:'06 · 대평원',note:'가장 큰 지도. 가운데 중립 성 둘과 탑 넷을 먼저 잡자. 같은 시드 2026은 언제나 같은 운을 낸다.',
  code:wrap([block('지도 6 · 대평원',1,6),block('나의 문명 1 · 브리튼',2,1),block('CPU 문명 1 · 브리튼',3,1),block('시작 자원 800',5,800),block('난수 시드 2026',7,2026),sortie])}
];
