# macaron — Phase 0 PoC

운동(걸음/계단) → 마카롱(화폐) 환산 데이터 파이프라인 PoC.
UI는 무시, 데이터 흐름만 확인하는 vertical slice.

## 스택

- React Native + Expo SDK 55 (Dev Client)
- TypeScript, expo-router (file-based)
- react-native-health (iOS HealthKit)
- Supabase (Auth 익명 + Postgres + RLS)
- Zustand, @tanstack/react-query

## 사전 준비 (Mac)

```bash
# 1. 의존성 설치
npm install

# 2. .env 만들기
cp .env.example .env
# .env에 Supabase URL, anon key 채우기

# 3. Supabase SQL Editor에서 schema 실행
#    supabase/schema.sql 복붙
# 4. Supabase Dashboard → Authentication → Providers → Anonymous Sign-ins ON
```

## 빌드 & 실행 (iOS 실기기)

> 시뮬레이터에서는 HealthKit이 동작하지 않음. 반드시 실기기.

```bash
# 네이티브 프로젝트 생성 (HealthKit 권한 반영)
npx expo prebuild --clean

# Dev Client 빌드 + 실행
npx expo run:ios --device
```

HealthKit 권한이 안 받아지면 `ios/macaron.entitlements`에 HealthKit이 들어갔는지, `ios/macaron/Info.plist`에 `NSHealthShareUsageDescription`이 있는지 Xcode에서 확인.

## 동작 확인 (Done 체크리스트)

### 코드 레벨 (CI에서 자동 검증)

- [x] **1000/5000/10000보, 10층 마일스톤 보상 정확** — `npm test` (jest, 15 케이스)
- [x] **중복 적립 방지 로직** — jest dedup 케이스 + `supabase/test-schema.sh` 의 upsert 테스트
- [x] **`daily_activity` 1행 누적** — schema 테스트의 upsert + unique constraint 검증
- [x] **DB 스키마 (FK/check/RLS/trigger) 정확** — `supabase/test-schema.sh` 의 5개 assertion
- [x] **타입 안전성** — `npm run typecheck`
- [x] **린트/포맷** — `npm run lint` + `npm run format:check`

### 실기기 레벨 (Mac에서 직접 확인)

- [ ] Expo 빌드 + 실기기 실행
- [ ] HealthKit 권한 요청 화면 작동
- [ ] 오늘 걸음수 표시 (iPhone Health 앱과 일치)
- [ ] 오늘 계단 층수 표시
- [ ] 실제로 1000보/5000보/10000보 적립
- [ ] 실제로 10층 적립
- [ ] 새로고침해도 중복 적립 안 됨 (실기기 + 실 Supabase)
- [ ] `profiles.macaron_balance` 누적
- [ ] `profiles.lifetime_steps` 누적 (등급업 준비)

## 개발 명령어

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format        # prettier --write
npm run format:check  # CI에서 쓰는 검사 모드
npm test              # jest (마카롱 마일스톤 단위 테스트)
npm test -- --watch   # watch 모드
```

스키마 테스트 (로컬 Postgres 필요):

```bash
sudo -u postgres bash supabase/test-schema.sh
```

## 폴더 구조

```
app/
  _layout.tsx        # QueryClient + 익명 로그인 부트스트랩
  index.tsx          # 홈 (잔액 표시 + PoC 화면 이동)
  poc-health.tsx     # HealthKit + 적립 메인
src/
  lib/
    health.ts        # HealthKit 래퍼 (init, steps, flights, distance)
    supabase.ts      # Supabase 클라이언트
    macaron.ts       # 마일스톤 계산 (순수 함수)
  stores/userStore.ts # Zustand 클라이언트 상태
  hooks/useHealth.ts  # React Query hook
  types/index.ts      # DB row 타입
supabase/
  schema.sql         # 한번에 실행하는 DB 스키마
  test-schema.sh     # 로컬 Postgres로 스키마/RLS/트리거 자동 검증
.github/workflows/
  ci.yml             # JS lint+typecheck+jest + Postgres 스키마 테스트
```

## Phase 1+로 미루는 것

UI 디자인 / 출석 보상 / 광고 (AdMob) / IAP / 등급 업그레이드 / 마당 시즈널 / 코스튬 / Android Health Connect / 친구·소셜
