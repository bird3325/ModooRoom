# [제품 요구사항 정의서 (PRD)] 통합 임대 및 주거 공간 관리 플랫폼: 모두의 방 (가칭)

## 1. 프로젝트 개요 및 배경

- **목적:** 직접 원룸 건물을 관리하고 보수(DIY)하는 건물주(임대인)와 트렌디한 주거 환경 및 신속·투명한 하자 처리를 원하는 세입자(임차인)를 연결하는 상생형 주거 관리 플랫폼 구축.
- **기존 시장의 문제점 및 기회 요인:**
    - **자리톡, 홈버튼 등 기존 서비스의 한계:** 금융/세무 중심의 수납 자동화 기능에만 치중되어 있어 임대인의 수작업 데이터 입력 피로감이 큽니다. 또한 물리적인 시설 보수 기능이 없고, 임차인에게는 '임대료 독촉 앱'으로 인식되어 설치 거부감이 강하다는 취약점이 있습니다.
    - **차별화 전략:** 인공지능(AI) 기반의 스마트 계약서 OCR 등록, 임차인 자발적 참여를 이끌어내는 익명 구조 공유 커뮤니티, 그리고 자재 재고 관리 및 양방향 공실 매칭 시스템을 구축하여 독보적인 오프라인 기반 관리 생태계를 조성합니다.

## 2. 핵심 유저 여정: 스마트 온보딩 파이프라인

임대관리 앱의 최대 허들인 '초기 데이터 입력'과 '세입자 앱 설치 유도'를 해결하는 핵심 프로세스입니다.

`[임대인: 종이 계약서 촬영] ➔ [AI OCR 자동 분류 및 매핑] ➔ [임대인 최종 승인] ➔ [임차인 가입 유도 알림톡 자동 발송]`

### 2.1 AI OCR 데이터 파싱 명세 (데이터 매핑)

임대인이 종이 계약서를 촬영하는 단 한 번의 액션으로 시스템 내 코어 데이터베이스가 자동으로 동기화됩니다.

- **임대할 부분 (소재지, 호실, 면적):** 임대인의 보유 자산 목록(건물/호실 디렉토리)에 신규 등록 및 매칭.
- **계약 내용 (보증금, 월세, 관리비, 퇴실청소비, 계약일, 임대차 기간):** 월별 청구 현황판 및 D-Day 위젯 자동 생성.
- **임차인 정보 (성명, 연락처):** 임차인 가입 유도 자동 알림톡 발송의 식별자로 사용.
- **개업공인중개사 정보 (소재지, 사무소명칭, 대표자성명, 등록번호, 전화):** [중개소 네트워크] 단골 부동산 자동 자산화.

### 2.2 임차인 거부감 제로(Zero) 가입 유도 시나리오

계약 등록 즉시 임차인에게 발송되는 알림톡 문구로, 독촉이 아닌 **'안전 주거 케어 혜택 가이드'** 형태로 접근합니다.

> **[카카오 알림톡 표준 템플릿]**
> 
> - **제목:** 🏠 [모두의 방] 입주민 안전 주거 케어 서비스 안내
> - **문구:** "안녕하세요 {세입자명}님! 신규 입주하시는 {건물명}의 만족도 높은 거주를 위해 임대인께서 하우스 케어 시스템을 등록하셨습니다. 본 앱을 설치하시면 1) 번거로운 연락 없이 사진 한 장으로 1초 만에 접수하는 **스마트 비대면 하자 보수 시스템**, 2) 나와 완벽히 똑같은 구조의 이웃들은 방을 어떻게 꾸미고 사는지 구경하는 **익명 인테리어 커뮤니티 '룸스토리'** 가입 혜택을 즉시 누리실 수 있습니다."

## 3. 권한별 세부 기능 요구사항 (Functional Requirements)

### 3.1 임대인 (Owner) 모드 기능 명세

