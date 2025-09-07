function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("商品マスター");
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ "error": "Sheet '商品マスター' not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    
    const products = data.map(row => {
      const product = {};
      headers.forEach((header, index) => {
        product[header] = row[index];
      });
      return product;
    });
    
    return ContentService.createTextOutput(JSON.stringify(products))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ "error": e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}