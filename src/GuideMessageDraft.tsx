import {useState} from 'react';
import './guide-message-draft.css';
export function GuideMessageDraft({url}:{url?:string}){
 const [phone,setPhone]=useState('010-');
 const text="[국립청소년우주센터]\n\n안녕하세요. 안전하고 편리한 단체 이동을 위한 웹앱 ON:WAY(온웨이)를 안내드립니다.\n\n아래 링크 또는 QR코드로 접속해 출발지와 각 경유지에서 확인 버튼을 눌러주세요. 이동 상황이 센터에 전달됩니다.\n\n일정표·식단표는 ‘입소안내’에서 확인하시고, 이동 중 문의사항은 채팅으로 남겨주세요.\n\n안전한 입소를 위해 협조해 주셔서 감사합니다.\n\n"+(url||'[단체 전용 링크 — 링크·QR 생성 후 자동으로 표시됩니다.]')+'\n\n문의: 061-830-1588';
 return <details className="guide-message-draft"><summary>인솔교사에게 문자 보내기</summary><div className="guide-message-fields">{!url&&<p className="fine">아직 전용 링크가 없습니다. 아래는 문자 내용 미리보기입니다.</p>}<p>발신번호 <strong>061-830-1588</strong></p><label><span>받는 분 휴대폰 번호</span><input type="tel" inputMode="tel" autoComplete="off" placeholder="010-0000-0000" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9 -]/g,'').slice(0,15))}/></label><label><span>전송 내용 미리보기</span><textarea readOnly rows={18} value={text}/></label><p className="fine">첨부 예정: 위에 표시된 인솔교사 접속 QR 이미지</p><button type="button" disabled>문자 서비스 연결 필요</button><p className="fine">문자 발송 서비스 가입 및 발신번호 인증 후 사용할 수 있어요. 현재는 문자가 전송되지 않습니다.</p></div></details>;
}
