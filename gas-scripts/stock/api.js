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

function doPost(e) {
  try {
    const action = e.parameter.action;
    if (action === 'updateToday') {
      updateToday(); // Call the actual update function from aggregation.js
      return createJsonResponse({ success: true, message: '在庫データが正常に更新されました。' });
    } else {
      return createJsonResponse({ success: false, error: 'Invalid action for POST request.' });
    }
  } catch (error) {
    Logger.log(`doPost error: ${error.message}\n${error.stack}`);
    return createJsonResponse({ success: false, error: `An unexpected error occurred: ${error.message}` });
  }
}

/**
 * WebアプリからのGETリクエストを処理します。
 * @param {GoogleAppsScript.Events.DoGet} e イベントオブジェクト。
 * @returns {GoogleAppsScript.Content.TextOutput} JSON形式のレスポンス。
 */
function doGet(e) {
  Logger.log(e.parameter);
  try {
    const page = e.parameter.page;
    if (!page) {
      return createJsonResponse({ success: false, error: 'Page parameter is missing.' });
    }

    switch (page) {
      case 'inventory_latest': {
        const dateParam = e.parameter.date;
        const targetDateYMD = dateParam ? formatDateToYMD(new Date(dateParam)) : formatDateToYMD(new Date());
        const cache = CacheService.getScriptCache();
        const cacheKey = `inventory_latest_${targetDateYMD}`;
        const cachedData = cache.get(cacheKey);

        if (cachedData) {
          Logger.log(`Cache hit for ${cacheKey}`);
          return createJsonResponse(JSON.parse(cachedData));
        }

        Logger.log(`Cache miss for ${cacheKey}. Fetching from spreadsheet.`);
        const inventorySheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
        if (!inventorySheet) {
          return createJsonResponse({ success: false, error: '在庫データシートが見つかりません。' });
        }
        
        const headers = inventorySheet.getRange(1, 1, 1, inventorySheet.getLastColumn()).getValues()[0];
        const headerMap = createHeaderMap(headers);
        const dateColIndex = headerMap["日付"];
        if (dateColIndex === undefined) return createJsonResponse({ success: false, error: '「日付」列が見つかりません。' });

        const lastRow = inventorySheet.getLastRow();
        if (lastRow < 2) {
          const result = { success: true, date: targetDateYMD, items: [] };
          cache.put(cacheKey, JSON.stringify(result), 172800); // Cache for 2 days (172800 seconds)
          return createJsonResponse(result);
        }

        // 🔹 日付列だけを先にスキャンして対象行を特定
        const dateColumnData = inventorySheet.getRange(2, dateColIndex + 1, lastRow - 1, 1).getValues();
        const matchingRowNumbers = [];

        dateColumnData.forEach((row, index) => {
          const currentRowNumber = index + 2; // スプレッドシートの行番号 (1-based)
          const rowDate = row[0]; // dateColumnData は1列の2D配列
          if (rowDate && formatDateToYMD(new Date(rowDate)) === targetDateYMD) {
            matchingRowNumbers.push(currentRowNumber);
          }
        });

        const matchedRowsData = [];
        if (matchingRowNumbers.length > 0) {
          // 🔹 対象行の全データを取得
          matchingRowNumbers.forEach(rowNum => {
            const fullRow = inventorySheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
            matchedRowsData.push(fullRow);
          });
        }
        
        // 🔹 必要な列のみ返す
        const requiredFields = ["商品コード", "商品名", "在庫数", "在庫割合", "理論在庫", "実在庫数", "差異", "賞味期限", "販売可能日数"];
        const formattedData = matchedRowsData.map(row => {
          const obj = {};
          requiredFields.forEach(field => {
            const idx = headerMap[field];
            if (idx !== undefined) obj[field] = row[idx];
          });
          return obj;
        });

        const result = { success: true, date: targetDateYMD, items: formattedData };
        cache.put(cacheKey, JSON.stringify(result), 172800); // Cache for 2 days (172800 seconds)
        return createJsonResponse(result);
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
          if (!productCode) return createJsonResponse({ success: false, error: 'productCode is missing.' });
          const codeColIndex = headerMap["商品コード"];
          const dateColIndex = headerMap["日付"]; // Get date column index
          if (codeColIndex === undefined || dateColIndex === undefined) return createJsonResponse({ success: false, error: '「商品コード」または「日付」列が見つかりません。' });

          const startDateParam = e.parameter.startDate;
          const endDateParam = e.parameter.endDate;
          Logger.log(`Received startDate: ${startDateParam}, endDate: ${endDateParam}`);
          const filterByDate = startDateParam && endDateParam;
          let startDate = null;
          let endDate = null;
          if (filterByDate) {
            startDate = getStartOfDay(new Date(startDateParam));
            endDate = getStartOfDay(new Date(endDateParam));
            Logger.log(`Parsed startDate: ${startDate}, endDate: ${endDate}`);
          }

          const lastRow = inventorySheet.getLastRow();
          if (lastRow < 2) return createJsonResponse([]);

          const allInventoryData = inventorySheet.getRange(2, 1, lastRow - 1, headers.length).getValues(); // Get all data to filter
          const matchingRowsData = [];

          allInventoryData.forEach(row => {
            const rowProductCode = normalize(row[codeColIndex]);
            const rowDate = getStartOfDay(new Date(row[dateColIndex]));
            Logger.log(`Processing rowDate: ${rowDate} for product: ${rowProductCode}`);

            if (rowProductCode === normalize(productCode)) {
              if (filterByDate) {
                if (rowDate >= startDate && rowDate <= endDate) {
                  matchingRowsData.push(row);
                } else {
                  Logger.log(`Row date ${rowDate} outside range [${startDate}, ${endDate}]`);
                }
              } else {
                matchingRowsData.push(row);
              }
            }
          });
          filteredData = matchingRowsData;

        } else { // discrepancy_history
          const discrepancyColIndex = headerMap["差異"];
          if (discrepancyColIndex === undefined) return createJsonResponse({ success: false, error: '「差異」列が見つかりません。' });

          const lastRow = inventorySheet.getLastRow();
          if (lastRow < 2) return createJsonResponse([]);

          const discrepancyColumnData = inventorySheet.getRange(2, discrepancyColIndex + 1, lastRow - 1, 1).getValues();
          const matchingRowNumbers = [];

          discrepancyColumnData.forEach((row, index) => {
            const currentRowNumber = index + 2;
            const discrepancyValue = row[0];
            if (discrepancyValue !== null && discrepancyValue !== '' && discrepancyValue != 0) {
              matchingRowNumbers.push(currentRowNumber);
            }
          });

          const matchedRowsData = [];
          if (matchingRowNumbers.length > 0) {
            matchingRowNumbers.forEach(rowNum => {
              const fullRow = inventorySheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
              matchedRowsData.push(fullRow);
            });
          }
          filteredData = matchedRowsData;
        }
        
        const requiredHistoryFields = ["日付", "在庫数"]; // Only return these fields for history
        const formattedData = filteredData.map(row => {
            const obj = {};
            requiredHistoryFields.forEach(field => {
                const idx = headerMap[field];
                if (idx !== undefined) obj[field] = row[idx];
            });
            return obj;
        });
        return createJsonResponse(formattedData);
      }

      default:
        return createJsonResponse({ success: false, error: 'Invalid page parameter.' });
    }
  } catch (error) {
    Logger.log(`doGet error: ${error.message}\n${error.stack}`);
    return createJsonResponse({ success: false, error: `An unexpected error occurred: ${error.message}` });
  }
}