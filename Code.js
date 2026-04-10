// code.gs

const SHEET_ID = '1IHCh8h0-EjMbRAPnTYspTO__GSwkDGtGzdpbW218nkM';
const SHEET_NAME = 'conversation';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('English Dialogue Memorization App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');  // ← 핵심;
}

function getConversationData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    const headers = data[0]; // chapter, title, speaker, lines, exceptions
    const rows = data.slice(1);
    
    // Group by chapter > title, preserving insertion order
    const chapters = {};
    const chapterTitleOrder = {}; // { chapter: [title, ...] } in sheet order
    
    rows.forEach(row => {
      const chapter = row[0];
      const title = row[1];
      const speaker = row[2];
      const lines = row[3];
      const exceptions = row[4] || '';
      
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
        exceptions: exceptions
      });
    });
    
    return { success: true, data: chapters, titleOrder: chapterTitleOrder };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}