import test from 'node:test';import assert from 'node:assert/strict';import {registeredProgramName,preferRegisteredProgramNames} from '../public-api/program-names.mjs';
import {selectedProgramRegistration} from '../src/programSelection.ts';

test('short school names match regional titles after school suffix normalization',()=>{
 for(const name of ['제산초','제산초등학교']){
  assert.equal(registeredProgramName('거제 제산초등학교',[name]),name);
  const group={name:'거제 제산초등학교',aliases:'',start:'2026-11-25',end:'2026-11-27',sessions:[]};
  assert.equal(selectedProgramRegistration([group],name,'2026-11-25',['제산초','제산초등학교','거제 제산초등학교']),group);
 }
 assert.equal(registeredProgramName('거제 제산초등학교',['제산초','제산초등학교']),'제산초');
 assert.equal(registeredProgramName('제산초',['거제 제산초','다른지역 제산초']),'제산초');
 const groups=['거제 제산초','다른지역 제산초'].map(name=>({name,aliases:'',start:'2026-11-25',end:'2026-11-27',sessions:[]}));
 assert.throws(()=>selectedProgramRegistration(groups,'제산초','2026-11-25'),/여러 개/);
 assert.equal(registeredProgramName('거제 제산초',['산초']),'거제 제산초');
});
test('registered names override OCR typos and spacing',()=>{assert.equal(registeredProgramName('참원 사화초등학교',['창원사화초']),'창원사화초');assert.equal(registeredProgramName('외산 이리고등학교',['익산 이리고등학교']),'익산 이리고등학교')});
test('ambiguous or unrelated school names are not relinked',()=>{assert.equal(registeredProgramName('가나다라초',['가나마라초','가나바라초']),'가나다라초');assert.equal(registeredProgramName('다른학교',['창원사화초']),'다른학교');assert.equal(registeredProgramName('참원사화초',['참원사화초','창원사화초']),'참원사화초')});
test('correction preserves dates and unrelated groups',()=>{const p={groups:[{name:'참원 사화초등학교',start:'2026-11-16'},{name:'후기청소년',start:'2026-11-16'}]};const next=preferRegisteredProgramNames(p,['창원사화초']);assert.equal(next.groups[0].name,'창원사화초');assert.equal(next.groups[0].start,'2026-11-16');assert.equal(next.groups[1].name,'후기청소년');assert.equal(p.groups[0].name,'참원 사화초등학교')});
