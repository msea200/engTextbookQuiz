# Plan: 쓰기 시험 모드 (Writing Test Mode)

## 1. 기능 개요

영어 대화 암기 앱에 **쓰기 시험 모드**를 추가한다.

Google Sheets `conversation` 시트의 `speaker` 열 값이 `"W"`이고, 동시에 `ko` 열에 한글 해석 데이터가 존재하는 title에 대해, 한글 문장을 보고 오프라인으로 영어 문장을 직접 쓸 수 있는 별도 카드 학습 흐름을 제공한다.

---

## 2. 배경 및 목적

- 기존 앱은 영어 대화를 순서 맞추기(Phase 1)와 대화 채우기(Phase 2/3)로 학습함
- 일부 title의 경우, 한글 해석을 보고 영어 문장을 통째로 쓰는 "쓰기 연습"이 필요한 경우가 있음
- 이를 위해 별도의 "쓰기 시험 모드" 카드 흐름을 추가함
- 기존 방식의 로직을 전혀 수정하지 않으면서 새 모드를 병행 제공함

---

## 3. 트리거 조건

Google Sheets `conversation` 시트 기준:

| 조건 | 값 |
|---|---|
| `speaker` 열 | `"W"` |
| `ko` 열 | 비어 있지 않음 (한글 해석 존재) |

위 두 조건을 동시에 만족하는 행이 속한 **title**이 쓰기 시험 모드 대상이 된다.

---

## 4. 데이터 구조 변경 (Code.js)

### 현재 시트 컬럼 구조

| 인덱스 | 0 | 1 | 2 | 3 | 4 |
|--------|---------|-------|---------|-------|------------|
| 열 이름 | chapter | title | speaker | lines | exceptions |

### 변경 후 컬럼 구조

| 인덱스 | 0 | 1 | 2 | 3 | 4 | 5 |
|--------|---------|-------|---------|-------|------------|-----|
| 열 이름 | chapter | title | speaker | lines | exceptions | ko |

### Code.js 반환 데이터 변경

각 dialogue 객체에 `ko` 필드 추가:

```js
// 기존
{ speaker, lines, exceptions }

// 변경 후
{ speaker, lines, exceptions, ko }
```

`getConversationData()` 반환값 변경:

```js
{
  success: true,
  data: chapters,               // 기존 그대로 (W 행 포함 전체 데이터)
  titleOrder: chapterTitleOrder, // 기존 그대로
  writingData: {                 // 신규: speaker="W" + ko 있는 행만 추출
    "CH1": {
      "Communicate A": ["한글 문장1", "한글 문장2", ...]
    }
  }
}
```

> `data` 구조는 변경하지 않음. 클라이언트(index.html)에서 W 타이틀과 일반 타이틀을 구분하여 처리.
```

---

## 5. 기능 요구사항

### 5-1. 쓰기 시험 카드 (Writing Test Card)

- 쓰기 시험 대상 title에 대해 **title 당 1개의 카드**를 생성
- 카드 내용: 해당 title의 모든 한글 문장을 **순서대로** 나열하여 제시
- **다음 버튼만** 활성화 (이전 버튼 비활성, 정답 확인 버튼 없음)
- 오프라인 쓰기 모드와 동일한 "다음으로만 진행" 방식

### 5-2. 리뷰 제외

- `speaker = "W"`인 title은 **복습 리스트(retrySet)에 추가되지 않음**
- 해당 title은 최종 리뷰(finalReview) 통계에서도 제외

### 5-3. 진행 순서 선택 (사용자 선택)

학습 시작 전 선택 화면에서 쓰기 시험 순서를 선택:

| 옵션 | 설명 |
|------|------|
| 쓰기 시험 없음 | 기존 방식만 진행 |
| 기존 방식 → 쓰기 시험 | 기존 학습 완료 후 쓰기 시험 진행 |
| 쓰기 시험 → 기존 방식 | 쓰기 시험 먼저 진행 후 기존 학습 진행 |

> 쓰기 시험 대상 title이 없는 챕터/선택에서는 해당 UI를 표시하지 않음

### 5-4. 기존 방식 무수정 원칙

- Phase 1 (순서 맞추기), Phase 2/3 (대화 채우기) 로직 변경 없음
- `offlineMode`, `retrySet`, `retryMode`, `studyMode` 등 기존 상태 변수 변경 없음
- 기존 `buildCardSequence()` 함수 변경 없음
- `speaker = "W"` 타이틀은 `buildCardSequence()` 대상에서 **제외** → Phase 1/2/3 카드 미생성
- 기존 방식 대상 타이틀: `speaker ≠ "W"` (B/G/A 화자만 있는 타이틀)

---

## 6. UI 변경

### 6-1. 학습 선택 화면 추가 요소

```
[ 쓰기 시험 순서 선택 ]
○ 쓰기 시험 없음
○ 기존 방식 → 쓰기 시험 (기본)
○ 쓰기 시험 → 기존 방식
```

- 선택한 챕터/title 중 쓰기 시험 대상이 존재할 때만 표시
- 기본값: "기존 방식 → 쓰기 시험"

### 6-2. 쓰기 시험 카드 UI

```
[ CH1 ]               ← chapter badge
Communicate A          ← title
✏️ 쓰기 시험 (1/N)    ← phase label (N = 쓰기 시험 카드 수)

