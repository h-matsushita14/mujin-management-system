const SPREADSHEET_ID = '1zuGQT9ODtyn7Qsjqc3R8R-QnDKZKgpfjQtVQR8Vb8A0/edit?gid=0#gid=0'; // ここをあなたの新しいスプレッドシートIDに置き換えてください
const SHEET_NAME = 'Manuals';
const FOLDER_ID = '1B25_35NjeHn0VdiDznJWglncHyB9p6rr'; // 提供されたGoogleドライブのフォルダID

function doGet(e) {
  // マニュアルの取得
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Sheet '${SHEET_NAME}' not found.`);
    }
    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    const headers = data.shift(); // ヘッダー行を削除
    const manuals = data.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });
    return ContentService.createTextOutput(JSON.stringify(manuals))
      .setMimeType(ContentService.MimeType.JSON)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

function doPost(e) {
  const action = e.parameter.action;

  if (action === 'uploadPdf') {
    const fileName = e.parameter.fileName;
    const mimeType = e.parameter.mimeType; // application/pdf を想定
    const data = e.parameter.data; // Base64エンコードされたファイルコンテンツ

    try {
      const decodedData = Utilities.base64Decode(data);
      const blob = Utilities.newBlob(decodedData, mimeType, fileName);
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const file = folder.createFile(blob);
      const fileUrl = file.getUrl();

      return ContentService.createTextOutput(JSON.stringify({ success: true, fileName: fileName, url: fileUrl }))
        .setMimeType(ContentService.MimeType.JSON)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
        .setMimeType(ContentService.MimeType.JSON)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  } else if (action === 'updateManuals') {
    try {
      const newManuals = JSON.parse(e.postData.contents);
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      if (!sheet) {
        throw new Error(`Sheet '${SHEET_NAME}' not found.`);
      }

      // 既存のデータをクリアして新しいデータを書き込む
      sheet.clearContents();
      sheet.appendRow(['title', 'url']); // ヘッダーを書き込む
      newManuals.forEach(manual => {
        sheet.appendRow([manual.title, manual.url]);
      });

      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message }))
        .setMimeType(ContentService.MimeType.JSON)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}