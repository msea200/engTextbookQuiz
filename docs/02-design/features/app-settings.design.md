# Design: 환경설정 (App Settings)

> **Summary**: GAS 스크립트 속성 기반 설정(`offlineWritingMode`, `convWritingMode`)과 설정 팝업, 모드 표시 영역, Phase 3 대사 숨김 렌더링의 상세 설계.
>
> **Project**: engTextbookQuiz (English Dialogue Memorization App v2)
> **Author**: msea200
> **Date**: 2026-11-04
> **Status**: Draft
> **Plan**: [app-settings.plan.md](../../01-plan/features/app-settings.plan.md)

---

## 0. 확정된 결정 (Plan 7장 열린 질문)

| # | 결정 |
|---|---|
| Q1 | `offlineWritingMode`는 기존과 같이 **학습 방식이 `대화채우기만`일 때만** 적용한다 |
| Q2 | `convWritingMode`는 `offlineWritingMode`와 **상관없이 단독으로** 적용한다 |
| Q3 | `convWritingMode`는 **Phase 3가 있는 모든 학습 방식**(`전체`, `대화채우기만`)과 복습(retry) 카드에 적용한다 |
| Q4 | 설정창 접근 제한은 **범위 밖**이다 |
| Q5 | 한 화자만 대화하는 타이틀(`isSingleSpeaker`)도 **같은 규칙**을 적용한다. Phase 3 전체를 숨긴다 |

---

## 1. 사전 확인: 코드 구조 주의사항

- `index.html`에 `function renderCard()`가 **두 번** 정의되어 있다 (L1062, L1593). 함수 선언은 나중 것이 이기므로 **실제로 동작하는 것은 L1593 버전**이다 (`type === 'writing'` 분기 포함).
  - → 이번 변경은 **L1593 `renderCard()`에만** 적용한다.
  - → L1062 버전은 사용되지 않는 코드이므로 이번 작업에서 **삭제**한다. 같은 이름 함수의 혼동을 없애기 위함이다 (동작 영향 없음).
- `offlineMode`가 쓰이는 곳: `startChapter`(L1011), `checkPhase23`(L1434), `showReviewList`(L1508), `renderCard`(L1702, L1714, L1726), `resetToStart`(L1871). `offlineMode` 변수와 그 의미는 그대로 두고, **값을 정하는 곳만** 설정값으로 바꾼다.

---

## 2. 데이터 모델

### 2.1 스크립트 속성 (서버)

| Key | 값 | 기본값(없을 때) | 의미 |
|---|---|---|---|
| `offlineWritingMode` | `"1"` / `"0"` | `"0"` | 오프라인 쓰기모드 |
| `convWritingMode` | `"1"` / `"0"` | `"0"` | 한 화자만 보기 (Phase 3 대사 숨김) |

### 2.2 클라이언트 상태 (index.html STATE 영역)

```js
// ── APP SETTINGS (스크립트 속성 미러) ──
let appSettings = { offlineWritingMode: false, convWritingMode: false };
```

- 서버 문자열 `'1'` → `true`, 그 외 → `false`로 바꿔 보관한다.
- 기존 `offlineMode`는 **세션 단위 실제 적용 여부**(설정 && 대화채우기만)로 유지한다.
- `convWritingMode`는 별도 세션 변수 없이 `appSettings.convWritingMode`를 바로 참조한다. 단, 학습 도중 설정이 바뀌는 것을 막기 위해 `startChapter()` 시점의 값을 `convMode` 변수로 고정한다.

```js
let convMode = false;      // 세션 고정: Phase 3 대사 숨김 적용 여부
```

---

## 3. 서버 API (Code.js)

```js
const SETTING_KEYS = ['offlineWritingMode', 'convWritingMode'];

function getAppSettings() {
  try {
    const props = PropertiesService.getScriptProperties();
    const settings = {};
    SETTING_KEYS.forEach(k => { settings[k] = props.getProperty(k) === '1' ? '1' : '0'; });
    return { success: true, settings: settings };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function saveAppSettings(input) {
  try {
    const toSave = {};
    SETTING_KEYS.forEach(k => { toSave[k] = (input && String(input[k]) === '1') ? '1' : '0'; });
    PropertiesService.getScriptProperties().setProperties(toSave, false); // 다른 속성 유지
    return { success: true, settings: toSave };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
```

- 입력값 검증: `'1'`이 아닌 값은 모두 `'0'`으로 저장한다.
- `setProperties(obj, false)`: 다른 스크립트 속성은 지우지 않는다.
- 권한: PropertiesService는 추가 OAuth 범위가 필요 없다 (appsscript.json 변경 없음).

