import {test} from 'node:test';import assert from 'node:assert/strict';import {searchMealPlaces} from '../src/placeSearch.ts';
const place={id:'meal',name:'섬진강 휴게소',address:'전남 광양시',lat:35,lng:127,provider:'vworld' as const};
const mock=(data:Record<string,unknown[]>)=>(async(url:unknown)=>new Response(JSON.stringify({items:data[new URL(String(url),'http://local').searchParams.get('q')!]||[]}))) as typeof fetch;
test('compact place name matches a spaced title',async()=>assert.deepEqual(await searchMealPlaces('섬진강휴게소',new AbortController().signal,mock({'섬진강 휴게소':[place]})),[place]));
test('region prefix matches address and excludes other regions',async()=>assert.deepEqual(await searchMealPlaces('광양섬진강휴게소',new AbortController().signal,mock({'광양 섬진강휴게소':[place,{...place,address:'서울'}]})),[place]));
test('existing partial-name results are retained',async()=>assert.deepEqual(await searchMealPlaces('섬진강',new AbortController().signal,mock({'섬진강':[place]})),[place]));
test('aborted requests stop',async()=>{const c=new AbortController();c.abort();await assert.rejects(searchMealPlaces('섬진강',c.signal,mock({})));});
