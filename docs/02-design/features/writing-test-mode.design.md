# Design: 쓰기 시험 모드 (Writing Test Mode)

> Plan: `docs/01-plan/features/writing-test-mode.plan.md`

---

## 1. 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `Code.js` | 수정 | `ko` 컬럼 읽기 + `writingData` 반환 |
| `index.html` | 수정 | CSS 추가, HTML UI 추가, JS 함수 추가/수정 |

---

## 2. Code.js 변경 설계

### 2-1. 컬럼 인덱스 추가

```js
// getConversationData() 내부
const chapter    = row[0];
const title      = row[1];
const speaker    = row[2];
const lines      = row[3];
const exceptions = row[4] || '';
const ko         = row[5] || '';  // 신규 추가
```

### 2-2. dialogue 객체 ko 필드 추가

```js
// 기존
chapters[chapter][title].push({ speaker, lines, exceptions });

// 변경 후
chapters[chapter][title].push({ speaker, lines, exceptions, ko });
```

### 2-3. writingData 추출 로직

`forEach` 루프 내에서, `speaker === 'W'` && `ko`가 비어 있지 않은 행만 별도 수집:

```js
// getConversationData() 최상단에 선언
const writingData = {};  // { chapter: { title: [ko, ...] } }

// forEach 루프 내 추가
if (speaker === 'W' && ko) {
  if (!writingData[chapter]) writingData[chapter] = {};
  if (!writingData[chapter][title]) writingData[chapter][title] = [];
  writingData[chapter][title].push(ko);
}
```

### 2-4. 반환값 변경

```js
return {
  success: true,
  data: chapters,             // 기존 그대로 (W 행 포함)
  titleOrder: chapterTitleOrder, // 기존 그대로
  writingData                    // 신규 추가
};
```

---

## 3. index.html — CSS 추가 설계

`</style>` 직전에 아래 블록 추가.

### 3-1. 쓰기 시험 순서 선택 UI

```css
/* ── WRITING MODE SELECT ── */
.writing-mode-wrap {
  width: 100%;
  display: none;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 13px;
}
.writing-mode-wrap.show { display: flex; }
.writing-mode-label {
  font-size: .82rem;
  font-weight: 800;
  color: #166534;
  letter-spacing: .3px;
  text-transform: uppercase;
}
.writing-radio-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: .88rem;
  font-weight: 700;
  color: #166534;
  cursor: pointer;
  line-height: 1.4;
}
.writing-radio-item input[type=radio] {
  width: 16px; height: 16px;
  accent-color: #16a34a;
  flex-shrink: 0;
  cursor: pointer;
}
```

### 3-2. 쓰기 시험 카드

```css
/* ── WRITING TEST CARD ── */
.writing-card-header {
  display: inline-block;
  background: #f0fdf4;
  color: #16a34a;
  font-size: .75rem;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 99px;
  margin-bottom: 10px;
  letter-spacing: .4px;
  border: 1.5px solid #86efac;
}
.writing-ko-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
.writing-ko-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 14px;
}
.writing-ko-num {
  font-size: .85rem;
  font-weight: 900;
  color: #16a34a;
  min-width: 22px;
  flex-shrink: 0;
}
.writing-ko-text {
  font-size: .95rem;
  font-weight: 700;
  color: #14532d;
  line-height: 1.6;
}
```

---

## 4. index.html — HTML 추가 설계

`#offlineCheckWrap` 직후 (`<button class="btn-start"...>` 직전)에 삽입:

```html
<!-- WRITING MODE SELECT -->
<div class="writing-mode-wrap" id="writingModeWrap">
  <span class="writing-mode-label">✏️ 쓰기 시험 순서</span>
  <label class="writing-radio-item">
    <input type="radio" name="writingMode" value="none" checked>
    <span>쓰기 시험 없음</span>
  </label>
  <label class="writing-radio-item">
    <input type="radio" name="writingMode" value="after">
    <span>기존 방식 → 쓰기 시험</span>
  </label>
  <label class="writing-radio-item">
    <input type="radio" name="writingMode" value="before">
    <span>쓰기 시험 → 기존 방식</span>
  </label>
</div>
```

표시 조건: 선택된 title 중 하나 이상이 `writingData` 에 존재할 때만 `.show` 클래스 부여.