---

## 4. UI 설계

### 4.1 환경설정 버튼 (헤더 오른쪽)

```html
<header class="app-header">
  <div class="app-logo">Dialogue<span>Go!</span></div>
  <button class="btn-settings" id="btnSettings" onclick="openSettings()">⚙️ 환경설정</button>
</header>
```

```css
.btn-settings {
  margin-left: auto;              /* 오른쪽 끝 정렬 */
  padding: 8px 14px;
  font-family: 'Nunito', sans-serif;
  font-size: .85rem; font-weight: 800;
  color: var(--primary);
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
}
.btn-settings:hover { border-color: var(--primary); }
```

- 보이는 조건(FR-01): 랜딩(`#chapterSelectScreen`)이 보일 때만.
  - `startChapter()`: `btnSettings.style.display = 'none'`
  - `resetToStart()`: `btnSettings.style.display = ''`

### 4.2 설정 모달

```html
<!-- SETTINGS MODAL -->
<div class="modal-backdrop" id="settingsModal" onclick="if(event.target===this) closeSettings()">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
    <div class="modal-header">
      <span id="settingsTitle">⚙️ 환경설정</span>
      <button class="modal-close" onclick="closeSettings()" aria-label="닫기">✕</button>
    </div>
    <label class="setting-item">
      <input type="checkbox" id="setOffline">
      <span>🖊️ 오프라인 쓰기모드
        <small>대화채우기만: 정답 확인 없이 다음으로 진행 · 복습 생략</small></span>
    </label>
    <label class="setting-item">
      <input type="checkbox" id="setConv">
      <span>👤 한 화자만 보기
        <small>다른 화자의 대사 쓰기에서 대사를 모두 숨김 (부정행위 방지)</small></span>
    </label>
    <div class="settings-msg" id="settingsMsg"></div>
    <button class="btn-start" id="btnSaveSettings" onclick="saveSettings()">설정 저장</button>
  </div>
</div>
```

```css
.modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  display: none; align-items: center; justify-content: center;
  padding: 16px;
  background: rgba(26,26,46,.45);
}
.modal-backdrop.show { display: flex; }
.modal {
  width: 100%; max-width: 400px;
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.modal-header { display: flex; align-items: center; justify-content: space-between;
  font-size: 1.1rem; font-weight: 900; }
.modal-close { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-soft); }
.setting-item {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px;
  border: 2px solid var(--border); border-radius: 13px;
  font-size: .9rem; font-weight: 800; cursor: pointer;
}
.setting-item input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--primary); flex-shrink: 0; }
.setting-item small { display: block; font-size: .78rem; font-weight: 600; color: var(--text-soft); margin-top: 2px; }
.settings-msg { min-height: 1.1em; font-size: .82rem; font-weight: 700; }
.settings-msg.error { color: var(--accent); }
```

- 모바일(≤480px): `max-width: 400px` + `padding: 16px`로 화면 폭에 맞게 줄어든다.
- `Esc` 키로 닫기: `document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSettings(); })`

### 4.3 모드 표시 영역 (기존 `#offlineCheckWrap` 대체, FR-07)

```html
<!-- MODE INDICATOR (설정창에서만 변경 가능) -->
<div class="offline-check-wrap" id="offlineCheckWrap">
  <div class="mode-indicator" id="modeIndicator"></div>
</div>
```

- 기존 `.offline-check-wrap` 스타일(노란 박스)은 그대로 쓴다. `input[type=checkbox]`/`label` 관련 CSS는 삭제한다.
- 안에는 지금 **적용되는** 모드만 한 줄씩 표시한다.

```css
.mode-indicator { display: flex; flex-direction: column; gap: 4px; font-size: .88rem; font-weight: 800; color: #7a5800; }
.mode-indicator small { display: block; font-weight: 600; font-size: .78rem; color: #a07820; }
```

| 조건 | 표시 |
|---|---|
| `appSettings.offlineWritingMode && mode==='filling'` | `🖊️ 오프라인 쓰기모드` + `<small>정답 확인 없이 다음으로 진행 · 복습 생략</small>` |
| `appSettings.convWritingMode && mode!=='matching'` | `👤 한 화자만 보기` + `<small>다른 화자의 대사 쓰기에서 대사를 숨깁니다</small>` |
| 위 둘 다 아님 또는 선택된 타이틀 없음 | 영역 숨김 (`.show` 제거) |

---