한글 문장 목록:
  1. 걱정돼 보여, 사라. 무슨 일이야?
  2. 내 강아지가 계속 긁어.
  3. ...

                          [ 다음 ▶ ]
```

---

## 7. 상태 변수 (신규 추가)

| 변수명 | 타입 | 설명 |
|--------|------|------|
| `writingMode` | `string` | `"none"` \| `"after"` \| `"before"` |
| `writingSequence` | `Array` | `[{ title, type:'writing' }]` |
| `writingCursor` | `number` | 현재 쓰기 시험 카드 인덱스 |
| `allWritingData` | `Object` | `{ chapter: { title: [ko,...] } }` |
| `writingTitlesInChapter` | `Array` | 현재 챕터의 쓰기 시험 대상 title 목록 |
| `inWritingPhase` | `boolean` | 현재 쓰기 시험 구간 진행 중 여부 |

---

## 8. 전체 세션 흐름

> 대상 구분
> - **일반 타이틀**: speaker ∈ {B, G, A} → Phase 1/2/3 정상 진행
> - **W 타이틀**: speaker = "W" + ko 있음 → 쓰기 시험 카드만 진행

### "기존 방식 → 쓰기 시험" 선택 시

```
[일반 타이틀 Phase 1/2/3] → [복습 리스트] → [최종 리뷰] → [W 타이틀 쓰기 시험 카드] → [세션 종료]
```

### "쓰기 시험 → 기존 방식" 선택 시

```
[W 타이틀 쓰기 시험 카드] → [일반 타이틀 Phase 1/2/3] → [복습 리스트] → [최종 리뷰] → [세션 종료]
```

### "쓰기 시험 없음" 선택 시

```
[일반 타이틀 Phase 1/2/3] → [복습 리스트] → [최종 리뷰] → [세션 종료]
```
(W 타이틀은 이 경우 세션에서 완전히 제외)

---

## 9. 구현 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `Code.js` | `speaker`, `ko` 컬럼 읽기 + `writingData` 반환 추가 |
| `index.html` | UI 추가 (쓰기 시험 순서 선택), 쓰기 시험 카드 렌더링, 세션 흐름 분기 |

---

## 10. 제약 조건 / 비기능 요구사항

- 기존 Phase 1/2/3 코드 무수정
- 기존 `offlineMode` 로직과 독립적으로 동작
- `speaker = "W"` 타이틀은 Phase 1/2/3 **미적용** — 쓰기 시험 카드로만 처리
- `speaker ≠ "W"` 타이틀(B/G/A 화자)은 기존 방식 그대로 적용
- 데모 데이터(`getDemoData()`)에도 쓰기 시험 샘플 데이터 추가 (테스트 용도)

---

## 11. 완료 기준

- [ ] `speaker = "W"` + `ko` 데이터 존재 시 쓰기 시험 카드 생성
- [ ] W 타이틀은 Phase 1/2/3(`buildCardSequence()`) 대상에서 제외됨
- [ ] 카드당 한글 문장 목록 표시, "다음" 버튼만 활성화 (이전·정답확인 없음)
- [ ] 쓰기 시험 순서 선택 UI 표시 (W 타이틀 없는 챕터/선택 시 숨김)
- [ ] speaker="W" 타이틀 → 복습 리스트(retrySet) 추가 안 됨
- [ ] 일반 타이틀(B/G/A) Phase 1/2/3 동작 무변경 확인
- [ ] 데모 데이터(`getDemoData()`)에서 쓰기 시험 카드 정상 동작 확인
- [ ] 마지막 쓰기 시험 카드에 "정답보기" 버튼 표시됨
- [ ] "정답보기" 진입 시 title별 카드가 순서대로 표시됨
- [ ] 각 정답보기 카드에 한글(문제)+영어(정답) 쌍이 모두 표시됨
- [ ] "다음" 버튼으로 다음 title 카드로 이동됨
- [ ] 마지막 정답보기 카드의 "완료" 버튼 → 초기화면으로 이동됨

---

## 12. 정답보기 기능 (신규)

> 쓰기 시험을 모두 완료한 후, 각 title의 한글 문제와 영어 정답을 함께 검토할 수 있는 흐름을 추가한다.

### 12-1. 마지막 쓰기시험 카드 — "정답보기" 버튼 추가

- `cardSequence` 내 `type === 'writing'` 카드 중 **가장 마지막 인덱스** 카드에 버튼 추가
- 기존 "완료 ✓" 버튼 **옆에** "정답보기" 버튼 나란히 배치
- "완료 ✓" 클릭 → 기존 흐름 유지 (`goNext()` → `showReviewList()` or `resetToStart()`)
- "정답보기" 클릭 → `startAnswerReview()` 호출

> 마지막 쓰기시험 카드 판별:
> ```js
> const isLastWritingCard = type === 'writing'
>   && !cardSequence.slice(cardCursor + 1).some(c => c.type === 'writing');
> ```

### 12-2. 정답보기 카드 (Answer Review Card)

- 세션에서 진행한 쓰기시험 title 목록을 순서대로, **title당 1개** 카드 생성
- 각 카드 내용:
  - 카드 헤더 배지: `✏️ 정답보기`
  - title 이름
  - 각 문장을 **한글(문제)** + **영어(정답)** 쌍으로 나열

  ```
  1. 사라, 걱정돼 보여. 무슨 일이야?
     → Sarah, you look worried. What's wrong?

  2. 내 강아지가 계속 긁어.
     → My dog keeps scratching himself.
  ```

- **"다음 ▶"** 버튼만 활성화 (이전 버튼 없음)
- 마지막 카드: "다음" 대신 **"완료 ✓"** 표시
- "완료 ✓" 클릭 → `resetToStart()` (초기화면으로)

### 12-3. 데이터 소스

| 항목 | 출처 |
|------|------|
| 한글 문장 (문제) | `allWritingData[currentChapter][title][i]` |
| 영어 문장 (정답) | `allData[currentChapter][title]`에서 `speaker === 'W'`인 항목의 `lines` |

> `allData[chapter][title]`의 배열 순서 = `allWritingData[chapter][title]`의 순서가 동일하므로 index로 매핑 가능.

### 12-4. 신규 상태 변수

| 변수명 | 타입 | 설명 |
|--------|------|------|
| `answerReviewActive` | `boolean` | 정답보기 모드 진행 중 여부 |
| `answerReviewTitles` | `Array<string>` | 정답보기 대상 title 목록 (세션 내 W 타이틀 순서) |
| `answerReviewCursor` | `number` | 현재 정답보기 카드 인덱스 |

### 12-5. CSS 추가 요소

| 클래스 | 역할 |
|--------|------|
| `.answer-review-header` | `✏️ 정답보기` 배지 |
| `.answer-review-pair` | 한글+영어 쌍 컨테이너 |
| `.answer-review-ko` | 한글 문장 (문제) 스타일 |
| `.answer-review-en` | 영어 문장 (정답) 스타일 |

### 12-6. 신규 함수

| 함수 | 역할 |
|------|------|
| `startAnswerReview()` | 정답보기 모드 시작 — `answerReviewTitles` 수집, cursor=0, 카드 렌더 |
| `renderAnswerReviewCard()` | 현재 `answerReviewCursor` 위치의 정답보기 카드 렌더링 |
| `goAnswerReviewNext()` | `answerReviewCursor++` 후 다음 카드 렌더 (또는 완료 시 `resetToStart()`) |

### 12-7. 수정 함수

| 함수 | 변경 내용 |
|------|-----------|
| `renderCard()` | 쓰기시험 섹션 — `isLastWritingCard` 판별 후 "정답보기" 버튼 조건부 추가 |
| `resetToStart()` | `answerReviewActive`, `answerReviewTitles`, `answerReviewCursor` 초기화 추가 |
