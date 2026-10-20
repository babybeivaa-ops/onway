import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchSchool} from '../src/schoolSearch.ts';
const place={id:'school',name:'삼호고등학교',address:'전라남도 영암군 삼호읍',lat:34.7,lng:126.4,provider:'vworld' as const};
function mock(data:Record<string,unknown[]>){const calls:string[]=[];const request=(async(url:unknown)=>{const q=new URL(String(url),'http://local').searchParams.get('q')!;calls.push(q);return new Response(JSON.stringify({items:data[q]||[]}));}) as typeof fetch;return {calls,request};}
test('unspaced regional school name finds the matching address',async()=>{const m=mock({'영암 삼호고등학교':[place,{...place,id:'wrong',address:'다른 지역'}]});assert.deepEqual(await searchSchool('영암삼호고등학교',new AbortController().signal,m.request),[place]);assert.deepEqual(m.calls,['영암삼호고등학교','영암삼호고','영암 삼호고등학교']);});
test('successful original results survive an empty abbreviation search',async()=>{const m=mock({'삼호고등학교':[place]});assert.deepEqual(await searchSchool('삼호고등학교',new AbortController().signal,m.request),[place]);assert.deepEqual(m.calls,['삼호고등학교','삼호고']);});
test('three-syllable region and spaced official school name',async()=>{const p={...place,name:'부천시 소명여자고등학교',address:'경기도 부천시'};const m=mock({'부천시 소명여자고등학교':[p]});assert.deepEqual(await searchSchool('부천시소명여자고등학교',new AbortController().signal,m.request),[p]);});
test('unrelated schools are not returned as matches',async()=>{const m=mock({'영암 삼호고등학교':[{...place,address:'서울특별시'}]});assert.deepEqual(await searchSchool('영암삼호고등학교',new AbortController().signal,m.request),[]);});
test('cancelled searches stop before regional fallback requests',async()=>{const c=new AbortController();const m=mock({});const request=(async(...args:Parameters<typeof fetch>)=>{const response=await m.request(...args);c.abort();return response;}) as typeof fetch;await assert.rejects(searchSchool('영암삼호고등학교',c.signal,request));assert.deepEqual(m.calls,['영암삼호고등학교','영암삼호고']);});

test('abbreviated high school searches with the full school suffix',async()=>{const m=mock({'영암 삼호고등학교':[place]});assert.deepEqual(await searchSchool('영암삼호고등',new AbortController().signal,m.request),[place]);assert.ok(m.calls.includes('영암삼호고등학교'));});
test('abbreviated elementary name supports another region',async()=>{const p={...place,name:'토월초등학교',address:'경상남도 창원시'};const m=mock({'창원 토월초등학교':[p]});assert.deepEqual(await searchSchool('창원토월초등',new AbortController().signal,m.request),[p]);});

test('full and abbreviated searches both include same-name schools in different regions, ranked above alumni',async()=>{
 const local={...place,id:'gwangju',name:'광주고등학교',address:'광주 동구'};
 const other={...local,id:'gyeonggi',address:'경기 광주시'};
 const alumni={...local,id:'alumni',name:'재경광주고등학교 동문회',address:'서울 강남구'};
 const data={'광주고등학교':[alumni,other],'광주고':[local,other]};
 for(const query of Object.keys(data)){
  const m=mock(data);const result=await searchSchool(query,new AbortController().signal,m.request);
  assert.equal(result.length,3);assert.deepEqual(new Set(result.slice(0,2).map(p=>p.id)),new Set(['gwangju','gyeonggi']));assert.equal(result[2].id,'alumni');
 }
});

test('ordinary group names use their original search without school expansion',async()=>{
 const m=mock({'청소년센터':[place]});assert.deepEqual(await searchSchool('청소년센터',new AbortController().signal,m.request),[place]);assert.deepEqual(m.calls,['청소년센터']);
});

test('supplemental query failures preserve successful results but all failed searches reject',async()=>{
 const request=(async(url:unknown)=>{const q=new URL(String(url),'http://local').searchParams.get('q');return q==='광주고등학교'?new Response(JSON.stringify({items:[place]})):new Response('',{status:502});}) as typeof fetch;
 assert.deepEqual(await searchSchool('광주고등학교',new AbortController().signal,request),[place]);
 await assert.rejects(searchSchool('삼호고등학교',new AbortController().signal,async()=>new Response('',{status:502})));
});
