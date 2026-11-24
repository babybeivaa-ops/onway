import {useState} from 'react';
import './guide-message-draft.css';
export function GuideMessageDraft({url}:{url:string}){
 const [phone,setPhone]=useState('');
 const text='[국립청소년우주센터]\n안녕하세요. 단체 이동 안내 ON:WAY입니다.\n아래 링크 또는 QR로 접속해 이동 상황을 알려주세요. 일정표·식단표 등 안내자료는 입소안내에서 확인하실 수 있습니다.\n\n'+url+'\n\n문의: 061-830-1588';
 return <details className="guide-message-draft"><summary>인솔교사에게 문자 보내기</summary><div className="guide-message-fields"><p>발신번호 <strong>061-830-1588</strong></p><label>받는 분 휴대폰 번호<input type="tel" inputMode="tel" autoComplete="off" placeholder="010-0000-0000" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9 -]/g,'').slice(0,15))}/></label><label>전송 내용 미리보기<textarea readOnly rows={7} value={text}/></label><p className="fine">첨부 예정: 위에 표시된 인솔교사 접속 QR 이미지</p><button type="button" disabled>문자 서비스 연결 필요</button><p className="fine">문자 발송 서비스 가입 및 발신번호 인증 후 사용할 수 있어요. 현재는 문자가 전송되지 않습니다.</p></div></details>;
}
