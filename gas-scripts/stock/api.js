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

    switch (page) {
      case 'inventory_latest': {
        const inventorySheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
        if (!inventorySheet) {
          return createJsonResponse({ success: false, error: '在庫データシートが見つかりません。' });
        }
        const inventoryData = inventorySheet.getDataRange().getValues();
        const headers = inventoryData[0];
        const headerMap = createHeaderMap(headers); // aggregation.jsの関数

        const dateParam = e.parameter.date;
        const targetDateYMD = dateParam ? formatDateToYMD(new Date(dateParam)) : formatDateToYMD(new Date());
        const dateCol = headerMap["日付"];
        if (dateCol === undefined) return createJsonResponse({ success: false, error: '「日付」列が見つかりません。' });

        const filteredData = inventoryData.slice(1).filter(row => {
          return row[dateCol] && formatDateToYMD(new Date(row[dateCol])) === targetDateYMD;
        });

        const requiredFields = ["商品コード", "商品名", "在庫数", "在庫割合", "理論在庫", "実在庫数", "差異", "賞味期限", "販売可能日数"];
        const fieldIndices = requiredFields.map(field => ({ name: field, index: headerMap[field] }));

        const formattedData = filteredData.map(row => {
          const obj = {};
          fieldIndices.forEach(field => {
            if (field.index !== undefined) {
              obj[field.name] = row[field.index];
            }
          });
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

      case 'inventory_history':
      case 'discrepancy_history': {
        const inventorySheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
        if (!inventorySheet) {
          return createJsonResponse({ success: false, error: '在庫データシートが見つかりません。' });
        }
        const inventoryData = inventorySheet.getDataRange().getValues();
        const headers = inventoryData[0];
        const headerMap = createHeaderMap(headers);
        let filteredData;

        if (page === 'inventory_history') {
          const productCode = e.parameter.productCode;
          if (!productCode) return createJsonResponse({ success: false, error: 'productCode parameter is missing.' });
          const codeCol = headerMap["商品コード"];
          filteredData = inventoryData.slice(1).filter(row => normalize(row[codeCol]) === normalize(productCode));
        } else {
          const discrepancyCol = headerMap["差異"];
          filteredData = inventoryData.slice(1).filter(row => row[discrepancyCol] !== null && row[discrepancyCol] !== '' && row[discrepancyCol] != 0);
        }
        
        const formattedData = filteredData.map(row => {
            const obj = {};
            headers.forEach((h, i) => obj[h] = row[i]);
            return obj;
        });
        return createJsonResponse(formattedData);
      }

      default:
        return createJsonResponse({ success: false, error: 'Invalid page parameter.' });
    }
  } catch (error) {
    Logger.log(`doGet error: ${error.message}
${error.stack}`);
    return createJsonResponse({ success: false, error: `An unexpected error occurred: ${error.message}` });
  }
}