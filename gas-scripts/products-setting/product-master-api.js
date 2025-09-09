function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createHeaderMap(headers) {
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[header] = index;
  });
  return headerMap;
}

function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("商品マスター");
    if (!sheet) {
      return createJsonResponse({ "error": "Sheet '商品マスター' not found" });
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
    
    return createJsonResponse(products);
  } catch (e) {
    return createJsonResponse({ "error": e.toString() });
  }
}

function doPost(e) {
  try {
    const action = e.parameter.action;
    const productData = e.parameter; // All parameters are product data

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("商品マスター");
    if (!sheet) {
      return createJsonResponse({ success: false, error: "Sheet '商品マスター' not found" });
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = createHeaderMap(headers);

    // Map frontend keys to spreadsheet headers
    const frontendToBackendMap = {
      productCode: '商品コード',
      productName: '商品名',
      netDoAProductCode: 'netDoA商品コード',
      expirationDays: '賞味期限（日数）',
      alertDays: 'アラート日数',
      standardStock: '基準在庫',
      taxIncludedSellingPrice: '税込売価',
      reorderPoint: '発注点',
      deliveryLot: '納品ロット',
      expirationDeliveryBasis: '賞味期限（納品日起点）',
      inventoryManagement: '在庫管理',
      imageData: '画像データ',
    };

    const rowData = headers.map(header => {
      const frontendKey = Object.keys(frontendToBackendMap).find(key => frontendToBackendMap[key] === header);
      return productData[frontendKey] !== undefined ? productData[frontendKey] : '';
    });

    if (action === 'addProduct') {
      // Check if productCode already exists
      const productCodeColIndex = headerMap['商品コード'];
      if (productCodeColIndex === undefined) {
        return createJsonResponse({ success: false, error: '「商品コード」列が見つかりません。' });
      }
      const existingProductCodes = sheet.getRange(2, productCodeColIndex + 1, sheet.getLastRow() - 1, 1).getValues().flat();
      if (existingProductCodes.includes(productData.productCode)) {
        return createJsonResponse({ success: false, error: `商品コード ${productData.productCode} は既に存在します。` });
      }

      sheet.appendRow(rowData);
      return createJsonResponse({ success: true, message: '商品が正常に追加されました。' });
    } else if (action === 'updateProduct') {
      const productCodeColIndex = headerMap['商品コード'];
      if (productCodeColIndex === undefined) {
        return createJsonResponse({ success: false, error: '「商品コード」列が見つかりません。' });
      }

      const allData = sheet.getDataRange().getValues();
      let rowIndexToUpdate = -1;
      for (let i = 1; i < allData.length; i++) { // Start from 1 to skip headers
        if (allData[i][productCodeColIndex] == productData.productCode) { // Use == for loose comparison
          rowIndexToUpdate = i;
          break;
        }
      }

      if (rowIndexToUpdate === -1) {
        return createJsonResponse({ success: false, error: `商品コード ${productData.productCode} が見つかりません。` });
      }

      // Update the row
      const rangeToUpdate = sheet.getRange(rowIndexToUpdate + 1, 1, 1, headers.length);
      rangeToUpdate.setValues([rowData]);
      return createJsonResponse({ success: true, message: '商品が正常に更新されました。' });
    } else if (action === 'deleteProduct') { // Add delete action as well
      const productCodeColIndex = headerMap['商品コード'];
      if (productCodeColIndex === undefined) {
        return createJsonResponse({ success: false, error: '「商品コード」列が見つかりません。' });
      }

      const allData = sheet.getDataRange().getValues();
      let rowIndexToDelete = -1;
      for (let i = 1; i < allData.length; i++) { // Start from 1 to skip headers
        if (allData[i][productCodeColIndex] == productData.productCode) {
          rowIndexToDelete = i;
          break;
        }
      }

      if (rowIndexToDelete === -1) {
        return createJsonResponse({ success: false, error: `商品コード ${productData.productCode} が見つかりません。` });
      }

      sheet.deleteRow(rowIndexToDelete + 1); // +1 because sheet rows are 1-based
      return createJsonResponse({ success: true, message: '商品が正常に削除されました。' });
    }
    else {
      return createJsonResponse({ success: false, error: 'Invalid action for POST request.' });
    }
  } catch (error) {
    Logger.log(`doPost error: ${error.message}\n${error.stack}`);
    return createJsonResponse({ success: false, error: `An unexpected error occurred: ${error.message}` });
  }
}