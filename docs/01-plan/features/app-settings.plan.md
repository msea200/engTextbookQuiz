# Plan: 환경설정 (App Settings)

> **Summary**: 랜딩페이지에 "환경설정" 팝업을 추가하고, GAS 스크립트 속성에 저장된 설정(`offlineWritingMode`, `convWritingMode`)에 따라 학습 흐름을 제어한다.
>
> **Project**: engTextbookQuiz (English Dialogue Memorization App v2)
> **Author**: msea200
> **Date**: 2026-11-04
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

학습 모드 설정을 화면의 일회성 체크박스가 아니라 서버(GAS 스크립트 속성)에 저장해서 다음과 같이 만든다.
- 앱을 다시 열어도 설정이 유지된다.
- 학습자가 랜딩페이지에서 모드를 임의로 바꾸지 못하게 한다(설정창에서만 바꿀 수 있음).
- 오프라인 시험 중 부정행위를 막는 "한 화자만 보기" 모드를 추가한다.

### 1.2 Background

- 지금은 `학습 시작` 버튼 위의 `🖊️ 오프라인 쓰기모드` 체크박스(`#offlineCheck`)로 `offlineMode`를 정한다. 이 체크박스는 학습 방식이 `대화채우기만`일 때만 보이고, 처음 화면으로 돌아가면 초기화된다.
- 대화채우기는 Phase 2(한 화자의 대사 쓰기) → Phase 3(다른 화자의 대사 쓰기) 순서로 진행한다. Phase 3 화면에 보이는 대사는 Phase 2의 정답이다. 그래서 오프라인(종이) 시험에서는 Phase 3 화면을 보고 Phase 2 답을 고쳐 쓸 수 있다.

### 1.3 Related Documents

- 기존 기능: `docs/01-plan/features/writing-test-mode.plan.md` (GitHub 저장소)
- 대상 코드: [Code.js](../../../Code.js), [index.html](../../../index.html)

---

## 2. Scope

### 2.1 In Scope

- [ ] 랜딩페이지(`#chapterSelectScreen`) 오른쪽 위에 `⚙️ 환경설정` 버튼 추가
- [ ] 설정 팝업(모달): 체크박스 2개와 `설정 저장` 버튼, 닫기 버튼
- [ ] GAS 서버 함수 `getAppSettings()` / `saveAppSettings(settings)` 추가 (PropertiesService.getScriptProperties)
- [ ] 앱이 시작될 때 설정을 불러와 클라이언트 상태에 반영
- [ ] 기존 `#offlineCheck` 체크박스를 현재 모드 **표시 전용** UI로 바꿈
- [ ] `offlineWritingMode=1`: 지금의 오프라인 쓰기모드와 똑같이 동작
- [ ] `convWritingMode=1`: Phase 3에서 대화 틀(화자 태그, 줄)만 남기고 모든 대사를 숨김. `다음` 버튼으로 진행

### 2.2 Out of Scope

