import {participantCountLabel} from './participantCountLabel.ts';
import {CloudPersonIcon} from './CloudMascot';
import type {ParticipantChange} from './types';
import {countChangeDetails,guideCountChanges} from './countChangeDetails';
import {journeyTimeLabel} from './journeyTime';

export function GuideCountChanges({changes}:{changes:ParticipantChange[]}){
 const records=guideCountChanges(changes);
 return <section className="admin-count-changes" aria-label="인솔자 인원 변경 내역">
  <h3><CloudPersonIcon/>인솔자 인원 변경 내역 <span>{records.length}건</span></h3>
  {!records.length?<p className="count-changes-empty">인솔자가 변경한 인원 내역이 아직 없어요.</p>:
   records.map((change,index)=>{
    const differences=countChangeDetails(change.before,change.after);
    const details=differences.filter(d=>!d.label.endsWith('합계'));
    const summaryItems=details.length?details:differences;
    const youthChanged=differences.some(d=>!d.label.startsWith('인솔교사'));
    const leadersChanged=differences.some(d=>d.label.startsWith('인솔교사'));
    const date=new Date(change.at);
    const stamp=Number.isNaN(date.getTime())?'시각 정보 없음':date.toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'})+' '+journeyTimeLabel(change.at);
    return <article className="admin-count-change" key={change.id}>
     <div className="admin-count-change-header">
      <span className="admin-count-change-meta"><time dateTime={change.at}>{stamp}</time>{index===0&&<span>최근 변경</span>}</span>
      <p className="count-change-sentence">{summaryItems.length?summaryItems.map((d,i)=><span key={d.label}>{i>0?', ':''}{d.label} {d.before} → <strong>{d.after}명</strong></span>):'인원 구분 변경'}{youthChanged&&<span>, {participantCountLabel(change.before,change.after)} 합계 <strong>{change.after.youth}명</strong></span>}{leadersChanged&&<span>, 인솔교사 합계 <strong>{change.after.leaders}명</strong></span>}</p>
     </div>
     {change.reason&&<div className="admin-count-change-body"><p className="admin-count-change-reason"><span>변경 사유</span> {change.reason}</p></div>}
    </article>;
   })}
 </section>;
}
