/**
 * @fileoverview WebアプリからのGETリクエストを処理し、在庫関連データを返すAPIエンドポイント。
 * aggregation.jsで定義されたグローバル関数・変数に依存しています。
 */

/**
 * JSON形式のレスポンスを生成するヘルパー関数。
 * @param {Object} data - JSONとして送信するオブジェクト。
 * @returns {GoogleAppsScript.Content.TextOutput} JSON形式のレスポンス。
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * WebアプリからのGETリクエストを処理します。
 * @param {GoogleAppsScript.Events.DoGet} e イベントオブジェクト。
 * @returns {GoogleAppsScript.Content.TextOutput} JSON形式のレスポンス。
 */
function doGet(e) {
  try {
    const page = e.parameter.page;
    if (!page) {
      return createJsonResponse({ success: false, error: 'Page parameter is missing.' });
    }

    const inventorySheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
    if (!inventorySheet) {
      return createJsonResponse({ success: false, error: '在庫データシートが見つかりません。' });
    }
    const inventoryData = inventorySheet.getDataRange().getValues();
    const headers = inventoryData[0];
    const headerMap = createHeaderMap(headers); // aggregation.jsの関数

    switch (page) {
      case 'inventory_latest': {
        const dateParam = e.parameter.date;
        const targetDateYMD = dateParam ? formatDateToYMD(new Date(dateParam)) : formatDateToYMD(new Date());
        const dateCol = headerMap["日付"];

        const filteredData = inventoryData.slice(1).filter(row => {
          return row[dateCol] && formatDateToYMD(new Date(row[dateCol])) === targetDateYMD;
        });

        const formattedData = filteredData.map(row => {
          const obj = {};
          headers.forEach((header, index) => { obj[header] = row[index]; });
          return obj;
        });

        return createJsonResponse(formattedData);
      }

      case 'managed_products': {
        const productMasterData = getSheetData(CONFIG.productMasterSheetId, CONFIG.productMasterSheetName);
        if (!productMasterData) {
          return createJsonResponse({ success: false, error: '商品マスターデータの取得に失敗しました。' });
        }
        const products = createProductInfoMap(productMasterData, createHeaderMap(productMasterData[0]));
        const managedProducts = Object.keys(products).map(code => ({
          productCode: code,
          productName: products[code].productName
        }));
        return createJsonResponse(managedProducts);
      }

      case 'inventory_history': {
        const productCode = e.parameter.productCode;
        if (!productCode) {
          return createJsonResponse({ success: false, error: 'productCode parameter is missing.' });
        }
        const codeCol = headerMap["商品コード"];
        const historyData = inventoryData.slice(1).filter(row => normalize(row[codeCol]) === normalize(productCode));
        
        const formattedHistory = historyData.map(row => {
          const obj = {};
          headers.forEach((header, index) => { obj[header] = row[index]; });
          return obj;
        });
        return createJsonResponse(formattedHistory);
      }

      case 'discrepancy_history': {
        const discrepancyCol = headerMap["差異"];
        const discrepancyData = inventoryData.slice(1).filter(row => {
          const diff = row[discrepancyCol];
          return diff !== null && diff !== undefined && diff !== "" && diff != 0;
        });

        const formattedDiscrepancy = discrepancyData.map(row => {
          const obj = {};
          headers.forEach((header, index) => { obj[header] = row[index]; });
          return obj;
        });
        return createJsonResponse(formattedDiscrepancy);
      }

      default:
        return createJsonResponse({ success: false, error: 'Invalid page parameter.' });
    }
  } catch (error) {
    Logger.log(`doGet error: ${error.message}\n${error.stack}`);
    return createJsonResponse({ success: false, error: `An unexpected error occurred: ${error.message}` });
  }
}