- 설정창 접근 제한(비밀번호나 교사 인증). 아래 7장 열린 질문 참고
- 사용자별 설정(UserProperties)
- 순서맞추기(Phase 1)와 쓰기 시험(W) 카드의 동작 변경
- 로컬 데모 모드(google.script가 없는 환경)에서 설정을 저장하는 기능. 기본값(모두 0)만 사용

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | 랜딩페이지 오른쪽 위에 `환경설정` 버튼을 표시한다. 다른 화면(카드, 복습, 최종 복습)에서는 숨긴다 | High | Pending |
| FR-02 | `환경설정`을 누르면 모달 팝업이 열린다. 모달에는 `오프라인 쓰기모드`, `한 화자만 보기` 체크박스와 `설정 저장` 버튼이 있다 | High | Pending |
| FR-03 | 팝업을 열 때 체크박스에 현재 저장된 값이 미리 표시된다 | High | Pending |
| FR-04 | `설정 저장`을 누르면 체크된 항목은 `1`, 해제된 항목은 `0`으로 스크립트 속성 `offlineWritingMode`, `convWritingMode`에 저장한다. 성공하면 팝업을 닫고 표시를 갱신한다. 실패하면 오류 메시지를 보여준다 | High | Pending |
| FR-05 | 앱이 시작될 때 `getAppSettings()`로 두 값을 불러온다. 값이 없으면 `0`으로 본다 | High | Pending |
| FR-06 | `offlineWritingMode=1`이면 지금의 `offlineMode=true`와 같이 동작한다. 정답 확인 버튼 비활성화, 다음 버튼 바로 활성화, 이전 버튼 비활성화, 복습(재시도/최종 복습) 생략 후 처음 화면으로 돌아감 | High | Pending |
| FR-07 | `학습 시작` 위 `#offlineCheckWrap`은 바꿀 수 없는 표시 영역이 된다. 현재 켜진 모드(`🖊️ 오프라인 쓰기모드`, `👤 한 화자만 보기`)를 배지나 문구로 보여주고, 둘 다 꺼져 있으면 숨긴다 | Medium | Pending |
| FR-08 | `convWritingMode=1`이면 대화채우기 Phase 3 카드는 각 줄의 화자 태그와 빈 줄(자리 표시)만 보여준다. 영어 문장, 단어, placeholder 예외어(exceptions)는 모두 보이지 않는다 | High | Pending |
| FR-09 | FR-08 화면에서는 입력창과 정답 확인이 없다. `다음 ▶` 버튼이 바로 활성화되고, 누르면 다음 카드로 넘어간다 | High | Pending |
| FR-10 | 처음 화면으로 돌아가도 설정은 유지된다. 지금처럼 `offlineMode=false`로 초기화하는 로직을 바꿔, 설정값에서 다시 계산한다 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 호환성 | 설정이 모두 0이면 기존 동작과 100% 같다 (회귀 없음) | 수동 시나리오 테스트 |
| 반응성 | 설정을 불러오는 동안 기존 데이터 로딩이 지연되지 않는다 (병렬 호출 또는 `getConversationData` 응답에 포함) | 체감 확인 |
| 모바일 | 설정 버튼과 모달이 모바일 폭(≤ 480px)에서 깨지지 않는다 | 모바일 브라우저 확인 |

---

## 4. 현재 코드 영향 분석

| 위치 | 현재 | 변경 방향 |
|---|---|---|
| `Code.js` | 데이터 조회만 함 | `getAppSettings()`, `saveAppSettings({offlineWritingMode, convWritingMode})` 추가 |
| `index.html` `#chapterSelectScreen` (L707~) | 설정 버튼 없음 | 오른쪽 위 `⚙️ 환경설정` 버튼, 설정 모달 마크업과 CSS 추가 |
| `#offlineCheckWrap` (L733~739) | 바꿀 수 있는 체크박스 | 표시 전용 배지 영역으로 교체 |
| `syncOfflineCheckVisibility()` (L907) | `mode==='filling'`일 때만 보이고, 숨기면 체크 해제 | 설정값 기반 표시로 변경, 체크 해제 로직 제거 |
| `startChapter()` (L1011) | `offlineMode = filling && #offlineCheck.checked` | `offlineMode = filling && settings.offlineWritingMode===1` |
| `buildPhase23()` (L1288) | Phase 3: 빈칸 화자는 input, 나머지 화자는 문장 표시 | `convWritingMode && phase===3`이면 모든 줄을 빈 자리 표시로 렌더링 |
| `renderCard()` nav (L1118~1135) | offline 여부로 버튼 상태 결정 | Phase 3 + convWritingMode이면 정답 확인 비활성화, 다음 버튼 활성화 |
| `resetToStart()` (L1871, L1889) | `offlineMode=false`, 체크박스 해제 | 체크박스 조작 제거 (설정은 유지) |

---

## 5. Success Criteria

### 5.1 Definition of Done

