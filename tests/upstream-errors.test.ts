import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapHandler} from '../public-api/gateway.mjs';
import {createTrafficHandler} from '../public-api/traffic.mjs';
async function request(handler,path){let status,body;await handler({method:'GET'},{writeHead(s){status=s},end(b){body=JSON.parse(b)}},new URL(path,'https://onway.test'));return {status,body};}
test('ITS monthly quota response does not look like zero traffic events',async()=>{
 const h=createTrafficHandler({key:'private-key',fetchImpl:async()=>new Response(JSON.stringify({header:{resultCode:4001,resultMsg:'월간 API 호출 한도를 초과하였습니다.'}}),{status:401})});
 const r=await request(h,'/api/traffic/events?minX=127&maxX=129&minY=34&maxY=36');assert.equal(r.status,503);assert.equal(r.body.code,'ITS_MONTHLY_QUOTA');assert.equal(r.body.events,undefined);
});