- **종합 현황 대시보드:** 총 보유 건물 및 원룸 수, 실시간 공실률 계산. 당월 임대료 및 관리비 미납/완납 상태 그리드 표시.
- **자재 및 재고 관리 (셀프 수리 지원):**
    - 원룸 소모품(LED 전등, 도어락 배터리, 싱크대 수전, 배수구 트랩 등) 수량 실시간 트래킹.
    - 설정한 '최소 재고 수량' 이하로 자재가 감소하면 즉시 구매 안내 푸시 팝업 활성화.
- **수리 및 외주 연계:** 특정 호실의 보수 날짜, 사용 자재, 비용 기록 누적. 누수/보일러 등 자체 해결 불가능 시 전문 업체 연락처 원클릭 연결.
- **중개소 및 스마트 공실 알림:**
    - 퇴실 신청 시 매물 정보 템플릿을 다수의 단골 부동산에 동시 메시지 발송.
    - **양방향 부동산 역제안:** 링크 클릭 후 실시간 방문 스케줄 예약 가능. 예약 확정 시 원격 일회용 비밀번호(OTP) 발송.

### 3.2 임차인 (Tenant) 모드 기능 명세

- **내 계약 및 비용 대시보드:** 남은 계약 기간 카운트다운(D-Day). 월별 납부 영수증 증빙.
- **스마트 민원 신청:** 사진/영상 기반 즉시 접수, 일정 조율 캘린더, [접수 완료 ➔ 방문 예정 ➔ 수리 중 ➔ 수리 완료] 타임라인 제공.
- **룸스토리 (커뮤니티):**
    - **[건물/동일구조] 필터링:** 익명성 기반, 완벽히 동일한 구조의 다른 방 레퍼런스 공유.
    - 가구 배치 및 소품 핀(Tag) 기능 연동.

### 3.3 관리자 (Admin) 모드 기능 명세

- **관리자 전용 대시보드 (Dashboard):**
  - **전체 가입 통계:** 총 가입 회원 수, 임대인(Owner) 회원 수, 임차인(Tenant) 회원 수의 요약 카드 제공.
  - **지역별 분포 통계:** 가입된 회원들의 주요 활동 지역별 분포도 및 통계 그리드.
  - **가입 추이 통계:** 일자별/월별 신규 회원 가입 추이를 한눈에 파악할 수 있는 통계 세션.
- **회원 관리 시스템 (Member Management):**
  - **회원 검색 및 필터링:** 이메일, 이름 기준 검색 기능 및 권한(임대인, 임차인, 관리자)별 필터 제공.
  - **회원 상세 편집 모달:** 특정 회원의 정보를 조회하고 역할(Role) 변경, 연락처 수정, 계정 활성화 상태(차단/정상)를 설정 및 저장하는 편집 창 제공.
- **시스템 설정 (System Settings):**
  - **Gemini API Key 관리:** 플랫폼 내부 AI (OCR 계약서 분석 등)에 사용되는 Google Gemini API Key 설정 및 관리 저장 기능.
- **관리자 드롭다운 및 네비게이션:**
  - 헤더 영역에서 관리자 계정일 경우 노출되는 전용 드롭다운 메뉴를 통해 대시보드, 회원 목록, 시스템 설정을 즉시 전환할 수 있는 통합 네비게이션 제공.

## 4. 비기능적 요구사항 (Non-Functional Requirements)

- **철저한 익명성 및 프라이버시 보장:** 상세 호실 마스킹, 랜덤 닉네임 의무 적용, 원본 사진의 Exif 위치 데이터 강제 삭제.
- **모바일 성능 최적화:** 지연 시간 0.3초 이내, 계약서 OCR 분석 3초 이내 반환.

## 5. UI/UX 디자인 가이드라인

