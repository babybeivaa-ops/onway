import test from 'node:test';
import assert from 'node:assert/strict';
import {completeSelectedGroupName} from '../src/groupName.ts';
test('selected schools and culture houses complete the typed name and keep its region',()=>{
 for(const [typed,place,expected] of [
  ['울산 동평초','동평초등학교','울산 동평초등학교'],
  ['울산 동평초','울산동평초등학교','울산 동평초등학교'],
  ['포항중','포항중학교','포항중학교'],
  ['효천고','효천고등학교','효천고등학교'],
  ['서울대','서울대학교','서울대학교'],
  ['순천 청소년','청소년문화의집','순천 청소년문화의집'],
  ['궁동 청소년 문화','청소년문화의집','궁동 청소년 문화의집'],
  ['궁동 청소년 문화의 집','청소년문화의집','궁동 청소년 문화의 집'],
  ['','순천 청소년문화의집','순천 청소년문화의집'],
 ])assert.equal(completeSelectedGroupName(typed,place),expected);
});
test('custom groups and unrelated search results never replace the typed name',()=>{
 for(const [typed,place] of [['진도군청 드림스타트','진도군청'],['진도군 드림스타트','진도초등학교'],['궁동 청소년 문화의 집','순천청소년문화의집'],['서울대 방문단','서울대학교'],['햇살지역','햇살지역아동센터']])assert.equal(completeSelectedGroupName(typed,place),typed);
});
