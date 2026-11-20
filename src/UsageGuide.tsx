import {useLayoutEffect,useId,useRef} from 'react';
import {AnnouncingCloudIcon} from './AnnouncingCloudIcon';
import './usage-guide.css';
let confirmedThisSession=false;
export function needsUsageGuide(){return !confirmedThisSession}
export function confirmUsageGuide(){confirmedThisSession=true}
export function UsageGuide({onClose,shared}:{onClose:()=>void;shared:boolean}){
 const ref=useRef<HTMLDialogElement>(null),title=useId();
 useLayoutEffect(()=>{const dialog=ref.current;if(!dialog)return;dialog.showModal();dialog.querySelector<HTMLElement>('h2')?.focus({preventScroll:true});dialog.scrollTop=0;const frame=requestAnimationFrame(()=>{dialog.scrollTop=0});return()=>{cancelAnimationFrame(frame);dialog.close()}},[]);
 return <dialog ref={ref} className="usage-guide" aria-labelledby={title} onCancel={e=>{e.preventDefault();onClose()}}>
  <h2 id={title} tabIndex={-1}>ON:WAY 사용 안내</h2>
  <div className="usage-guide-cloud"><AnnouncingCloudIcon/><p>국립청소년우주센터에<br/><strong>우리 학교·단체의 이동 상황</strong>을<br/>알립니다.</p></div>
  <ol className="usage-guide-steps" role="list">
   <li><span className="usage-step-number" aria-hidden="true">1</span><div><h3>출발 전, 단체 정보 확인</h3><p>인원·이동 경로를 확인하고<br/>도착 예정 시각을 입력해요.</p></div></li>
   <li className="usage-step-important"><span className="usage-step-number" aria-hidden="true">2</span><div><h3>확인 지점에서 직접 눌러요!</h3><p>출발하거나 지점을 지나면<br/>해당 지점의 확인 버튼을 눌러 주세요.</p><div className="usage-step-note"><span>자동으로 기록되지 않아요.</span><span>깜빡한 통과 기록은 ‘기록 추가’에서 입력할 수 있어요.</span></div></div></li>
   <li><span className="usage-step-number" aria-hidden="true">3</span><div><h3>센터에 전달할 내용 남기기</h3><p>‘센터 톡톡’에 작성하고<br/>센터의 답변을 확인해요.</p></div></li>
  </ol>
  <section className="usage-location-guide" aria-label="위치정보 이용 안내">
   <h3>위치정보 안내</h3>
   <p>실시간으로 위치를 추적하지 않아요.</p>
   <p>‘내 위치 보기’에서 권한을 허용하면 위치를 확인해요.</p>
   <p>‘센터에 위치 전송’을 누르면 센터에 위치를 공유해요.</p>
  </section>
  {!shared&&<p className="usage-guide-demo">시연 모드 · 실제 센터 전송 없음</p>}
  <button type="button" className="primary" onClick={onClose}>확인했어요 · 시작하기</button><p className="usage-guide-again">상단의 ‘사용 안내’에서 다시 볼 수 있어요.</p>
 </dialog>;
}
