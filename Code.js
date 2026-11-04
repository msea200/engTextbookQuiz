// code.gs

const SHEET_ID = '1IHCh8h0-EjMbRAPnTYspTO__GSwkDGtGzdpbW218nkM';
const SHEET_NAME = 'conversation';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('English Dialogue Memorization App v2.1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');  // ← 핵심;
}

function getConversationData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();

    const headers = data[0]; // chapter, title, speaker, lines, exceptions, ko
    const rows = data.slice(1);

    // Group by chapter > title, preserving insertion order
    const chapters = {};
    const chapterTitleOrder = {}; // { chapter: [title, ...] } in sheet order
    const writingData = {};        // { chapter: { title: [ko, ...] } }

    rows.forEach(row => {
      const chapter    = row[0];
      const title      = row[1];
      const speaker    = row[2];
      const lines      = row[3];
      const exceptions = row[4] || '';
      const ko         = row[5] || '';  // 한글 해석

      if (!chapter || !title || !lines) return;

      if (!chapters[chapter]) {
        chapters[chapter] = {};
        chapterTitleOrder[chapter] = [];
      }
      if (!chapters[chapter][title]) {
        chapters[chapter][title] = [];
        chapterTitleOrder[chapter].push(title);
      }

      chapters[chapter][title].push({
        speaker: speaker,
        lines: lines,
        exceptions: exceptions,
        ko: ko
      });

      // 쓰기 시험 대상: speaker="W" + ko 존재
      if (speaker === 'W' && ko) {
        if (!writingData[chapter]) writingData[chapter] = {};
        if (!writingData[chapter][title]) writingData[chapter][title] = [];
        writingData[chapter][title].push(ko);
      }
    });

    return { success: true, data: chapters, titleOrder: chapterTitleOrder, writingData: writingData };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ── APP SETTINGS (스크립트 속성) ──
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