---

## 5. index.html — JS 변경 설계

### 5-1. 신규 상태 변수 (STATE 섹션 하단에 추가)

```js
// ── WRITING TEST STATE ──
let writingMode = 'none';         // 'none' | 'after' | 'before'
let allWritingData = {};          // { chapter: { title: [ko, ...] } }
let writingTitlesInSession = [];  // 현재 세션의 W 타이틀 목록
let writingSequence = [];         // [{ title }]
let writingCursor = 0;
let inWritingPhase = false;
```

### 5-2. `onDataLoaded()` 수정

```js
function onDataLoaded(result) {
  const data = result.success ? result.data : result;
  allData = data;
  allTitleOrder = result.titleOrder || {};
  allWritingData = result.writingData || {};  // ← 추가
  // ... 이하 기존 코드 그대로 ...
}
```

### 5-3. 신규 함수 `syncWritingModeVisibility()`

`updateStartBtn()` 끝에서 호출.

```js
function syncWritingModeVisibility() {
  const ch = document.getElementById('chapterDropdown').value;
  const checkedTitles = [...document.querySelectorAll('#titleCheckList input[type=checkbox]')]
    .filter(cb => cb.checked).map(cb => cb.value);

  const hasWriting = ch && checkedTitles.some(t =>
    allWritingData[ch] && allWritingData[ch][t] && allWritingData[ch][t].length > 0
  );

  const wrap = document.getElementById('writingModeWrap');
  if (wrap) {
    wrap.classList.toggle('show', hasWriting);
    if (!hasWriting) {
      // 대상 없으면 'none' 으로 초기화
      const noneRadio = document.querySelector('input[name="writingMode"][value="none"]');
      if (noneRadio) noneRadio.checked = true;
    }
  }
}
```

### 5-4. `updateStartBtn()` 수정

기존 함수 마지막 줄에 호출 추가:

```js
function updateStartBtn() {
  // ... 기존 코드 그대로 ...
  syncOfflineCheckVisibility();
  syncWritingModeVisibility();  // ← 추가
}
```

### 5-5. `startChapter()` 수정

`titles` 배열 확정 직후, `buildCardSequence()` 호출 전에 아래 블록 삽입:

```js
// ── Writing Test 초기화 (신규) ──
writingMode = document.querySelector('input[name="writingMode"]:checked')?.value || 'none';

writingTitlesInSession = titles.filter(t =>
  allWritingData[currentChapter]?.[t]?.length > 0
);
// W 타이틀을 일반 시퀀스에서 제외
const regularTitles = titles.filter(t => !writingTitlesInSession.includes(t));

writingSequence = writingTitlesInSession.map(t => ({ title: t }));
writingCursor = 0;
inWritingPhase = false;
// ─────────────────────────────────

// buildCardSequence 호출 시 W 타이틀 제외된 regularTitles 사용
buildCardSequence(regularTitles);  // 기존 함수 시그니처 변경 없음
cardCursor = 0;

// ... 화면 전환 코드 ...

// 시작 분기
if (writingMode === 'before' && writingSequence.length > 0) {
  inWritingPhase = true;
  renderWritingCard();
} else {
  renderCard();  // 기존 함수 그대로
}
```

> `buildCardSequence()` 함수 자체는 수정하지 않음 — 인자로 넘기는 배열만 변경.

### 5-6. 신규 함수 `updateWritingProgress()`

```js
function updateWritingProgress() {
  const total = writingSequence.length;
  const pct = total ? Math.round((writingCursor / total) * 100) : 0;
  const title = writingSequence[writingCursor]?.title || '';
  document.getElementById('progressLabel').textContent =
    `✏️ 쓰기 시험 — ${title} (${writingCursor + 1}/${total})`;
  document.getElementById('progressPct').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
}
```

### 5-7. 신규 함수 `renderWritingCard()`

