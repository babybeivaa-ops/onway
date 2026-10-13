import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapHandler} from '../public-api/gateway.mjs';
import {createTrafficHandler} from '../public-api/traffic.mjs';
async function request(handler,path){let status,body;await handler({method:'GET'},{writeHead(s){status=s},end(b){body=JSON.parse(b)}},new URL(path,'https://onway.test'));return {status,body};}
test('map diagnostics distinguish API rejection without leaking upstream details',async()=>{
 const h=createMapHandler({key:'private-key',domain:'https://example.org',fetchImpl:async()=>new Response(JSON.stringify({response:{status:'ERROR',error:{code:'INVALID_DOMAIN',text:'private-key upstream URL'}}}))});
 const r=await request(h,'/api/maps/search?q=school');assert.equal(r.status,502);assert.equal(r.body.diagnostic.code,'INVALID_DOMAIN');assert.ok(!JSON.stringify(r).includes('private-key'));
});
test('map HTTP rejection is distinct from a timeout and contains no response body',async()=>{
 const h=createMapHandler({key:'private-key',domain:'https://example.org',fetchImpl:async()=>new Response('private-key',{status:403})});
 const r=await request(h,'/api/maps/search?q=school');assert.deepEqual(r.body.diagnostic,{stage:'search-http',httpStatus:403});assert.ok(!JSON.stringify(r).includes('private-key'));
});
test('ITS monthly quota response does not look like zero traffic events',async()=>{
 const h=createTrafficHandler({key:'private-key',fetchImpl:async()=>new Response(JSON.stringify({header:{resultCode:4001,resultMsg:'월간 API 호출 한도를 초과하였습니다.'}}),{status:401})});
 const r=await request(h,'/api/traffic/events?minX=127&maxX=129&minY=34&maxY=36');assert.equal(r.status,503);assert.equal(r.body.code,'ITS_MONTHLY_QUOTA');assert.equal(r.body.events,undefined);
});
