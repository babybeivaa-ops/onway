# SOLAPI 문자 연결

현재 구현은 관리자 인증 후 단체 전용 링크와 QR JPG를 MMS로 접수합니다. API 키는 브라우저에 전달하지 않습니다.

1. SOLAPI 가입 및 계정 인증을 완료합니다.
2. 사용할 개인 휴대폰 번호를 발신번호로 등록하고 인증 완료 상태를 확인합니다. 안내문의 센터 문의번호 061-830-1588은 그대로 유지합니다.
3. API Key와 Secret을 발급합니다. 문자 발송과 파일 업로드 권한이 필요합니다.
4. Render ONWAY 서비스의 서버 환경변수에 다음 값을 설정합니다. 비밀값은 Git이나 채팅에 넣지 않습니다.

- SOLAPI_API_KEY: 발급된 키
- SOLAPI_API_SECRET: 발급된 시크릿
- SOLAPI_SENDER_NUMBER: 인증한 개인 휴대폰 번호 (숫자만)
- ONWAY_PUBLIC_ORIGIN: https://onway-demo.onrender.com

설정 후 서버를 재배포합니다. 요금 잔액과 발송 한도를 확인합니다.

## 확인
관리자 > 인솔교사 QR · 링크 > 인솔교사에게 문자 보내기에서 본인이 수신할 테스트 번호를 입력하고 전송합니다. 전송 직전 수신번호와 MMS 과금 안내를 확인합니다.
접수 성공은 휴대폰 도착 완료가 아닙니다. 최종 결과는 SOLAPI 발송 내역에서 확인합니다.
응답 지연/실패 시 자동 재전송하지 않습니다. 동일 요청 ID는 재발송하지 않으며, 같은 번호·링크는 5분간 추가 요청을 차단합니다. 시간당 요청 한도는 100건입니다. 발송 처리 식별자만 서버에 보관하고 수신번호 원문은 별도 저장하지 않습니다.

문자 테스트는 모의 API로만 수행했습니다. 인증·충전 및 실제 수신 검증은 아직 필요합니다.

공식 안내: https://solapi.com/guides/senderid
API 인증: https://solapi.com/developers/api/authentication-api-key
MMS 접수: https://solapi.com/developers/api/messages
파일 업로드: https://solapi.com/developers/api/postStorage