```js
function renderWritingCard() {
  if (writingCursor >= writingSequence.length) {
    endWritingPhase();
    return;
  }

  updateWritingProgress();

  const { title } = writingSequence[writingCursor];
  const koList = allWritingData[currentChapter][title];
  const isLast = writingCursor === writingSequence.length - 1;

  const area = document.getElementById('cardArea');
  area.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <div class="writing-card-header">✏️ 쓰기 시험</div>
    <div class="card-title">${title}</div>
    <div class="card-phase">한글을 보고 영어 문장을 써보세요
      (${writingCursor + 1}/${writingSequence.length})</div>
  `;

  const list = document.createElement('div');
  list.className = 'writing-ko-list';
  koList.forEach((ko, i) => {
    const item = document.createElement('div');
    item.className = 'writing-ko-item';
    item.innerHTML = `
      <span class="writing-ko-num">${i + 1}.</span>
      <span class="writing-ko-text">${ko}</span>
    `;
    list.appendChild(item);
  });
  card.appendChild(list);

  // 다음 버튼만 (이전·정답확인 없음)
  const navRow = document.createElement('div');
  navRow.className = 'nav-row';
  const btnNext = document.createElement('button');
  btnNext.className = 'btn-nav btn-next';
  btnNext.textContent = isLast ? '완료 ✓' : '다음 ▶';
  btnNext.onclick = goWritingNext;
  navRow.appendChild(btnNext);
  card.appendChild(navRow);

  area.appendChild(card);
}
```

### 5-8. 신규 함수 `goWritingNext()`

```js
function goWritingNext() {
  writingCursor++;
  renderWritingCard();
}
```

### 5-9. 신규 함수 `startWritingPhase()`

`showFinalReview()`에서 "쓰기 시험 시작" 버튼 클릭 시 호출.

```js
function startWritingPhase() {
  writingCursor = 0;
  inWritingPhase = true;
  document.getElementById('finalReviewScreen').style.display = 'none';
  document.getElementById('cardArea').style.display = 'block';
  document.getElementById('progressArea').style.display = 'block';
  renderWritingCard();
}
```

### 5-10. 신규 함수 `endWritingPhase()`

```js
function endWritingPhase() {
  inWritingPhase = false;
  document.getElementById('cardArea').style.display = 'none';
  document.getElementById('progressArea').style.display = 'none';

  if (writingMode === 'before') {
    // 쓰기 시험 완료 → 일반 카드 시퀀스 시작
    cardCursor = 0;
    document.getElementById('cardArea').style.display = 'block';
    document.getElementById('progressArea').style.display = 'block';
    renderCard();
  } else {
    // writingMode === 'after': 모든 학습 완료 → 처음으로
    resetToStart();
  }
}
```

### 5-11. `showFinalReview()` 수정

기존 함수 내 `btn-restart` 버튼 생성 코드 **앞에** 삽입:

```js
// 쓰기 시험 시작 버튼 (writingMode==='after' 이고 대상 있을 때)
if (writingMode === 'after' && writingSequence.length > 0) {
  const btnWriting = document.createElement('button');
  btnWriting.className = 'btn-restart';
  btnWriting.style.cssText = 'background:#16a34a;box-shadow:0 4px 16px rgba(22,163,74,.35);';
  btnWriting.textContent = '✏️ 쓰기 시험 시작 ▶';
  btnWriting.onclick = startWritingPhase;
  screen.appendChild(btnWriting);
}
```

> 기존 `btn-restart` ("처음부터 다시 시작") 버튼은 그대로 유지.

### 5-12. `resetToStart()` 수정

기존 상태 초기화 블록 끝에 추가:

```js
// Writing Test 초기화
writingMode = 'none';
writingTitlesInSession = [];
writingSequence = [];
writingCursor = 0;
inWritingPhase = false;

// Writing UI 초기화
const wNone = document.querySelector('input[name="writingMode"][value="none"]');
if (wNone) wNone.checked = true;
const wWrap = document.getElementById('writingModeWrap');
if (wWrap) wWrap.classList.remove('show');
```

> `allWritingData`는 세션 전반에 걸쳐 유지되므로 초기화하지 않음.

### 5-13. `getDemoData()` 수정

"Talk to Play" 타이틀을 W 화자로 변경하고 `writingData` 추가:

```js
// "Talk to Play" 변경 (기존 A/B speaker → W speaker)
"Talk to Play": [
  { speaker:"W", lines:"I'm so nervous.", exceptions:"",
    ko:"나는 너무 긴장돼." },
  { speaker:"W", lines:"You should take a deep breath. I hope you feel calmer soon.", exceptions:"",
    ko:"깊게 숨을 쉬어봐. 곧 진정될 거야." },
  { speaker:"W", lines:"Okay, I will. Thanks.", exceptions:"",
    ko:"알겠어, 그럴게. 고마워." }
]

