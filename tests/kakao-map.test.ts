import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapHandler} from '../public-api/gateway.mjs';
async function request(h,path){let status,body;await h({method:'GET'},{writeHead(s){status=s},end(b){body=JSON.parse(b)}},new URL(path,'https://test.local'));return {status,body}}
test('only public JS key exposed; map and search availability independent',async()=>{const h=createMapHandler({kakaoKey:'server-secret',javascriptKey:'public-js'});assert.deepEqual((await request(h,'/api/maps/config')).body,{javascriptKey:'public-js',provider:'kakao'});assert.deepEqual((await request(createMapHandler({kakaoKey:'secret'}),'/api/maps/status')).body,{available:false,searchAvailable:true,provider:'kakao'});});
test('Kakao search normalizes coordinates and caches concurrent requests',async()=>{let calls=0;const h=createMapHandler({kakaoKey:'secret',fetchImpl:async(u,o)=>{calls++;assert.equal(o.headers.Authorization,'KakaoAK secret');return new Response(JSON.stringify({documents:[{id:'1',place_name:'학교',x:'127',y:'35',road_address_name:'전남',category_name:'학교'},{id:'2',place_name:'bad',x:'NaN',y:'35'}]}))}});const [a,b]=await Promise.all([request(h,'/api/maps/search?q=school'),request(h,'/api/maps/search?q=school')]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.body.items.length,1);assert.equal(a.body.items[0].provider,'kakao');assert.equal(a.body.items[0].lat,35);assert.ok(!JSON.stringify(a).includes('secret'));});
test('Kakao upstream failure never exposes credentials',async()=>{const r=await request(createMapHandler({kakaoKey:'secret',fetchImpl:async()=>new Response('secret',{status:403})}),'/api/maps/search?q=school');assert.equal(r.status,502);assert.ok(!JSON.stringify(r).includes('secret'));});
test('regional fallback ranks matching address first',async()=>{const h=createMapHandler({kakaoKey:'secret',fetchImpl:async u=>new Response(JSON.stringify({documents:u.searchParams.get('query').includes(' ')?[]:[{id:'1',place_name:'학교',address_name:'서울',x:127,y:37},{id:'2',place_name:'학교',address_name:'영암',x:127,y:35}]}))});const r=await request(h,'/api/maps/search?q='+encodeURIComponent('영암 학교'));assert.equal(r.body.items[0].id,'2');assert.equal(r.body.usedQuery,'학교');});

test('school on page three is included, duplicates removed, and complete results cached',async()=>{
 const pages:number[]=[];
 const school=(id:string,name:string)=>({id,place_name:name,x:'126.92',y:'35.16'});
 const h=createMapHandler({kakaoKey:'secret',fetchImpl:async u=>{
  const page=Number(u.searchParams.get('page'));pages.push(page);
  return new Response(JSON.stringify({meta:{is_end:page===3},documents:page===1?[school('gyeonggi','광주고등학교')]:page===2?[school('gyeonggi','광주고등학교'),school('other','다른 학교')]:[school('gwangju','광주고등학교')]}));
 }});
 const url='/api/maps/search?q='+encodeURIComponent('광주고등학교');
 const first=await request(h,url);assert.deepEqual(first.body.items.map(p=>p.id),['gyeonggi','other','gwangju']);
 assert.deepEqual((await request(h,url)).body,first.body);assert.deepEqual(pages,[1,2,3]);
});

test('failure on a later page is not silently reported or cached as complete results',async()=>{
 let fail=true,calls=0;
 const h=createMapHandler({kakaoKey:'secret',fetchImpl:async u=>{
  calls++;const page=Number(u.searchParams.get('page'));
  if(page===2&&fail)return new Response('private upstream detail',{status:500});
  return new Response(JSON.stringify({meta:{is_end:page===2},documents:[{id:String(page),place_name:'학교',x:'127',y:'35'}]}));
 }});
 assert.equal((await request(h,'/api/maps/search?q=school')).status,502);
 fail=false;assert.equal((await request(h,'/api/maps/search?q=school')).body.items.length,2);assert.equal(calls,4);
});
