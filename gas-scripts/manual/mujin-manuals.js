const SPREADSHEET_ID = '1zuGQT9ODtyn7Qsjqc3R8R-QnDKZKgpfjQtVQR8Vb8A0';
const SHEET_NAME = 'Manuals';
const FOLDER_ID = '1B25_35NjeHn0VdiDznJWglncHyB9p6rr';

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found.`);

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) return ContentService
      .createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);

    const headers = data.shift(); // ヘッダー行を削除
    const manuals = data.map(row => {
      const obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });

    return ContentService
      .createTextOutput(JSON.stringify(manuals))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const action = e.parameter.action;

  if (action === 'uploadPdf') {
    try {
      const decodedData = Utilities.base64Decode(e.parameter.data);
      const blob = Utilities.newBlob(decodedData, e.parameter.mimeType, e.parameter.fileName);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);

      return ContentService
        .createTextOutput(JSON.stringify({ success: true, fileName: file.getName(), url: file.getUrl() }))
        .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } else if (action === 'updateManuals') {
    try {
      const newManuals = JSON.parse(e.postData.contents);
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found.`);

      sheet.clearContents();
      sheet.appendRow(['title', 'url']); // ヘッダー
      newManuals.forEach(m => sheet.appendRow([m.title, m.url]));

      return ContentService
        .createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: error.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}
