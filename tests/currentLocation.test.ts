import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestCurrentLocation} from '../src/currentLocation.ts';

test('silent browser times out, retries and settles; ignores late results',t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const calls:any[]=[];const results:any[]=[];
 requestCurrentLocation({getCurrentPosition:(...args:any[])=>calls.push(args)},p=>results.push(p),code=>results.push(code),()=>results.push('retry'));
 t.mock.timers.tick(10000);assert.equal(calls.length,2);assert.equal(calls[1][2].enableHighAccuracy,true);
 calls[0][0]({});assert.deepEqual(results,['retry']);
 t.mock.timers.tick(15000);assert.deepEqual(results,['retry',3]);
 calls[1][0]({});assert.deepEqual(results,['retry',3]);
});
test('permission denial ends without retry',t=>{
 t.mock.timers.enable({apis:['setTimeout']});let code=0;
 requestCurrentLocation({getCurrentPosition:(_s,e)=>e!({code:1} as GeolocationPositionError)},()=>assert.fail(),c=>code=c,()=>assert.fail());
 assert.equal(code,1);t.mock.timers.tick(30000);assert.equal(code,1);
});
test('cancel ignores subsequent callback and timeout',t=>{
 t.mock.timers.enable({apis:['setTimeout']});let success:any;
 const cancel=requestCurrentLocation({getCurrentPosition:s=>success=s},()=>assert.fail(),()=>assert.fail(),()=>assert.fail());
 cancel();success({});t.mock.timers.tick(30000);
});
test('low accuracy failure can recover with the second attempt',()=>{
 let calls=0,success=false;
 requestCurrentLocation({getCurrentPosition:(s,e)=>{calls++;if(calls===1)e!({code:2} as GeolocationPositionError);else s({} as GeolocationPosition)}},()=>success=true,()=>assert.fail(),()=>{});
 assert.equal(calls,2);assert.equal(success,true);
});
