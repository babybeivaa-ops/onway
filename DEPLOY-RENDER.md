# ON:WAY 무료 시연 배포

구성: GitHub → Render Free Web Service → Supabase Free 프로젝트.
실제 계정 연결과 배포는 별도 단계입니다. 유료 디스크는 사용하지 않습니다.

## 1. Supabase 준비
1. Supabase에서 Free 프로젝트를 만듭니다.
2. SQL Editor에서 deploy/supabase.sql 전체를 실행합니다. 다시 실행해도 기존 데이터는 덮어쓰지 않습니다.
3. 프로젝트 URL과 서버용 Secret API key를 Render 환경변수에 넣습니다. Publishable/anon 키는 사용할 수 없습니다. 기존 service_role 키도 SUPABASE_SERVICE_ROLE_KEY로 지원합니다.
4. 키를 GitHub, 브라우저 코드, 채팅에 붙여넣지 않습니다.

## 2. Render 연결
기존 서비스가 있으면 아래 설정을 적용합니다. 새 서비스는 GitHub 저장소에서 Blueprint(render.yaml)를 생성합니다.
- 종류: Web Service / Node / Free
- Build Command: corepack enable && pnpm install --frozen-lockfile && pnpm run build
- Start Command: node public-api/index.mjs
- Health Check Path: /healthz
- HOST: 0.0.0.0
- Node: 24.14.0
- 영구 디스크: 없음
- 자동 배포: 꺼짐. 변경 확인 후 Manual Deploy를 실행합니다.

## 3. Render 환경변수
| 이름 | 값 |
|---|---|
| SUPABASE_URL | Supabase 프로젝트의 HTTPS URL |
| SUPABASE_SECRET_KEY | Supabase 서버용 secret 키 |
| ONWAY_ADMIN_TOKEN | 32자 이상의 임의 관리자 접속 코드. Blueprint는 자동 생성 |
| VWORLD_API_KEY | 기존 브이월드 키 |
| VWORLD_DOMAIN | 실제 배포 주소. 브이월드에 등록한 도메인과 일치해야 함 |
| KAKAO_REST_API_KEY | 카카오 길찾기용 REST 키 |
| KMA_SERVICE_KEY | 기상청 서비스 키 |
| ITS_API_KEY | 도로 안내 키 |

환경변수는 Render 대시보드에 직접 입력합니다. .env.example은 이름 안내용이며 실제 키를 넣어 Git에 올리지 않습니다. 지도/날씨/도로 키가 없으면 해당 조회 기능이 동작하지 않습니다.

## 4. 관리자와 인솔자 공유 시연
1. 기존 로컬 관리자 화면에서 JSON 백업을 내려받습니다.
2. 배포 주소에서 관리자 화면의 백업 복원 기능으로 필요한 단체를 가져옵니다. 실제 개인정보 대신 시연용 자료를 권장합니다.
3. ‘백업·내보내기 / 단체 공유’에 ONWAY_ADMIN_TOKEN을 입력합니다.
4. ‘선택 단체 서버에 등록’을 누르고 ‘공유 관리 열기’로 들어갑니다.
5. 공유 관리 화면에서 ‘선택 단체 링크 발급·재발급’을 눌러 인솔자용 링크를 만듭니다.
6. 다른 휴대폰에서 그 링크를 열어 인원/식사 장소/이동 기록을 변경합니다. 관리자 화면은 5초마다 새 기록을 확인합니다.

일반 첫 화면의 로컬 시연 기록과 공유 기록은 별개입니다. 서로 같은 기록을 보려면 공유 관리 화면과 인솔자 전용 링크를 사용해야 합니다. 링크는 30일 유효하며 재발급하면 이전 링크는 무효화됩니다.

## 5. 배포 후 확인
- /healthz 응답: ok=true, storage=supabase (프로세스 상태이며 DB 연결 보장은 아님)
- 관리자 접속 코드로 공유 관리 열기 성공
- 단체 등록 → 인솔자 링크에서 변경 → 관리자 반영
- Render Restart 후 같은 단체/링크 유지
- 다른 단체 링크의 데이터가 노출되지 않는지 확인
- 지도, 검색, 경로, 날씨, 도로 조회 확인
- 시연 전 JSON 백업을 다운로드해 보관

## 무료 서비스의 범위
Render Free는 15분 동안 요청이 없으면 쉬었다가 다음 접속 때 다시 시작하여 첫 화면이 늦을 수 있습니다. 시연 전에 미리 접속하세요. Supabase Free도 사용량 제한과 비활성 프로젝트 일시 중지가 있습니다. 이 설정은 소규모 시연용이며 상시 운영을 보장하지 않습니다. Supabase 모드에서는 기존 로컬 날짜별 파일 백업이 생성되지 않으므로 앱의 JSON 백업을 사용합니다.

공식 문서: https://render.com/docs/free · https://supabase.com/pricing · https://supabase.com/docs/guides/api

## 카카오 지도 전환
Render Environment에 KAKAO_JAVASCRIPT_KEY를 추가합니다. 카카오 플랫폼 키의 JavaScript SDK 도메인에 http://127.0.0.1:4183 과 https://onway-demo.onrender.com 을 등록합니다. 장소 검색과 길찾기는 서버의 KAKAO_REST_API_KEY를 사용합니다. 지도 화면은 KAKAO_JAVASCRIPT_KEY를 사용하며 VWORLD_API_KEY/VWORLD_DOMAIN은 더 이상 사용하지 않습니다.

## 공유 시연 사용
- 인솔자 링크는 해당 단체의 기록을 수정할 수 있습니다.
- 공유는 인솔자 링크만 제공합니다. 기존 관람용 링크는 더 이상 접속할 수 없습니다.
- 인솔자 링크를 재발급하면 이전 인솔자 링크가 무효화됩니다.
- 링크 복사와 QR 보기는 새 링크를 발급하지 않습니다. 발급된 주소는 현재 탭의 세션에 보관됩니다.
- 공유 인솔자·관람자 화면에는 시연 초기화 버튼을 표시하지 않습니다.
- 전화하기는 현재 시연 번호 061-830-1588로 고정합니다.
- QR 생성 라이브러리: kazuhikoarase/qrcode-generator, MIT. 원본 라이선스는 public/vendor/qrcode.js에 포함합니다. QR 코드는 브라우저 내부에서 생성합니다.

## 관리자 모드 초대
공유 관리에 원래 ONWAY_ADMIN_TOKEN으로 인증한 관리자는 단체 공유 영역에서 관리자 모드 초대 링크를 발급할 수 있습니다. 24시간 동안 모든 단체의 관리 권한을 제공하며, 재발급·해제하면 이전 초대는 사용할 수 없습니다. 초대받은 관리자는 추가 관리자 초대를 발급하거나 해제할 수 없습니다. 인솔자 링크는 영향을 받지 않습니다. 초대 토큰은 서버에 해시로 저장되며 브라우저는 접속 후 URL의 토큰을 제거하고 해당 탭의 세션에 보관합니다.
