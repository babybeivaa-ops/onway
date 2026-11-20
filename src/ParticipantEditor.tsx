import {compareParticipantRows,supportsClasses,classSuffix} from './participantRows';
import {participantRows} from './participantRows.ts';
import {participantCountLabel} from './participantCountLabel.ts';
import {useEffect,useRef,useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {CloudMascot} from './CloudMascot';
import type {ParticipantCount,YouthCountRow,YouthLevel,YouthDetails} from './types';
import {youthLevels,levelLabels,gradeOptions,gradeLabel,inferYouthLevel,countYouth,genderTotals,insertYouthRow,insertClassRow} from './participantCounts';
function NumberField({label,value,onChange,hideLabel=false}:{label:string;value:number;onChange:(n:number)=>void;hideLabel?:boolean}){return <label><span className={hideLabel?'visually-hidden':undefined}>{label}</span><input type="text" inputMode="numeric" pattern="[0-9]*" onFocus={e=>e.currentTarget.select()} onClick={e=>e.currentTarget.select()} placeholder="0" value={value===0?'':value} onChange={e=>{if(/^\d*$/.test(e.target.value))onChange(Number(e.target.value||0))}}/></label>}
export function ParticipantEditor({name,value,onChange,compactLevels=true}:{name:string;value:ParticipantCount;onChange:(v:ParticipantCount)=>void;compactLevels?:boolean}){
 const inferred=inferYouthLevel(name);const touched=useRef(participantRows(value).length>0||value.youth>0);const previousInferred=useRef(inferred);
 const [level,setLevel]=useState<YouthLevel>(()=>(compactLevels?inferred:undefined)??participantRows(value)[0]?.level??inferred??'elementary');const [notice,setNotice]=useState('');
 const [addingLevel,setAddingLevel]=useState(false);
 const [addedLevels,setAddedLevels]=useState<YouthLevel[]>([]);
 const details=value.youthDetails??{rows:[],unclassified:value.youth};
 const leaders=value.leaderDetails??{male:0,female:0,unclassified:value.leaders};
 const update=(next:YouthDetails)=>onChange({...value,youth:countYouth(next),youthDetails:next});
 // A selected school's level may change after typing a partial search term.
 // Keep existing counts; create a draft row for the newly selected level only.
 function selectLevel(next:YouthLevel){if(compactLevels)setAddedLevels(previous=>previous.includes(next)?previous:[...previous,next]);setLevel(next);setNotice('');if(!details.rows.some(row=>row.level===next)){const added=insertYouthRow(details,next);if(added)update(added)}}
 useEffect(()=>{const changed=previousInferred.current!==inferred;previousInferred.current=inferred;if(changed){setAddedLevels([]);setAddingLevel(false)}if(touched.current&&!changed&&!(compactLevels&&inferred))return;const next=inferred??'elementary';setLevel(next);setNotice('');const draft=changed&&!touched.current?{...details,rows:details.rows.filter(row=>row.level===next||row.male>0||row.female>0)}:details;if(!draft.rows.some(row=>row.level===next)){const added=insertYouthRow(draft,next);if(added)update(added)}else if(draft.rows.length!==details.rows.length)update(draft)},[inferred]);
 function changeRow(id:string,patch:Partial<YouthCountRow>){touched.current=true;setNotice('');const rows=details.rows.map(r=>r.id===id?{...r,...patch}:r);const oldAssigned=details.rows.reduce((n,r)=>n+r.male+r.female,0),assigned=rows.reduce((n,r)=>n+r.male+r.female,0);update({rows,unclassified:details.unclassified>0?Math.max(0,details.unclassified-(assigned-oldAssigned)):0})}
 function addClass(id:string){touched.current=true;const next=insertClassRow(details,id);if(next){update(next);setNotice('반을 추가했어요. 학년·반과 남녀 인원을 입력해주세요.')}else setNotice('인원 입력은 최대 200행까지 가능해요.')}
 function add(afterId?:string){touched.current=true;const next=insertYouthRow(details,details.rows.find(row=>row.id===afterId)?.level??level,afterId);if(!next){setNotice('이 구분은 모두 추가되어 있어요. 기존 행의 인원을 수정해주세요.');return}update(next);setNotice('')}
 function changeLeader(key:'male'|'female',n:number){touched.current=true;const next={...leaders,[key]:n,unclassified:0};onChange({...value,leaders:next.male+next.female,leaderDetails:next})}
 const compact=compactLevels&&!!inferred;
 const visibleLevels=youthLevels.filter(l=>!compact||l===inferred||addedLevels.includes(l)||details.rows.some(r=>r.level===l));
 const rows=details.rows.filter(r=>visibleLevels.includes(r.level)).sort(compareParticipantRows);
 const availableLevels=youthLevels.filter(l=>!visibleLevels.includes(l));
 const hasAgeRows=rows.some(r=>r.level==='adult'||r.level==='preschool');
 const hasGradeRows=rows.some(r=>r.level!=='adult'&&r.level!=='preschool'&&r.level!=='lateYouth');
 const gradeAgeHeading=hasAgeRows?(hasGradeRows?'학년 / 연령':'연령'):'학년';
 return <section className="participant-editor participant-editor-stepped" aria-label="참가자와 인솔교사 남녀 인원">
 <div className="participant-editor-title"><CloudMascot size={30}/><h3>참가자 인원</h3></div>
 <div className="participant-step-heading"><h4>참가자 교급 선택</h4>{compact&&availableLevels.length>0&&<div className="participant-add-level-heading"><p className="participant-help participant-help-compact">다른 교급은 + 을 눌러서 추가해주세요.</p><button type="button" className="participant-add-level-toggle" aria-expanded={addingLevel} onClick={()=>setAddingLevel(!addingLevel)}><Plus size={15} aria-hidden="true"/>교급 추가</button></div>}</div>
 <div className={compact?"participant-level-tabs compact-level-tabs":"participant-level-tabs"} role="group" aria-label="참가자 구분">{visibleLevels.map(l=>{const sum=details.rows.filter(r=>r.level===l).reduce((n,r)=>n+r.male+r.female,0);return <button type="button" key={l} data-level={l} aria-pressed={level===l} onClick={()=>{touched.current=true;selectLevel(l)}}><strong>{levelLabels[l]}</strong><span>{sum}명</span></button>})}</div>
 {compact&&addingLevel&&availableLevels.length>0&&<div className="participant-add-level">{addingLevel&&<div className="participant-level-tabs compact-level-tabs" role="group" aria-label="추가할 참가자 구분">{availableLevels.map(l=><button type="button" key={l} data-level={l} onClick={()=>{touched.current=true;selectLevel(l);setAddingLevel(false)}}>{levelLabels[l]}</button>)}</div>}</div>}
 {!compact&&<p className="participant-help">구분을 선택하면 입력 행이 추가됩니다.</p>}
 <div className="participant-count-columns"><div className="youth-count-editor">
 <p className="count-entry-unit">단위: 명 · 합계 자동 계산</p><p className="participant-help participant-help-compact">학년·반별로 남녀 인원을 입력해주세요.<br/>+ 버튼으로 같은 학년의 반을 추가할 수 있어요.</p>
 <div className="count-entry-scroll"><table className="count-entry-table mixed-count-table" aria-label="전체 구분·학년·반별 인원 입력">
 <colgroup><col className="mixed-level-column"/><col className="mixed-grade-column"/><col className="mixed-class-column"/><col className="mixed-number-column"/><col className="mixed-number-column"/><col className="mixed-total-column"/><col className="mixed-actions-column"/></colgroup>
 <thead><tr><th scope="col">구분</th><th scope="col">{gradeAgeHeading}</th><th scope="col">반</th><th scope="col">남</th><th scope="col">여</th><th scope="col">합계</th><th scope="col">편집</th></tr></thead>
 <tbody>{rows.map(r=><tr key={r.id} data-level={r.level}><th scope="row" className="mixed-level-cell">{levelLabels[r.level]}</th><td>{r.level==='lateYouth'?null:(r.level==='adult'||r.level==='preschool')?<label className="age-entry"><span className="visually-hidden">{levelLabels[r.level]} 연령 (선택)</span><input type="text" inputMode="numeric" pattern="[0-9]*" onFocus={e=>e.currentTarget.select()} onClick={e=>e.currentTarget.select()} maxLength={3} placeholder="연령" value={r.age??''} onChange={e=>{const v=e.target.value;if(/^\d*$/.test(v)&&Number(v)<=120)changeRow(r.id,{age:v===''?undefined:Number(v)})}}/><span aria-hidden="true">세</span></label>:<label><span className="visually-hidden">{levelLabels[r.level]}{classSuffix(r)} 학년</span><select value={r.grade} onChange={e=>changeRow(r.id,{grade:e.target.value})}>{gradeOptions[r.level].map(g=><option key={g} value={g}>{gradeLabel(g)}</option>)}</select></label>}</td><td>{supportsClasses(r.level)&&<label className="class-number-field"><span className="visually-hidden">{levelLabels[r.level]} {gradeLabel(r.grade)}{classSuffix(r)} 반 번호</span><input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} placeholder="번호" value={r.classNumber??''} onFocus={e=>e.currentTarget.select()} onChange={e=>{const n=e.target.value;if(/^\d*$/.test(n))changeRow(r.id,{classNumber:n===''?undefined:Number(n)})}}/></label>}</td>
 <td><NumberField hideLabel label={levelLabels[r.level]+' '+gradeLabel(r.grade)+classSuffix(r)+' 남 (명)'} value={r.male} onChange={male=>changeRow(r.id,{male})}/></td>
 <td><NumberField hideLabel label={levelLabels[r.level]+' '+gradeLabel(r.grade)+classSuffix(r)+' 여 (명)'} value={r.female} onChange={female=>changeRow(r.id,{female})}/></td>
 <td><output className="count-entry-total" aria-label={levelLabels[r.level]+' '+gradeLabel(r.grade)+classSuffix(r)+' 총인원'}>{r.male+r.female}</output></td>
 <td><div className="count-entry-row-actions"><button type="button" className="count-entry-add" title={supportsClasses(r.level)?'같은 학년의 반 추가':'아래에 행 추가'} aria-label={levelLabels[r.level]+' '+gradeLabel(r.grade)+classSuffix(r)+(supportsClasses(r.level)?' 반 추가':' 아래에 행 추가')} onClick={()=>supportsClasses(r.level)?addClass(r.id):add(r.id)}><Plus size={16} aria-hidden="true"/></button><button type="button" className="count-entry-remove" aria-label={levelLabels[r.level]+' '+gradeLabel(r.grade)+classSuffix(r)+' 행 삭제'} onClick={()=>{touched.current=true;update({...details,rows:details.rows.filter(x=>x.id!==r.id)});setNotice('선택한 행과 인원을 삭제했어요.')}}><Trash2 size={15} aria-hidden="true"/></button></div></td></tr>)}</tbody>
 </table></div>
 {<button type="button" className="secondary count-entry-first-add" onClick={()=>add()}><Plus size={16} aria-hidden="true"/>{(level==='adult'||level==='preschool'||level==='lateYouth')?'인원 입력 추가':'다른 학년 추가'}</button>}
 {notice&&<p role="status" className="participant-help">{notice}</p>}
 {details.unclassified>0&&<div className="unclassified-count"><NumberField label="참가자 미분류 (명)" value={details.unclassified} onChange={unclassified=>{touched.current=true;update({...details,unclassified})}}/><p className="participant-help">기존 총원입니다. 남·여 인원을 입력하면 여기서 먼저 배정됩니다.</p></div>}
 <div className="count-entry-summary"><span>{participantCountLabel(value)} 합계 <strong>{value.youth}명</strong></span><span>남 {genderTotals(value).male}명 · 여 {genderTotals(value).female}명{details.unclassified>0?' · 미분류 '+details.unclassified+'명':''}</span></div>
 </div><section className="leader-count-editor" aria-label="인솔교사 남녀 인원">
 <div className="count-entry-scroll"><table className="count-entry-table leader-aligned-table" aria-label="인솔교사 인원 입력">
 <colgroup><col className="mixed-level-column"/><col className="mixed-grade-column"/><col className="mixed-class-column"/><col className="mixed-number-column"/><col className="mixed-number-column"/><col className="mixed-total-column"/><col className="mixed-actions-column"/></colgroup>
 <thead><tr><th scope="col">구분</th><td aria-hidden="true"/><td aria-hidden="true"/><th scope="col">남</th><th scope="col">여</th><th scope="col">합계</th><td aria-hidden="true"/></tr></thead>
 <tbody><tr><th scope="row">인솔교사</th><td aria-hidden="true"/><td aria-hidden="true"/><td><NumberField hideLabel label="인솔교사 남 (명)" value={leaders.male} onChange={n=>changeLeader('male',n)}/></td><td><NumberField hideLabel label="인솔교사 여 (명)" value={leaders.female} onChange={n=>changeLeader('female',n)}/></td><td><output className="count-entry-total" aria-label="인솔교사 총인원">{value.leaders}</output></td><td aria-hidden="true"/></tr></tbody></table></div>
 {leaders.unclassified>0&&<p className="participant-help">기존 총인원은 {value.leaders}명입니다. 남·여를 입력하면 입력한 두 값의 합계로 바뀝니다.</p>}</section>
 </div></section>;
}
export function YouthCountSummary({counts,label='참가자',showLeaders=true,editorSummary=false}:{counts:ParticipantCount;label?:string;showLeaders?:boolean;editorSummary?:boolean}){
 const {male,female,unclassified}=genderTotals(counts);
 const displayLabel=label==='청소년'?participantCountLabel(counts):label;
 if(label==='청소년'&&!editorSummary){
  const leaders=counts.leaderDetails??{male:0,female:0,unclassified:counts.leaders};
  return <div className="guide-people-table-wrap"><table className="guide-people-table" aria-label="입소 인원 상세"><caption>단위: 명</caption><colgroup><col style={{width:'34%'}}/><col style={{width:'22%'}}/><col style={{width:'22%'}}/><col style={{width:'22%'}}/></colgroup><thead><tr><th scope="col">구분</th><th scope="col">남</th><th scope="col">여</th><th scope="col">합계</th></tr></thead><tbody>{participantRows(counts).map(r=><tr key={r.id}><th scope="row">{supportsClasses(r.level)?'':levelLabels[r.level]+' '}{r.level==='adult'||r.level==='preschool'?(r.age===undefined?'':r.age+'세'):r.level==='lateYouth'?'':gradeLabel(r.grade)}{classSuffix(r)}{supportsClasses(r.level)&&r.classNumber===undefined&&<small className="class-unknown-label">반 미입력</small>}</th><td>{r.male}</td><td>{r.female}</td><td>{r.male+r.female}</td></tr>)}{unclassified>0&&<tr><th scope="row">미분류</th><td>—</td><td>—</td><td>{unclassified}</td></tr>}<tr><th scope="row">인솔교사</th><td>{leaders.unclassified===counts.leaders&&leaders.unclassified>0?'—':leaders.male}</td><td>{leaders.unclassified===counts.leaders&&leaders.unclassified>0?'—':leaders.female}</td><td>{counts.leaders}</td></tr></tbody></table>{(unclassified>0||leaders.unclassified>0)&&<p className="guide-count-unknown">성별 미입력: 청소년 {unclassified}명 · 인솔교사 {leaders.unclassified}명</p>}</div>;
 }
 const row=(title:string,total:number,m:number,f:number,unknown:number)=><div className="aligned-count-row"><strong>{title} {total}명</strong><span className="gender-male">남 {m}명</span><span className="gender-female">여 {f}명</span>{unknown>0&&<span className="count-unclassified">미분류 {unknown}명</span>}</div>;
 return <div className="youth-count-summary aligned-count-summary">{row(displayLabel,counts.youth,male,female,unclassified)}{showLeaders&&counts.leaderDetails&&row('인솔교사',counts.leaders,counts.leaderDetails.male,counts.leaderDetails.female,counts.leaderDetails.unclassified)}</div>;
}
