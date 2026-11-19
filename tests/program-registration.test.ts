import test from 'node:test';
import assert from 'node:assert/strict';
import {programRegistrationIdentity} from '../src/programRegistration.ts';
import {selectedProgramRegistration} from '../src/programSelection.ts';
test('school in classification row identifies a project without special-casing its name',()=>{
 for(const school of ['함안 칠원중학교','다른 초등학교']){
  const identity=programRegistrationIdentity(['작은학교 지원사업','23+5명','(팀) 지현 / 지선',school]);
  assert.equal(identity.name,school);assert(identity.aliases.includes('작은학교 지원사업'));
 }
});
test('all identifying rows support school titles and university department rows',()=>{
 assert.equal(programRegistrationIdentity(['사업/단체 창원 사화초등학교','6학년 / 108+10명']).name,'창원 사화초등학교');
 assert.equal(programRegistrationIdentity(['후기청소년 관측실습','대학생 / 20+2명','(덕) 담당자','충남대학교 천문우주과학과']).name,'충남대학교 천문우주과학과');
 assert.equal(programRegistrationIdentity(['ㅣ > 광주화정남초틈학교 . ^.']).name,'광주화정남초등학교');
});
test('same project title never joins separate schools or dates',()=>{
 const groups=['함안 칠원중학교','다른 중학교'].map(name=>({...programRegistrationIdentity(['작은학교 지원사업',name]),start:'2026-11-18',end:'2026-11-19',sessions:[]}));
 assert.equal(selectedProgramRegistration(groups,'함안 칠원중학교','2026-11-18'),groups[0]);
 assert.throws(()=>selectedProgramRegistration(groups,'함안 칠원중학교','2026-11-16'),/입소일/);
});

 test('browser OCR elementary school suffix is normalized before selection',()=>{ const identity=programRegistrationIdentity(['광주화정남초틀학교','6학년 / 156+10명']); assert.equal(identity.name,'광주화정남초등학교'); const group={...identity,start:'2026-11-19',end:'2026-11-19',sessions:[]}; assert.equal(selectedProgramRegistration([group],'광주 화정남초등학교','2026-11-19'),group); });