### 5.1 컬러 스키마 (Color Schema)
- **Primary Deep Navy (`#1a365d`):** 전반적인 신뢰감을 부여하는 핵심 메인 컬러.
- **Primary Light Blue (`#2b6cb0`):** 활기차고 스마트한 주거 케어 컬러.
- **Point Orange (`#ed8936`):** 자재 재고 부족 경고 등 액센트 컬러.
- **Background Gray (`#f7fafc`):** 전체 레이아웃 배경 및 카드 컴포넌트 배경.

### 5.2 주요 컴포넌트 사양
- **서체:** 프리텐다드(Pretendard), 본문 10pt Regular, 줄간격 1.6.
- **재고 알림 배지:** 수량 임계치 미만 시 포인트 오렌지 가변 및 '주문 필요' 태그 활성화.
- **민원 스텝퍼:** 세로형 타임라인, 라이트 블루 애니메이션 처리.
- **변경사항 저장 버튼 상태 관리**: 호실 및 임대차 상세 정보 수정 페이지에서 폼 내부의 초기 로드 상태와 변경 사항을 비교하여, 실질적인 변경(텍스트 입력, 드롭다운 선택, 이미지 업로드 등)이 발생하지 않았을 경우 '변경사항 저장' 버튼이 비활성화(`disabled`) 처리됩니다. 변경 감지 시 즉시 활성화됩니다. 비활성화 시에는 클릭이 차단되며 마우스 커서가 금지 표시(`not-allowed`)로 변하고, 배경색은 회색톤(`#cbd5e0`)으로 낮추어 시각적으로 비활성화됨을 인지할 수 있도록 하였습니다.
- **저장 진행 피드백 및 성능 최적화**: 
  - **피드백**: 저장 버튼을 클릭하면 버튼이 비활성화되며 로딩 아이콘과 함께 `저장 중...` 상태로 텍스트가 변경되고, 화면 전체에 `변경사항을 저장하고 있습니다...` 및 `데이터를 안전하게 저장하고 있습니다. 잠시만 기다려 주세요.`라는 메시지를 담은 고정 오버레이 로딩 모달 뷰가 노출되어 사용자에게 직관적인 진행 상태를 전달합니다.
  - **속도 최적화 (API 지연 단축)**: 중개소 정보(`brokers`)의 수정 여부를 비교 분석하여 변경 사항이 없을 시 Supabase의 중개소 조회/저장 쿼리(2회 RTT)를 건너뛰고 기존 외래키(`broker_id`)를 직접 재활용해 한 번의 트랜잭션으로 계약 정보를 업데이트합니다. 이로 인해 저장 처리 속도가 최대 300% 향상됩니다.
- **공실 호실의 영속성 및 목록 노출 보장**: 호실 및 임대차 상세 정보 페이지에서 방 상태를 '공실'(`vacant`)로 저장하더라도, 임대인 대시보드 및 호실 관리 화면에서 해당 호실 정보가 삭제되지 않고 지속적으로 노출되도록 보장합니다. 이를 위해 Supabase 조회 시 `vacant` 계약 상태를 포함하여 모든 호실 정보를 불러오되, 현재 거주 중인 임차인 목록에서는 공실을 걸러내어 관리 편의성을 향상했습니다.

## 6. 단계별 제품 개발 로드맵 (Roadmap)

- **Phase 1: MVP 구축 및 핵심 자동 온보딩 검증** (OCR 파싱, 카카오 알림톡, 하자 보수 기본 접수)
- **Phase 2: 자산 관리 내실화 및 커뮤니티 활성화** (재고 관리, 외주 연계, 룸스토리 커뮤니티, 방문 예약 OTP)
- **Phase 3: 플랫폼 생태계 경제권 확립** (B2B 커머스 최저가 자재 쇼핑몰 연계, 종합소득세 세무 증빙 아카이빙)

---

## 7. 세부 기술 사양 및 인터페이스 (Technical Specs)

### 7.1 AI OCR 데이터 파싱 인터페이스 및 추출 항목 (15개)
추출 인터페이스(UI)를 통해 아래 15개의 필수 항목을 데이터베이스에 적재합니다.