// writingData 추가 (반환 객체에)
writingData: {
  "CH1": {
    "Talk to Play": [
      "나는 너무 긴장돼.",
      "깊게 숨을 쉬어봐. 곧 진정될 거야.",
      "알겠어, 그럴게. 고마워."
    ]
  }
}
```

---

## 6. 세션 흐름 분기 다이어그램

```
startChapter()
    │
    ├── writingMode = 'before' && writingSequence.length > 0
    │       │
    │       └─► renderWritingCard()
    │               │ (goWritingNext × n)
    │               └─► endWritingPhase()
    │                       │
    │                       └─► renderCard() ──► showReviewList() ──► showFinalReview()
    │                                                                       │
    │                                                                       └─► resetToStart()
    │
    ├── writingMode = 'after' || writingMode = 'none'
    │       │
    │       └─► renderCard() ──► showReviewList() ──► showFinalReview()
    │                                                       │
    │                            writingMode='after'        ├─► [✏️ 쓰기 시험 시작 ▶] 버튼
    │                                                       │       │
    │                                                       │       └─► startWritingPhase()
    │                                                       │               │ (goWritingNext × n)
    │                                                       │               └─► endWritingPhase()
    │                                                       │                       │
    │                                                       │                       └─► resetToStart()
    │                            writingMode='none'         └─► [처음부터 다시 시작] 버튼
    │
```

---

## 7. 구현 순서 (Do Phase 체크리스트)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `Code.js` | `ko` 컬럼 읽기 (row[5]) |
| 2 | `Code.js` | `writingData` 추출 로직 추가 |
| 3 | `Code.js` | 반환값에 `writingData` 추가 |
| 4 | `index.html` CSS | `.writing-mode-wrap`, `.writing-radio-item` 스타일 추가 |
| 5 | `index.html` CSS | `.writing-card-header`, `.writing-ko-*` 스타일 추가 |
| 6 | `index.html` HTML | `#writingModeWrap` div 삽입 |
| 7 | `index.html` JS | 상태 변수 6개 추가 |
| 8 | `index.html` JS | `onDataLoaded()` — `allWritingData` 저장 |
| 9 | `index.html` JS | `syncWritingModeVisibility()` 신규 |
| 10 | `index.html` JS | `updateStartBtn()` — `syncWritingModeVisibility()` 호출 추가 |
| 11 | `index.html` JS | `startChapter()` — 타이틀 분류 + 시작 분기 |
| 12 | `index.html` JS | `updateWritingProgress()` 신규 |
| 13 | `index.html` JS | `renderWritingCard()` 신규 |
| 14 | `index.html` JS | `goWritingNext()` 신규 |
| 15 | `index.html` JS | `startWritingPhase()` 신규 |
| 16 | `index.html` JS | `endWritingPhase()` 신규 |
| 17 | `index.html` JS | `showFinalReview()` — "쓰기 시험 시작" 버튼 추가 |
| 18 | `index.html` JS | `resetToStart()` — 신규 상태 초기화 추가 |
| 19 | `index.html` JS | `getDemoData()` — W 타이틀 + `writingData` 추가 |

---

## 8. 기존 함수 수정 금지 목록

아래 함수들은 **내부 로직을 변경하지 않음**:

| 함수 | 이유 |
|------|------|
| `buildCardSequence()` | 인자로 받은 배열만 처리, 내부 로직 무변경 |
| `checkPhase1()` | Phase 1 로직 그대로 |
| `checkPhase23()` | Phase 2/3 로직 그대로 |
| `buildPhase1()` | Phase 1 렌더 그대로 |
| `buildPhase23()` | Phase 2/3 렌더 그대로 |
| `showReviewList()` | 리뷰 로직 그대로 (W 타이틀은 retrySet에 애초에 추가 안 됨) |
| `goNext()` / `goPrev()` | 기존 내비게이션 그대로 |

> `showReviewList()`가 건드려지지 않아도 되는 이유: W 타이틀은 `buildCardSequence()`에 포함되지 않으므로 `titleStats`에 등록되지 않고, retrySet에도 추가될 수 없음.