## 5. 클라이언트 로직

### 5.1 함수 목록 (신규/변경)

| 함수 | 구분 | 역할 |
|---|---|---|
| `loadAppSettings(cb?)` | 신규 | `google.script.run.getAppSettings()` 호출 → `applySettings()` → `cb` |
| `applySettings(s)` | 신규 | 서버 응답(`'1'/'0'`) → `appSettings` 반영 → `syncOfflineCheckVisibility()` |
| `openSettings()` | 신규 | 모달 열기, 현재 값으로 체크박스 채운 뒤 서버 최신값으로 갱신 |
| `closeSettings()` | 신규 | 모달 닫기, 메시지 초기화 |
| `saveSettings()` | 신규 | 체크 상태 → `saveAppSettings` 호출, 저장 버튼 잠금, 성공 시 반영 후 닫기, 실패 시 오류 표시 |
| `syncOfflineCheckVisibility()` | 변경 | 체크박스 제어 → `#modeIndicator` 내용 렌더링 |
| `startChapter()` | 변경 | `offlineMode`, `convMode`를 설정값으로 계산. 설정 버튼 숨김 |
| `buildPhase23()` | 변경 | `convMode && phase===3`이면 숨김 렌더링 |
| `renderCard()` (L1593) | 변경 | Phase 3 + `convMode` 네비게이션 처리 |
| `resetToStart()` | 변경 | `#offlineCheck` 조작 제거, `convMode=false`, 설정 버튼 표시 |
| `renderCard()` (L1062) | 삭제 | 사용되지 않는 중복 정의 |

### 5.2 초기 로딩 (FR-05)

```js
(function init() {
  if (typeof google !== 'undefined' && google.script) {
    google.script.run.withSuccessHandler(onDataLoaded)
      .withFailureHandler(() => onDataLoaded(getDemoData()))
      .getConversationData();
    loadAppSettings();             // 병렬 호출: 데이터 로딩을 지연시키지 않음
  } else {
    onDataLoaded(getDemoData());   // 데모: appSettings 기본값(false, false)
  }
})();

function loadAppSettings(cb) {
  if (typeof google === 'undefined' || !google.script) { cb && cb(); return; }
  google.script.run
    .withSuccessHandler(res => { if (res && res.success) applySettings(res.settings); cb && cb(); })
    .withFailureHandler(() => { cb && cb(); })   // 실패 시 기존 값 유지
    .getAppSettings();
}

function applySettings(s) {
  appSettings.offlineWritingMode = s.offlineWritingMode === '1';
  appSettings.convWritingMode    = s.convWritingMode === '1';
  syncOfflineCheckVisibility();
}
```

### 5.3 설정 팝업 흐름 (FR-02 ~ FR-04)

```
[⚙️ 환경설정] 클릭
   └─ openSettings()
        ├─ 체크박스 ← appSettings (즉시 표시)
        ├─ 모달 .show
        └─ loadAppSettings(() => 체크박스 ← appSettings)  // 다른 사람이 바꾼 값 반영

[설정 저장] 클릭
   └─ saveSettings()
        ├─ btnSaveSettings.disabled = true, 메시지 "저장 중..."
        ├─ google.script.run.saveAppSettings({offlineWritingMode:'1'|'0', convWritingMode:'1'|'0'})
        ├─ 성공(res.success) → applySettings(res.settings) → closeSettings()
        ├─ 실패/res.success=false → settingsMsg.error = "저장에 실패했습니다. 다시 시도해주세요."
        └─ 항상: btnSaveSettings.disabled = false
   (데모 환경: 서버 없음 → appSettings만 바꾸고 닫음, 새로고침 시 초기화)
```

### 5.4 학습 시작 (FR-06, FR-10)

```js
// startChapter() 내부 (기존 L1010~1011 대체)
studyMode   = document.getElementById("modeDropdown")?.value || "all";
offlineMode = studyMode === "filling" && appSettings.offlineWritingMode;
convMode    = studyMode !== "matching" && appSettings.convWritingMode;
document.getElementById('btnSettings').style.display = 'none';
```

- `offlineMode`가 정해진 뒤의 동작(정답 확인 비활성화, 다음 활성화, 이전 비활성화, `showReviewList`에서 복습 생략)은 **기존 코드를 그대로** 쓴다 → FR-06은 "현재와 동일"이 보장된다.

### 5.5 Phase 3 대사 숨김 렌더링 (FR-08)

`buildPhase23(card, dialogues, phase)` 시작 부분에 분기를 추가한다.

