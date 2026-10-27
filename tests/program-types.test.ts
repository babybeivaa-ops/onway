import {test} from 'node:test';
import assert from 'node:assert/strict';
import {programTypes,normalizeProgramType} from '../src/programTypes.ts';
test('business categories use the requested order and legacy backups retain a display category',()=>{
 assert.deepEqual(programTypes,['취약','시범','특성화','공교육','연수','기타']);
 for(const [old,next] of [['취약계층','취약'],['시범사업','시범'],['교원연수','연수'],['당일체험','기타'],['가족캠프','기타'],['대관','기타'],['기타사업','기타']])assert.equal(normalizeProgramType(old),next);
 for(const value of programTypes)assert.equal(normalizeProgramType(value),value);
 assert.equal(normalizeProgramType(undefined),'');
});
