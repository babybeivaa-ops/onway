import test from 'node:test';
import assert from 'node:assert/strict';
import {classesForSchedule,sessionClasses,sessionForClass} from '../src/programClasses.ts';
import {validateProgramPlan} from '../public-api/program-plans.mjs';
import {selectedProgramRegistration} from '../src/programSelection.ts';
const base={date:'2026-11-19',time:'15:30~17:40',activity:'우주인훈련장비체험 & S.O.S.',place:'영상관'};
test('class filters include combined and whole-school sessions',()=>{
 const sessions=[{...base,classes:'1·2반'},{...base,classes:'3·4반'},{...base,classes:'1·2반 / 3·4반'},base];
 assert.deepEqual(classesForSchedule(sessions),['1반','2반','3반','4반']);
 assert.equal(sessions.filter(s=>sessionForClass(s,'1반')).length,3);
 assert.equal(sessions.filter(s=>sessionForClass(s,'4반')).length,3);
 assert.deepEqual(sessionClasses('5~7반'),['5반','6반','7반']);
});
test('server save preserves class labels and accepts old sessions without them',()=>{
 const group={name:'광주 화정남초등학교',aliases:'',start:'2026-11-19',end:'2026-11-20',sessions:[{...base,classes:'1·2반'},base]};
 const plan=validateProgramPlan({week:'2026-11-16',source:'test.png',groups:[group]});
 assert.equal(plan.groups[0].sessions[0].classes,'1·2반');
 assert.equal(plan.groups[0].sessions[1].classes,undefined);
 assert.throws(()=>selectedProgramRegistration([group],group.name,'2026-11-18'));
 assert.equal(selectedProgramRegistration([group],group.name,'2026-11-18',[group.name],true),group);
});
