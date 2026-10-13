import {test} from 'node:test';
import assert from 'node:assert/strict';
import {searchSchool} from '../src/schoolSearch.ts';
const place={id:'school',name:'삼호고등학교',address:'전라남도 영암군 삼호읍',lat:34.7,lng:126.4,provider:'vworld' as const};
function mock(data:Record<string,unknown[]>){const calls:string[]=[];const request=(async(url:unknown)=>{const q=new URL(String(url),'http://local').searchParams.get('q')!;calls.push(q);return new Response(JSON.stringify({items:data[q]||[]}));}) as typeof fetch;return {calls,request};}
test('unspaced regional school name finds the matching address',async()=>{const m=mock({'영암 삼호고등학교':[place,{...place,id:'wrong',address:'다른 지역'}]});assert.deepEqual(await searchSchool('영암삼호고등학교',new AbortController().signal,m.request),[place]);assert.deepEqual(m.calls,['영암삼호고등학교','영암 삼호고등학교']);});
test('successful original search is preserved without extra queries',async()=>{const m=mock({'삼호고등학교':[place]});assert.deepEqual(await searchSchool('삼호고등학교',new AbortController().signal,m.request),[place]);assert.equal(m.calls.length,1);});
test('three-syllable region and spaced official school name',async()=>{const p={...place,name:'부천시 소명여자고등학교',address:'경기도 부천시'};const m=mock({'부천시 소명여자고등학교':[p]});assert.deepEqual(await searchSchool('부천시소명여자고등학교',new AbortController().signal,m.request),[p]);});
test('unrelated schools are not returned as matches',async()=>{const m=mock({'영암 삼호고등학교':[{...place,address:'서울특별시'}]});assert.deepEqual(await searchSchool('영암삼호고등학교',new AbortController().signal,m.request),[]);});
test('cancelled searches stop before a fallback request',async()=>{const c=new AbortController();const m=mock({});const request=(async(...args:Parameters<typeof fetch>)=>{const response=await m.request(...args);c.abort();return response;}) as typeof fetch;await assert.rejects(searchSchool('영암삼호고등학교',c.signal,request));assert.equal(m.calls.length,1);});

test('abbreviated high school searches with the full school suffix',async()=>{const m=mock({'영암 삼호고등학교':[place]});assert.deepEqual(await searchSchool('영암삼호고등',new AbortController().signal,m.request),[place]);assert.ok(m.calls.includes('영암삼호고등학교'));});
test('abbreviated elementary name supports another region',async()=>{const p={...place,name:'토월초등학교',address:'경상남도 창원시'};const m=mock({'창원 토월초등학교':[p]});assert.deepEqual(await searchSchool('창원토월초등',new AbortController().signal,m.request),[p]);});
