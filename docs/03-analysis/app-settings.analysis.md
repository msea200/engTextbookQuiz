# Gap Analysis: 환경설정 (App Settings)

> **Summary**: app-settings Design/Plan 대비 Code.js·index.html 구현 비교 (PDCA Check)
>
> **Author**: bkit-gap-detector
> **Created**: 2026-11-04
> **Status**: Review
> **Design**: [app-settings.design.md](../02-design/features/app-settings.design.md)
> **Plan**: [app-settings.plan.md](../01-plan/features/app-settings.plan.md)

---

## 1. 요약 / Match Rate

| 구분 | 결과 |
|---|---|
| 비교 항목 수 | 61 |
| Match / Partial / Deviation / Missing | 57 / 3 / 1 / 0 |
| **Match Rate** | **96.7%** (59/61) |
| 판정 | ≥ 90% → Report 단계 진행 가능 (단, G1 수정 권장) |

- 가중치: Match 1.0, Partial 0.5, Deviation(문서 서술 불일치, 동작 무해) 0.5, Missing 0.
- Partial 3건(4.3 표시 규칙, 5.7 흐름, FR-07)은 모두 동일 원인(G1).
- 검증 근거: 정적 코드 대조 + 별도 수행된 jsdom 24개 체크(T1, T2, T5, T6, T7, T9, T11, Esc, matching 무시) + 구문 검사.
- 줄 번호는 현재(변경 후) index.html 기준.

## 2. 항목별 비교표

### 2.1 확정 결정 (Design 0장)
| # | 결과 | 근거 |
|---|---|---|
| Q1 offline은 대화채우기만 | Match | index.html:1207 |
| Q2 conv 단독 적용 | Match | index.html:1208, 1858 |
| Q3 conv는 전체/대화채우기/복습 | Match | index.html:1208 (`!== 'matching'`), 1691 (retry도 세션 convMode 유지) |
| Q4 접근 제한 없음 | Match | – |
| Q5 한 화자 타이틀도 숨김 | Match | index.html:1403 분기가 isSingleSpeaker 판정(1434)보다 앞 |

### 2.2 데이터 모델 / 서버 API
| 항목 | 결과 | 근거 |
|---|---|---|
| 스크립트 속성 키·'1'/'0'·기본 '0' | Match | Code.js:68, 74 |
| `appSettings` 상태 | Match | index.html:889 |
| `convMode` 세션 고정 | Match | index.html:886, 1208, 2017 |
| `SETTING_KEYS` | Match | Code.js:68 |
| `getAppSettings()` | Match | Code.js:70-79 (설계 코드와 동일) |
| `saveAppSettings()` (검증·setProperties(…, false)) | Match | Code.js:81-90 |
| appsscript.json 변경 없음 | Match | – |

### 2.3 UI
| 항목 | 결과 | 근거 |
|---|---|---|
| 헤더 설정 버튼 마크업 | Match | index.html:794 |
| `.btn-settings` CSS | Match | index.html:165-178 (transition 추가, 경미) |
| 버튼 표시 조건 (start 숨김/reset 표시) | Match | index.html:1209, 2035 |
| 모달 마크업 (role/aria 포함) | Match | index.html:798-817 |
| 모달 CSS | Match | index.html:179-240 (`.settings-msg` 기본색 추가, 경미) |
| Esc 닫기 | Match | index.html:996-998 |
| 모바일 대응 CSS (max-width 400 + padding 16) | Match (실기기 미검증) | index.html:186, 192 |
| `#offlineCheckWrap` → `#modeIndicator` 교체 | Match | index.html:846-848 |
| `.mode-indicator` CSS | Match | index.html:147-162 (gap 6px vs 4px, 경미) |
| 체크박스/label CSS 삭제 | Match | grep 결과 잔존 셀렉터 없음 (주석만 잔존, index.html:135) |
| 4.3 표시 규칙 표 | **Partial** | "선택된 타이틀 없음 → 숨김"이 처음 화면 복귀/챕터 해제 시 미적용 (G1) |
| `.dialogue-blank`, `.conv-hint` CSS | Match | index.html:243-256 |

### 2.4 함수 목록 (Design 5.1)
| 함수 | 결과 | 근거 |
|---|---|---|
| loadAppSettings | Match | index.html:931-937 (`hasGas()` 헬퍼 사용) |
| applySettings | Match | index.html:939-943 |
| openSettings | Match | index.html:956-961 |
| closeSettings | Match | index.html:963-966 |
| saveSettings | Match | index.html:968-994 (잠금·실패 메시지·데모 분기) |
| syncOfflineCheckVisibility | Match | index.html:1097-1112 |
| startChapter | Match | index.html:1206-1209 |
| buildPhase23 | Match | index.html:1401-1431 |
| renderCard (nav) | Match | index.html:1846-1872 |
| resetToStart | Match | index.html:2016-2017, 2035 |
| 첫 번째 renderCard 삭제 | Match | 정의 1개만 존재 (`_origRenderCard` 잔존, G6) |

### 2.5 로직 (Design 5.2~5.8)
| 항목 | 결과 | 근거 |
|---|---|---|
| 5.2 init 병렬 로딩 | Match | index.html:911-922 |
| 5.3 팝업 흐름 | Match | index.html:956-994 |
| 5.4 학습 시작 계산식 | Match | index.html:1207-1208 |
| 5.5 Phase 3 숨김 렌더링 (DOM에 대사 없음) | Match | index.html:1403-1431 |
| 5.6 skipCheck / btnNext | Match | index.html:1858-1871 |
| 5.6 이전 버튼 기존 규칙 유지 | Match | index.html:1846-1851 |
| 5.6 retry 카드 동일 규칙 | Match | index.html:1686-1696 |
| 5.6 "통계에 영향 없음" | **Deviation** | attempts가 Phase 3 1회분 감소 → 최종 라벨 변동 (G2) |
| 5.7 처음 화면 복귀 후 표시 재계산 | **Partial** | hideTitleChecklist가 sync 미호출 (G1) |
| 5.8 표시 영역 렌더링 | Match | index.html:1097-1112 |

