import test from 'node:test';
import assert from 'node:assert/strict';
import {programRowAnchor,programTime} from '../src/programRows.ts';
const left={x:18,y:270,right:308,bottom:279},right={x:434,y:274,right:545,bottom:279},next={x:18,y:322,right:308,bottom:329};
test('right hand group shares the left printed row despite color detection offset',()=>{assert.equal(programRowAnchor(right,[right,next,left],13),left);assert.equal(programRowAnchor(next,[left,right,next],13),next)});
test('printed time is validated once per row',()=>{assert.equal(programTime('09:30 ~ 11:40'),'09:30~11:40');assert.equal(programTime('99:30~11:40'),'');assert.equal(programTime('담당'),'')});
test('OCR digit spacing and a missing end colon preserve the shared printed time',()=>{assert.equal(programTime('1 5:30~1 740'),'15:30~17:40');assert.equal(programTime('109:20~1130'),'09:20~11:30');assert.equal(programTime('20002230'),'')});
