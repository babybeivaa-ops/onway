import test from 'node:test';
import assert from 'node:assert/strict';
import {trafficIcon} from '../src/trafficIcon.ts';
test('road icons use specific details even when the provider kind is generic',()=>{
 assert.equal(trafficIcon('기타돌발','승용차 고장으로 갓길 정차'),'breakdown');
 assert.equal(trafficIcon('기상','빗길 감속 운행'),'rain');
 assert.equal(trafficIcon('기상','안개로 시정 저하'),'fog');
 assert.equal(trafficIcon('기상','결빙 주의'),'snow');
 assert.equal(trafficIcon('기상','강풍 주의'),'wind');
 assert.equal(trafficIcon('공사','차로 작업 중'),'construction');
 assert.equal(trafficIcon('사고','빗길 추돌 사고'),'accident');
});
test('generic notices and unrelated syllables do not imply rain',()=>{
 assert.equal(trafficIcon('기상','안전 운행'),'warning');
 assert.equal(trafficIcon('기타','비상차로 확보 및 대비 필요'),'warning');
 assert.equal(trafficIcon('',''),'warning');
});

import {trafficLabel} from '../src/trafficIcon.ts';
test('road summaries show specific conditions without inventing unspecified weather',()=>{
 assert.equal(trafficLabel('기상','빗길 감속'),'빗길');
 assert.equal(trafficLabel('기상','안개 발생'),'안개');
 assert.equal(trafficLabel('기상','눈길 주의'),'눈길');
 assert.equal(trafficLabel('기상','노면 결빙'),'결빙');
 assert.equal(trafficLabel('기상','강풍 주의'),'강풍');
 assert.equal(trafficLabel('기타돌발','차량 고장'),'차량 고장');
 assert.equal(trafficLabel('기상','안전 운행'),'기상 주의');
});
