import test from 'node:test';
import assert from 'node:assert/strict';
import {formatGroupName,formatSchoolGroupName} from '../src/groupName.ts';
import type {ParticipantCount,YouthLevel} from '../src/types.ts';
const countsFor=(...levels:YouthLevel[]):ParticipantCount=>({youth:levels.length,leaders:0,youthDetails:{unclassified:0,rows:levels.map((level,i)=>({id:String(i),level,grade:'1',male:1,female:0}))}});
test('adds a school suffix only for an unambiguous school level',()=>{
 assert.equal(formatSchoolGroupName('밀양 미리벌',countsFor('elementary')),'밀양 미리벌초');
 assert.equal(formatSchoolGroupName('미리벌초',countsFor('elementary')),'미리벌초');
 assert.equal(formatSchoolGroupName('미리벌초등학교',countsFor('elementary')),'미리벌초');
 assert.equal(formatSchoolGroupName('미리벌',countsFor('elementary','middle')),'미리벌');
 assert.equal(formatSchoolGroupName('청소년센터',countsFor('elementary')),'청소년센터');
 assert.equal(formatSchoolGroupName('한빛중',countsFor('elementary')),'한빛중');
 assert.equal(formatSchoolGroupName('미리벌',{youth:5,leaders:0}),'미리벌');
});
test('separates known region prefixes on school names', () => {
 assert.equal(formatGroupName('창원현동초'), '창원 현동초');
 assert.equal(formatGroupName('창원현동초등학교'), '창원 현동초등학교');
 assert.equal(formatGroupName('영암삼호고'), '영암 삼호고');
});
test('preserves already spaced names and unrelated names', () => {
 for (const name of ['창원 현동초','현동초등학교','창원초등학교','창원청소년센터','서울대학교']) assert.equal(formatGroupName(name),name);
});

test('selected school name supplies the suffix, including university, before participant inference',()=>{
 assert.equal(formatSchoolGroupName('밀양 미리벌',{youth:0,leaders:0},'미리벌초등학교'),'밀양 미리벌초');
 assert.equal(formatSchoolGroupName('한빛',countsFor('elementary'),'한빛중학교'),'한빛중');
 assert.equal(formatSchoolGroupName('한빛',{youth:0,leaders:0},'한빛고등학교'),'한빛고');
 assert.equal(formatSchoolGroupName('서울',{youth:0,leaders:0},'서울대학교'),'서울대');
 assert.equal(formatSchoolGroupName('서울대학교',countsFor('university')),'서울대');
 assert.equal(formatSchoolGroupName('한빛',countsFor('university')),'한빛대');
 assert.equal(formatSchoolGroupName('가족캠프',countsFor('elementary'),'한빛초등학교'),'가족캠프');
});