```json
{
  "success": true,
  "execution_time_ms": 1250,
  "data": {
    "property": { 
      "address": "서울특별시 마포구 백범로 123", 
      "room_number": "302호", 
      "area_m2": 24.5 
    },
    "contract": { 
      "deposit": 10000000, 
      "monthly_rent": 550000, 
      "maintenance_fee": 70000, 
      "move_out_cleaning_fee": 100000,
      "start_date": "2026-06-16", 
      "end_date": "2028-06-15" 
    },
    "tenant": { 
      "name": "홍길동", 
      "phone": "010-1234-5678" 
    },
    "broker": { 
      "agency_address": "서울특별시 마포구 마포대로 1",
      "agency_name": "대박공인중개사사무소", 
      "representative_name": "김대박",
      "registration_number": "11440-2015-00123",
      "phone": "02-987-6543" 
    }
  }
}
```

### 7.2 데이터베이스 스키마 (`contracts` 테이블)
`buildings` 테이블과 1:N 또는 1:1 형태로 연동되는 `contracts` 테이블의 스펙입니다. AI 15개 항목 자동 추출 데이터를 모두 담을 수 있도록 설계되었습니다.

- `id` (UUID, Primary Key) : 계약서 데이터의 고유 식별자
- `building_id` (UUID, Foreign Key -> buildings.id) : 연결된 건물의 고유 ID
- `owner_id` (UUID, Foreign Key -> auth.users.id) : 데이터를 등록한 임대인(소유자)의 계정 ID (RLS 보안 정책 검증용)
- `status` (String) : 계약 상태 (예: 'matched' - 매칭 완료, 'manual' - 수동 등록)
- `room_number` (String) : 1. 임대할 부분 (호실 등 상세 주소)
- `room_type` (String) : 호실 타입 (예: '원룸', '투룸', '쓰리룸', '오피스텔', '미지정')
- `room_status` (String) : 방 상태 (예: '공실', '입주중', '보수필요', '청소대기')
- `area` (String) : 2. 면적 (㎡)
- `deposit` (Number) : 3. 보증금 (원 단위 숫자)
- `monthly_rent` (Number) : 4. 차임(월세) (원 단위 숫자)
- `maintenance_fee` (Number) : 5. 관리비 (원 단위 숫자)
- `cleaning_fee` (Number) : 6. 청소비 (원 단위 숫자)
- `contract_date` (String) : 7. 계약일 (YYYY-MM-DD 형식 등)
- `lease_period` (String) : 8. 임대차 기간 (시작일 ~ 종료일)
- `tenant_name` (String) : 9. 임차인 성명
- `tenant_phone` (String) : 10. 임차인 전화번호
- `broker_id` (UUID, Foreign Key -> brokers.id) : 11~15번 항목 정규화 대응을 위한 개업공인중개사 고유 식별자
- `broker_address` (String) : 11. 개업공인중개사 사무소 소재지 (하위 호환용)
- `broker_agency_name` (String) : 12. 개업공인중개사 명칭 (하위 호환용)
- `broker_rep_name` (String) : 13. 개업공인중개사 대표자 성명 (하위 호환용)
- `broker_reg_number` (String) : 14. 개업공인중개사 등록번호 (하위 호환용)
- `broker_phone` (String) : 15. 개업공인중개사 전화번호 (하위 호환용)
- `contract_image_url` (Text) : 마스킹 처리된 계약서 원본 이미지 URL
- `created_at` (Timestamp) : 데이터 생성 일시

### 7.3 데이터베이스 스키마 (`brokers` 테이블)
중개업소 회원 가입 및 정보 누적을 위한 독립 테이블입니다. 계약서 OCR 분석/수동 입력 시에도 데이터가 적재되지만 특정 임대인에 종속되지 않으므로 `owner_id`를 저장하지 않고 전역 디렉토리로 작동합니다. 중개업소 회원 가입 시 동일한 등록번호(`registration_no`)가 존재할 경우 경고 알림을 표시하고 재등록하지 않습니다.