```js
if (convMode && phase === 3) {
  const hint = document.createElement('div');
  hint.className = 'conv-hint';
  hint.textContent = '📝 앞에서 쓴 답을 보며 다른 화자의 대사를 종이에 적은 뒤 [다음]을 누르세요';
  card.appendChild(hint);

  const list = document.createElement('div');
  list.className = 'dialogue-list';
  list.id = 'dialogueList';
  dialogues.forEach(d => {
    const row = document.createElement('div');
    row.className = 'dialogue-row';
    const tag = document.createElement('span');
    tag.className = `speaker-tag speaker-${d.speaker}`;
    tag.textContent = d.speaker + ':';
    const blank = document.createElement('div');
    blank.className = 'dialogue-blank';   // 빈 줄 (텍스트, input, placeholder 없음)
    row.appendChild(tag);
    row.appendChild(blank);
    list.appendChild(row);
  });
  card.appendChild(list);

  const fb = document.createElement('div');   // 기존 구조 호환용 (사용 안 함)
  fb.className = 'feedback-area';
  fb.id = 'feedbackArea';
  card.appendChild(fb);
  return;
}
```

```css
.dialogue-blank {
  flex: 1;
  min-height: 1.6em;
  border-bottom: 2px dashed var(--border);
}
.conv-hint {
  margin: 4px 0 10px;
  padding: 10px 12px;
  background: var(--primary-light);
  border-radius: 12px;
  font-size: .82rem; font-weight: 700; color: var(--primary);
}
```

- 대화 틀: 모든 줄의 화자 태그와 줄 수, 순서를 유지한다.
- DOM에 대사 텍스트가 **전혀 들어가지 않는다** (`data-answer` 속성도 없음) → 개발자 도구로도 정답을 볼 수 없다.
- `isSingleSpeaker` 타이틀도 같은 분기를 타므로 Q5를 만족한다.

### 5.6 Phase 3 네비게이션 (FR-09)

L1593 `renderCard()` 일반 카드 nav 부분을 바꾼다.

```js
const skipCheck = offlineMode || (convMode && phase === 3);

// btnCheck
if (skipCheck) { btnCheck.disabled = true; btnCheck.style.opacity = '0.35'; btnCheck.style.cursor = 'not-allowed'; }
else           { btnCheck.onclick = () => checkAnswer(phase, dialogues); }

// btnNext
btnNext.disabled = !skipCheck;
```

- 이전 버튼: 기존 규칙(`offlineMode || cardCursor===0 || 이전 카드가 retry/writing`)을 유지한다.
  - `convMode`만 켜진 경우 Phase 3에서 이전(Phase 2)으로 돌아갈 수 있다. Phase 2에는 Phase 3의 정답(다른 화자 대사)이 보이지만, Phase 2는 원래 그 대사가 보이는 화면이므로 새로운 부정행위 경로가 아니다. → 허용.
- retry 행(`#retryRow`)은 정답 확인을 해야만 나타나므로 숨김 상태로 남는다.
- `titleStats[title].attempts`는 정답 확인 성공 시에만 증가하므로 Phase 3 건너뛰기는 통계에 영향을 주지 않는다.
- 복습 모드(`startRetryTitle`)에서 만드는 Phase 3 카드도 `convMode`가 세션 동안 유지되므로 같은 규칙이 적용된다.

### 5.7 처음 화면 복귀 (FR-10)

```js
// resetToStart()
offlineMode = false;
convMode = false;
// 삭제: const oc = document.getElementById('offlineCheck'); if (oc) oc.checked = false;
document.getElementById('btnSettings').style.display = '';
```

- `appSettings`는 건드리지 않는다 → 다음 학습에도 설정이 유지된다.
- `hideTitleChecklist()` → `updateStartBtn()` → `syncOfflineCheckVisibility()` 흐름으로 표시 영역이 다시 계산된다.

### 5.8 `syncOfflineCheckVisibility()` (FR-07)

```js
function syncOfflineCheckVisibility() {
  const mode = document.getElementById('modeDropdown')?.value || 'all';
  const anyChecked = [...document.querySelectorAll('#titleCheckList input[type=checkbox]')].some(cb => cb.checked);
  const wrap = document.getElementById('offlineCheckWrap');
  const box  = document.getElementById('modeIndicator');
  if (!wrap || !box) return;

  const items = [];
  if (appSettings.offlineWritingMode && mode === 'filling')
    items.push('🖊️ 오프라인 쓰기모드<small>정답 확인 없이 다음으로 진행 · 복습 생략</small>');
  if (appSettings.convWritingMode && mode !== 'matching')
    items.push('👤 한 화자만 보기<small>다른 화자의 대사 쓰기에서 대사를 숨깁니다</small>');

  box.innerHTML = items.map(t => `<div>${t}</div>`).join('');
  wrap.classList.toggle('show', anyChecked && items.length > 0);
}
```

