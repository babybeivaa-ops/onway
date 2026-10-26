import {participantRows} from './participantRows.ts';
import {participantCountLabel} from './participantCountLabel.ts';
import {useEffect,useRef,useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {CloudMascot} from './CloudMascot';
import type {ParticipantCount,YouthCountRow,YouthLevel,YouthDetails} from './types';
import {youthLevels,levelLabels,gradeOptions,gradeLabel,inferYouthLevel,countYouth,genderTotals,insertYouthRow} from './participantCounts';
function NumberField({label,value,onChange,hideLabel=false}:{label:string;value:number;onChange:(n:number)=>void;hideLabel?:boolean}){return <label><span className={hideLabel?'visually-hidden':undefined}>{label}</span><input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="0" value={value===0?'':value} onChange={e=>{if(/^\d*$/.test(e.target.value))onChange(Number(e.target.value||0))}}/></label>}
export function ParticipantEditor({name,value,onChange}:{name:string;value:ParticipantCount;onChange:(v:ParticipantCount)=>void}){
 const inferred=inferYouthLevel(name);const touched=useRef(participantRows(value).length>0||value.youth>0);const previousInferred=useRef(inferred);
 const [level,setLevel]=useState<YouthLevel>(()=>participantRows(value)[0]?.level??inferred??'elementary');const [notice,setNotice]=useState('');
 const details=value.youthDetails??{rows:[],unclassified:value.youth};
 const leaders=value.leaderDetails??{male:0,female:0,unclassified:value.leaders};
 const update=(next:YouthDetails)=>onChange({...value,youth:countYouth(next),youthDetails:next});
 // A selected school's level may change after typing a partial search term.
 // Keep existing counts; create a draft row for the newly selected level only.
 function selectLevel(next:YouthLevel){setLevel(next);setNotice('');if(!details.rows.some(row=>row.level===next)){const added=insertYouthRow(details,next);if(added)update(added)}}
 useEffect(()=>{const changed=previousInferred.current!==inferred;previousInferred.current=inferred;if(touched.current&&!changed)return;selectLevel(inferred??'elementary')},[inferred]);
 function changeRow(id:string,patch:Partial<YouthCountRow>){touched.current=true;setNotice('');const rows=details.rows.map(r=>r.id===id?{...r,...patch}:r);const oldAssigned=details.rows.reduce((n,r)=>n+r.male+r.female,0),assigned=rows.reduce((n,r)=>n+r.male+r.female,0);update({rows,unclassified:details.unclassified>0?Math.max(0,details.unclassified-(assigned-oldAssigned)):0})}
 function add(afterId?:string){touched.current=true;const next=insertYouthRow(details,level,afterId);if(!next){setNotice('이 구분은 모두 추가되어 있어요. 기존 행의 인원을 수정해주세요.');return}update(next);setNotice('')}
 function changeLeader(key:'male'|'female',n:number){touched.current=true;const next={...leaders,[key]:n,unclassified:0};onChange({...value,leaders:next.male+next.female,leaderDetails:next})}
 const rows=details.rows.filter(r=>r.level===level);
 return <section className="participant-editor participant-editor-stepped" aria-label="참가자와 인솔교사 남녀 인원">
 <div className="participant-editor-title"><CloudMascot size={30}/><h3>참가자 인원</h3></div>
 <div className="participant-step-heading"><b>1</b><h4>참가자 구분 선택</h4></div>
 <div className="participant-level-tabs" role="group" aria-label="참가자 구분">{youthLevels.map(l=>{const sum=details.rows.filter(r=>r.level===l).reduce((n,r)=>n+r.male+r.female,0);return <button type="button" key={l} aria-pressed={level===l} onClick={()=>{touched.current=true;selectLevel(l)}}><strong>{levelLabels[l]}</strong><span>{sum}명</span></button>})}</div>
 <p className="participant-help">구분을 선택한 뒤 아래에서 입력하세요. 다른 구분에 입력한 인원도 함께 저장됩니다.</p>
 <div className="participant-count-columns"><div className="youth-count-editor">
 <p className="count-entry-unit">단위: 명 · 합계 자동 계산</p>
 <div className="count-entry-scroll"><table className="count-entry-table" aria-label={levelLabels[level]+' 학년별 인원 입력'}>
 <colgroup><col className="entry-name-column"/><col/><col/><col/><col className="entry-action-column"/></colgroup>
 <thead><tr><th scope="col">{(level==='adult'||level==='preschool')?'구분':'학년'}</th><th scope="col">남</th><th scope="col">여</th><th scope="col">합계</th><th scope="col"><span className="visually-hidden">행 추가·삭제</span></th></tr></thead>
 <tbody>{rows.map(r=><tr key={r.id}><th scope="row">{(level==='adult'||level==='preschool')?<span>{levelLabels[level]}</span>:<label><span className="visually-hidden">{levelLabels[r.level]} 학년</span><select value={r.grade} onChange={e=>changeRow(r.id,{grade:e.target.value})}>{gradeOptions[r.level].map(g=><option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label>}</th>
 <td><NumberField hideLabel label={levelLabels[r.level]+' '+gradeLabel(r.grade)+' 남 (명)'} value={r.male} onChange={male=>changeRow(r.id,{male})}/></td>
 <td><NumberField hideLabel label={levelLabels[r.level]+' '+gradeLabel(r.grade)+' 여 (명)'} value={r.female} onChange={female=>changeRow(r.id,{female})}/></td>
 <td><output className="count-entry-total" aria-label={levelLabels[r.level]+' '+gradeLabel(r.grade)+' 총인원'}>{r.male+r.female}</output></td>
 <td><div className="count-entry-row-actions"><button type="button" className="count-entry-add" title="아래에 행 추가" aria-label={levelLabels[r.level]+' '+gradeLabel(r.grade)+' 아래에 행 추가'} onClick={()=>add(r.id)}><Plus size={16} aria-hidden="true"/></button><button type="button" className="count-entry-remove" aria-label={levelLabels[r.level]+' '+gradeLabel(r.grade)+' 행 삭제'} onClick={()=>{touched.current=true;update({...details,rows:details.rows.filter(x=>x.id!==r.id)});setNotice('선택한 학년과 인원을 삭제했어요.')}}><Trash2 size={15} aria-hidden="true"/></button></div></td></tr>)}</tbody>
 </table></div>
 {!rows.length&&<button type="button" className="secondary count-entry-first-add" onClick={()=>add()}><Plus size={16} aria-hidden="true"/>{(level==='adult'||level==='preschool')?'인원 입력 추가':'학년 추가'}</button>}
 {notice&&<p role="status" className="participant-help">{notice}</p>}
 {details.unclassified>0&&<div className="unclassified-count"><NumberField label="참가자 미분류 (명)" value={details.unclassified} onChange={unclassified=>{touched.current=true;update({...details,unclassified})}}/><p className="participant-help">기존 총원입니다. 남·여 인원을 입력하면 여기서 먼저 배정됩니다.</p></div>}
 <div className="count-entry-summary"><span>{participantCountLabel(value)} 합계 <strong>{value.youth}명</strong></span><span>남 {genderTotals(value).male}명 · 여 {genderTotals(value).female}명{details.unclassified>0?' · 미분류 '+details.unclassified+'명':''}</span></div>
 </div><section className="leader-count-editor" aria-label="인솔교사 남녀 인원">
 <p className="count-entry-unit">단위: 명 · 합계 자동 계산</p>
 <div className="count-entry-scroll"><table className="count-entry-table" aria-label="인솔교사 인원 입력">
 <colgroup><col className="entry-name-column"/><col/><col/><col/><col className="entry-action-column"/></colgroup>
 <thead><tr><th scope="col">구분</th><th scope="col">남</th><th scope="col">여</th><th scope="col">합계</th><td aria-hidden="true"/></tr></thead>
 <tbody><tr><th scope="row">인솔교사</th><td><NumberField hideLabel label="인솔교사 남 (명)" value={leaders.male} onChange={n=>changeLeader('male',n)}/></td><td><NumberField hideLabel label="인솔교사 여 (명)" value={leaders.female} onChange={n=>changeLeader('female',n)}/></td><td><output className="count-entry-total" aria-label="인솔교사 총인원">{value.leaders}</output></td><td aria-hidden="true"/></tr></tbody></table></div>
 {leaders.unclassified>0&&<p className="participant-help">기존 총인원은 {value.leaders}명입니다. 남·여를 입력하면 입력한 두 값의 합계로 바뀝니다.</p>}</section>
 </div></section>;
}
export function YouthCountSummary({counts,label='참가자',showLeaders=true,editorSummary=false}:{counts:ParticipantCount;label?:string;showLeaders?:boolean;editorSummary?:boolean}){
 const {male,female,unclassified}=genderTotals(counts);
 const displayLabel=label==='청소년'?participantCountLabel(counts):label;
 if(label==='청소년'&&!editorSummary){
  const leaders=counts.leaderDetails??{male:0,female:0,unclassified:counts.leaders};
  return <div className="guide-people-simple" aria-label="방문 인원 상세"><div className="simple-youth-counts"><strong>{displayLabel} {counts.youth}명</strong><span className="gender-male"><span>남</span><span>{male}명</span></span><span className="gender-female"><span>여</span><span>{female}명</span></span></div><div className="simple-leader-counts"><span>인솔교사 {counts.leaders}명</span><span><span>남</span><span>{leaders.male}명</span></span><span><span>여</span><span>{leaders.female}명</span></span></div>{(unclassified>0||leaders.unclassified>0)&&<p className="guide-count-unknown">성별 미입력: {displayLabel} {unclassified}명 · 인솔교사 {leaders.unclassified}명</p>}</div>;
 }
 const row=(title:string,total:number,m:number,f:number,unknown:number)=><div className="aligned-count-row"><strong>{title} {total}명</strong><span className="gender-male">남 {m}명</span><span className="gender-female">여 {f}명</span>{unknown>0&&<span className="count-unclassified">미분류 {unknown}명</span>}</div>;
 return <div className="youth-count-summary aligned-count-summary">{row(displayLabel,counts.youth,male,female,unclassified)}{showLeaders&&counts.leaderDetails&&row('인솔교사',counts.leaders,counts.leaderDetails.male,counts.leaderDetails.female,counts.leaderDetails.unclassified)}</div>;
}
