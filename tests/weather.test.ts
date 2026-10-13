import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forecastBase,gridPoint,parseForecast,createWeatherHandler} from '../public-api/weather.mjs';
const now=Date.parse('2026-10-02T13:20:00+09:00');
const payload=()=>({response:{header:{resultCode:'00'},body:{items:{item:['1200','1300','1400'].flatMap(fcstTime=>Object.entries({TMP:'22',POP:'0',SKY:'1',PTY:'0'}).map(([category,fcstValue])=>({fcstDate:'20261002',fcstTime,category,fcstValue})))}}}});
async function call(handler,method='GET'){let status=0,result:any;await handler({method},{writeHead(s:number){status=s},end(body:string){result=JSON.parse(body)}},new URL('http://localhost/api/weather/center'));return {status,result}}
test('weather release uses KST and publication delay across midnight',()=>{
 assert.deepEqual(forecastBase(Date.parse('2026-10-02T00:10:00+09:00')),{base_date:'20261001',base_time:'2300'});
 assert.equal(forecastBase(Date.parse('2026-10-02T14:39:00+09:00')).base_time,'1100');
 assert.equal(forecastBase(Date.parse('2026-10-02T14:40:00+09:00')).base_time,'1400');
});
test('KMA grid matches reference Seoul and fixed center',()=>{assert.deepEqual(gridPoint(37.5665,126.978),{nx:60,ny:127});assert.deepEqual(gridPoint(34.532971970616224,127.46826930052721),{nx:69,ny:61})});
test('weather preserves zero rain, excludes past slots and rejects missing or invalid values',()=>{
 const rows=parseForecast(payload(),now);assert.equal(rows.length,2);assert.equal(rows[0].rainProbability,0);assert.equal(rows[0].temperature,22);
 const missing=payload();missing.response.body.items.item=missing.response.body.items.item.filter(i=>i.category!=='TMP');assert.throws(()=>parseForecast(missing,now));
 const invalid=payload();invalid.response.body.items.item.forEach(i=>{if(i.category==='POP')i.fcstValue='-999'});assert.throws(()=>parseForecast(invalid,now));assert.throws(()=>parseForecast(payload(),now+86400000));
});
test('weather caches requests without exposing the key; expired hour refreshes',async()=>{
 let count=0,clock=now;const handler=createWeatherHandler({key:'test+secret=',now:()=>clock,fetchImpl:async(url:URL)=>{count++;assert.equal(url.searchParams.get('serviceKey'),'test+secret=');assert.equal(url.searchParams.get('nx'),'69');return {ok:true,json:async()=>payload()}}});
 const [a,b]=await Promise.all([call(handler),call(handler)]);assert.equal(a.status,200);assert.deepEqual(a,b);assert.equal(count,1);assert.ok(!JSON.stringify(a).includes('secret'));await call(handler);assert.equal(count,1);
 clock+=3600000;await call(handler);assert.equal(count,2);
});
test('weather fails closed and sanitizes upstream failures with a retry cooldown',async()=>{
 let count=0;const handler=createWeatherHandler({key:'private',now:()=>now,fetchImpl:async()=>{count++;throw Error('https://example.test?serviceKey=private')}});
 const response=await call(handler);assert.equal(response.status,502);assert.ok(!JSON.stringify(response).includes('private'));await call(handler);assert.equal(count,1);
 assert.equal((await call(createWeatherHandler({key:''}))).status,503);assert.equal((await call(handler,'POST')).status,405);
});

test('wind speed preserves calm and decimals and omits missing or invalid readings',()=>{
 for(const value of ['0','3.2','-999','']){const d=payload();for(const fcstTime of ['1300','1400'])d.response.body.items.item.push({fcstDate:'20261002',fcstTime,category:'WSD',fcstValue:value});assert.equal(parseForecast(d,now)[0].windSpeed,value==='0'?0:value==='3.2'?3.2:null);}
 assert.equal(parseForecast(payload(),now)[0].windSpeed,null);
});