- [ ] FR-01 ~ FR-10 구현
- [ ] 시나리오 테스트 통과
  - 설정 (0,0): 기존과 같음
  - 설정 (1,0): 기존 오프라인 쓰기모드와 같음
  - 설정 (0,1), (1,1): Phase 3에서 대사가 전부 숨겨지고 다음으로 진행됨
  - 저장 후 새로고침해도 설정이 유지됨
- [ ] `clasp push` 후 웹앱 배포 버전에서 동작 확인

### 5.2 Quality Criteria

- [ ] 브라우저 콘솔 오류 0건
- [ ] Gap 분석 Match Rate ≥ 90%

---

## 6. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| 스크립트 속성은 **모든 사용자가 함께 쓰는 전역 값**이다. 학습자 한 명이 설정을 바꾸면 모든 학습자에게 적용된다 | High | Medium | 의도된 동작(교사가 반 전체 모드를 정함)인지 확인 필요. 필요하면 설정창 접근 비밀번호를 후속 기능으로 추가 |
| 설정창은 열려 있지만 다른 사람이 값을 바꾼 경우, 열린 탭의 표시와 실제 값이 다를 수 있음 | Low | Low | 팝업을 열 때와 `학습 시작` 시점에 설정을 다시 불러옴 (Design에서 결정) |
| `convWritingMode`를 단독으로 켜고 `offlineWritingMode`를 끄면, Phase 2는 정답 확인과 복습을 하고 Phase 3는 확인 없이 넘어감 | Medium | Medium | Phase 3 카드는 `titleStats`/retry 집계에서 '통과' 처리. 아래 열린 질문 Q2 참고 |
| 학습 방식이 `전체`/`순서맞추기`일 때 오프라인 모드 적용 여부 | Medium | Medium | 기존 동작 유지: `대화채우기만`일 때만 적용 (Q1) |

---

## 7. 열린 질문 (Design 전에 확정)

| # | 질문 | 기본 제안 |
|---|---|---|
| Q1 | `offlineWritingMode=1`일 때 학습 방식이 `전체`/`순서맞추기`여도 적용할까? | **기존과 동일하게 `대화채우기만`일 때만 적용.** 표시 영역에 "대화채우기에서 적용" 안내 |
| Q2 | `convWritingMode`는 `offlineWritingMode`와 상관없이 단독으로 적용할까? | **단독 적용.** 다만 Phase 3는 정답 확인 없이 진행 |
| Q3 | `convWritingMode`는 `대화채우기만`뿐 아니라 `전체` 모드의 Phase 3에도 적용할까? | **적용** (Phase 3가 있는 모든 경우) |
| Q4 | 설정창 접근을 제한할까? (교사 전용) | 이번 범위 밖. 후속 기능 |
| Q5 | 한 화자만 대화하는 타이틀(`isSingleSpeaker`, 홀수/짝수 줄 번갈아 빈칸)에도 같은 규칙을 적용할까? | **적용**: Phase 3 전체 숨김 |

---

## 8. Architecture Considerations

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 설정 저장소 | ScriptProperties / UserProperties / localStorage | **ScriptProperties** | 요구사항에서 지정. 모든 사용자에게 공통 적용 |
| 설정 로드 시점 | 별도 `getAppSettings()` 호출 / `getConversationData()` 응답에 포함 | Design에서 결정 (별도 호출 권장: 저장 후 다시 불러오기에도 재사용) |
| 값 형식 | `"1"`/`"0"` 문자열 | 문자열 저장, 클라이언트에서 `=== '1'`로 비교 | PropertiesService는 문자열만 저장 |
| 모달 구현 | 순수 HTML/CSS + JS | 기존 단일 `index.html` 구조 유지 | 외부 라이브러리 없음 |

---

## 9. Next Steps

1. [ ] 7장 열린 질문 Q1~Q5 확정
2. [ ] Design 문서 작성 (`/pdca design app-settings`)
3. [ ] 구현 → `clasp push` → Gap 분석

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-11-04 | Initial draft | msea200 |