### 2.6 상태 조합표 (Design 6장)
7행 모두 Match. offline 판정 index.html:1207, conv 판정 1208, nav 1858, 복습 생략 1652, W 카드 무변경 1771-1817.

### 2.7 Plan FR
| FR | 결과 | 근거 |
|---|---|---|
| FR-01 버튼 표시/숨김 | Match | index.html:794, 1209, 2035 |
| FR-02 모달 구성 | Match | index.html:798-817 |
| FR-03 현재값 미리 표시 | Match | index.html:957, 960 |
| FR-04 저장/닫기/오류 | Match (실서버 미검증) | index.html:968-994, Code.js:81-90 |
| FR-05 시작 시 로드, 없으면 0 | Match | index.html:918, Code.js:74 |
| FR-06 offline 동작 동일 | Match | index.html:1207, 1846, 1858, 1652 |
| FR-07 표시 전용 영역 | **Partial** | 처음 화면 복귀 시 이전 상태로 표시됨 (G1) |
| FR-08 Phase 3 대사 숨김 | Match | index.html:1403-1431 |
| FR-09 입력·확인 없음, 다음 즉시 | Match | index.html:1858-1871 |
| FR-10 복귀 후 설정 유지 | Match | index.html:2016-2017 (appSettings 미변경) |

## 3. 발견된 Gap·이슈

| ID | Severity | 위치 | 내용 | 권장 |
|---|---|---|---|---|
| G1 | Medium | index.html:1057-1063, 2036 | `hideTitleChecklist()`가 `syncOfflineCheckVisibility()`를 호출하지 않음. `.show` 토글은 1111 한 곳뿐이라 처음 화면 복귀·챕터 해제 시 노란 표시 영역이 이전 상태로 남음 | `hideTitleChecklist()` 끝에 `syncOfflineCheckVisibility();` 추가 |
| G2 | Low | index.html:1575, 1968, 1984 | convMode에서 Phase 3 정답 확인이 없어 `attempts`가 1회 적음 → 최종 화면 라벨/allPerfect 변동. Design 5.6 서술과 불일치 | Design 문장 수정 (동작은 유지) |
| G3 | Low | index.html:918, 1207-1208 | 설정 응답 전에 학습을 시작하면 세션이 기본값(false)으로 고정. Plan 6장 "학습 시작 시점 재로드"는 Design에서 빠짐 | 설정 로드 완료 전 시작 버튼 잠금, 또는 startChapter에서 재로드 |
| G4 | Low | index.html:956-966 | 모달 열 때 포커스 이동·포커스 트랩·닫은 후 포커스 복귀 없음 | 열 때 첫 체크박스 focus, 닫을 때 #btnSettings focus |
| G5 | Low | index.html:960 | 팝업 연 직후 체크 변경 시 서버 응답이 덮어씀 | 응답 전 체크박스 disabled |
| G6 | Info | index.html:1736, 135 | 사용되지 않는 `_origRenderCard`, 이전 이름 그대로인 CSS 주석 | 정리 |
| G7 | Info | index.html:1846-1851 | convMode 단독 시 Phase 3에서 이전 → Phase 2에서 다른 화자 대사(정답) 노출. Design이 의도적으로 허용 | 종이 시험 정책상 convMode일 때 Phase 3 이전 버튼 비활성화 여부 결정 |
| G8 | Info (기존) | index.html:1744 | 복습 종료 판정이 `cardSequence.length === 3`이라 대화채우기만(2장)에서는 남은 복습 목록을 건너뜀. 기존 버그, 이번 기능 범위 밖 | 별도 이슈로 등록 |

확인 결과 문제없음: 지운 `#offlineCheck` 참조 0건 / 표시 영역 innerHTML(1110)은 고정 문자열만 사용(XSS 없음) / 숨김 Phase 3 DOM에 대사·data-answer 없음 / 서버 API는 설계 코드와 동일.

## 4. 미검증 항목

| # | 항목 | 사유 |
|---|---|---|
| T3 | 저장 후 새로고침 시 값 유지 | 실제 GAS 웹앱에서 확인 필요 (clasp push 완료, 배포 갱신 필요) |
| T4 | 저장 실패 시 팝업 유지·오류 표시 | 실제 GAS(네트워크 차단) 필요 |
| T12 | 모바일 360px 헤더/모달 | 실기기·브라우저 확인 필요 |
| T8 | 한 화자 타이틀 + (0,1) | 코드상 동일 분기, 실행 확인 여부 미확인 |
| T10 | 학습 중 다른 탭에서 설정 변경 | 코드상 세션 고정, 실제 테스트 없음 |

## 5. 권장 조치

### 즉시
1. G1 수정 (한 줄 추가) 후 처음 화면 복귀 시나리오 재확인.
2. 웹앱 배포 갱신 후 T3, T4, T12 실행.

### 문서 업데이트
1. Design 5.6 통계 서술 수정 (G2).
2. Design 5.7 흐름 서술을 실제 호출 경로에 맞게 수정.
3. Plan 6장 "학습 시작 시점 재로드" 대응을 채택할지 기록 (G3).

### 선택
1. 모달 포커스 관리 (G4), 팝업 열 때 덮어쓰기 방지 (G5), 남은 코드 정리 (G6).
2. G7 정책 결정, G8 별도 이슈 등록.

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-11-04 | Initial gap analysis | bkit-gap-detector |