- 학습 방식 드롭다운 `change` 이벤트는 이미 이 함수에 연결되어 있다 (L864) → 추가 작업 없음.

---

## 6. 상태 조합별 동작표

| offlineWritingMode | convWritingMode | 학습 방식 | Phase 2 | Phase 3 | 종료 후 |
|:-:|:-:|---|---|---|---|
| 0 | 0 | 모두 | 기존 | 기존 | 기존 (복습/최종) |
| 1 | 0 | 대화채우기만 | 확인 없이 다음 | 확인 없이 다음 (대사 표시) | 처음 화면 |
| 1 | 0 | 전체/순서맞추기 | 기존 | 기존 | 기존 |
| 0 | 1 | 전체/대화채우기만 | 기존 (정답 확인) | **대사 숨김**, 확인 없이 다음 | 기존 (복습/최종) |
| 1 | 1 | 대화채우기만 | 확인 없이 다음 | **대사 숨김**, 확인 없이 다음 | 처음 화면 |
| 1 | 1 | 전체 | 기존 | **대사 숨김**, 확인 없이 다음 | 기존 |
| * | * | 순서맞추기만 | – | – | 기존 |

쓰기 시험(W) 카드는 모든 조합에서 기존과 같다.

---

## 7. 구현 순서

1. [ ] `Code.js`: `SETTING_KEYS`, `getAppSettings()`, `saveAppSettings()` 추가
2. [ ] `index.html` CSS: `.btn-settings`, 모달, `.mode-indicator`, `.dialogue-blank`, `.conv-hint` 추가 / offline 체크박스 CSS 정리
3. [ ] `index.html` 마크업: 헤더 버튼, 모달, `#offlineCheckWrap` 내부 교체
4. [ ] STATE: `appSettings`, `convMode` 추가
5. [ ] 설정 함수: `loadAppSettings`, `applySettings`, `openSettings`, `closeSettings`, `saveSettings`, Esc 핸들러
6. [ ] `init()`에 `loadAppSettings()` 병렬 호출
7. [ ] `syncOfflineCheckVisibility()` 재작성 (드롭다운 change 연결은 기존 L864 사용)
8. [ ] `startChapter()`, `resetToStart()` 수정
9. [ ] `buildPhase23()` 숨김 분기, `renderCard()`(L1593) nav 수정
10. [ ] 사용되지 않는 `renderCard()`(L1062) 삭제
11. [ ] 로컬(데모 데이터)로 확인 → `clasp push` → 웹앱에서 6장 동작표 확인

---

## 8. 테스트 시나리오

| # | 시나리오 | 기대 결과 |
|---|---|---|
| T1 | 설정 (0,0), 전 학습 방식 | 기존과 완전히 같음 |
| T2 | 설정 팝업 열기 | 저장된 값이 체크되어 있음 |
| T3 | 체크 변경 후 저장 → 새로고침 | 값 유지, 표시 영역 갱신 |
| T4 | 저장 실패 (네트워크 끊김) | 팝업 유지, 오류 메시지 표시 |
| T5 | (1,0) + 대화채우기만 | 확인 비활성, 다음 즉시 가능, 이전 비활성, 끝나면 처음 화면 |
| T6 | (0,1) + 전체 | Phase 1·2 정상, Phase 3 대사/입력창 없음, 다음 즉시 가능 |
| T7 | (1,1) + 대화채우기만 | Phase 2 확인 없이 진행, Phase 3 숨김, 끝나면 처음 화면 |
| T8 | 한 화자 타이틀 + (0,1) | Phase 3 모든 줄 숨김 |
| T9 | Phase 3 숨김 화면에서 개발자 도구 | DOM에 대사 텍스트 없음 |
| T10 | 학습 중 다른 탭에서 설정 변경 | 진행 중 세션은 시작 시점 설정 유지 |
| T11 | 카드/복습 화면 | 환경설정 버튼 숨김. 처음 화면 복귀 시 다시 보임 |
| T12 | 모바일 폭 360px | 헤더 버튼, 모달이 깨지지 않음 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-11-04 | Initial draft (Plan Q1~Q5 기본 제안으로 확정) | msea200 |