- `id` (UUID, Primary Key) : 중개소 데이터의 고유 식별자
- `agency_name` (String) : 중개사무소 명칭
- `representative_name` (String) : 대표 공인중개사 성명
- `registration_no` (String, Unique) : 중개사무소 등록번호 (중복 가입 방지 식별자)
- `address` (String) : 중개사무소 소재지 주소
- `phone` (String) : 대표 전화번호
- `created_at` (Timestamp) : 데이터 생성 일시

#### Supabase SQL 적용 쿼리
```sql
-- 1. brokers 테이블 생성 쿼리
CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_name TEXT NOT NULL,
    representative_name TEXT,
    registration_no TEXT UNIQUE NOT NULL,
    address TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. contracts 테이블이 없다면 새로 생성하는 쿼리입니다.
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id),
    broker_id UUID REFERENCES public.brokers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'manual',
    room_number TEXT,
    room_count INTEGER DEFAULT 1,
    bathroom_count INTEGER DEFAULT 1,
    living_room_count INTEGER DEFAULT 0,
    veranda_count INTEGER DEFAULT 1,
    area TEXT,
    deposit BIGINT DEFAULT 0,
    monthly_rent BIGINT DEFAULT 0,
    maintenance_fee BIGINT DEFAULT 0,
    cleaning_fee BIGINT DEFAULT 0,
    contract_date TEXT,
    lease_period TEXT,
    tenant_name TEXT,
    tenant_phone TEXT,
    broker_address TEXT,
    broker_agency_name TEXT,
    broker_rep_name TEXT,
    broker_reg_number TEXT,
    broker_phone TEXT,
    contract_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 이미 테이블이 존재한다면 누락된 컬럼만 추가하는 ALTER 쿼리입니다.
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS room_number TEXT,
ADD COLUMN IF NOT EXISTS room_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT '미지정',
ADD COLUMN IF NOT EXISTS room_status TEXT DEFAULT '공실',
ADD COLUMN IF NOT EXISTS bathroom_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS living_room_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS veranda_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS deposit BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_rent BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS maintenance_fee BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS cleaning_fee BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS contract_date TEXT,
ADD COLUMN IF NOT EXISTS lease_period TEXT,
ADD COLUMN IF NOT EXISTS tenant_name TEXT,
ADD COLUMN IF NOT EXISTS tenant_phone TEXT,
ADD COLUMN IF NOT EXISTS broker_address TEXT,
ADD COLUMN IF NOT EXISTS broker_agency_name TEXT,
ADD COLUMN IF NOT EXISTS broker_rep_name TEXT,
ADD COLUMN IF NOT EXISTS broker_reg_number TEXT,
ADD COLUMN IF NOT EXISTS broker_phone TEXT,
ADD COLUMN IF NOT EXISTS contract_image_url TEXT;

-- 3. 안전한 RLS(Row Level Security) 정책을 켜고 설정합니다.
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- 본인이 작성한 데이터만 볼 수 있는 정책
CREATE POLICY "Enable read for users based on owner_id" 
ON public.contracts FOR SELECT 
USING (auth.uid() = owner_id);

-- 본인 계정으로만 데이터를 넣을 수 있는 정책
CREATE POLICY "Enable insert for authenticated users only" 
ON public.contracts FOR INSERT 
WITH CHECK (auth.uid() = owner_id);
```

### 7.2 자재 및 재고 관리 규칙 한계치
- LED 전등: `3`개 / 도어락 배터리: `10`개 / 싱크대 수전: `1`개 / 배수구 트랩: `2`개

### 7.3 부동산 OTP 연계 로직 규칙
- 생성 후 30분간 유효하며, 1회 인증에 성공하거나 만료 시 즉시 폐기 처리됨.
