
/**
 * @fileoverview
 * Webアプリ(フロントエンド)からのGET/POSTリクエストを処理するAPIエンドポイント。
 * また、スプレッドシートのUIメニュー管理も行う。
 */

// ===================================================================================
// UIメニュー
// ===================================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('システム管理')
    .addItem('データベースを初期化', 'initializeSpreadsheet')
    .addSeparator()
    .addItem('在庫サマリ更新 (直近90日)', 'updateFastSummary')
    .addItem('全期間の在庫を再計算', 'recalculateAllSummary')
    .addToUi();
}

// ===================================================================================
// APIエンドポイント (GET)
// ===================================================================================

function doGet(e) {
  try {
    const page = e.parameter.page;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (page) {
      case 'managed_products':
        const productMasterSheetName = 'M_商品';
        const productSheet = ss.getSheetByName(productMasterSheetName);
        if (!productSheet) throw new Error(`シートが見つかりません: ${productMasterSheetName}`);

        const productHeaders = productSheet.getRange(1, 1, 1, productSheet.getLastColumn()).getValues()[0];
        const productData = productSheet.getRange(2, 1, productSheet.getLastRow() - 1, productSheet.getLastColumn()).getValues();

        const products = productData.map(row => {
          const obj = {};
          productHeaders.forEach((header, i) => {
            obj[header] = row[i];
          });
          return obj;
        });
        return createJsonResponse(products);

      // 他のGETリクエスト（在庫リスト、履歴など）はここにケースを追加
      default:
        return createJsonResponse({ success: true, message: 'GET endpoint is ready, but no specific page was requested or implemented.' });
    }
  } catch (error) {
    Logger.log(`doGet error: ${error.message}`);
    return createJsonResponse({ success: false, error: error.message });
  }
}

// ===================================================================================
// APIエンドポイント (POST)
// ===================================================================================

/**
 * POSTリクエストを処理するメイン関数。
 * @param {object} e イベントオブジェクト
 * @returns {GoogleAppsScript.Content.TextOutput} JSON形式のレスポンス
 */
function doPost(e) {
  let lock = LockService.getScriptLock();
  lock.waitLock(30000); // 30秒待機

  try {
    const action = e.parameter.action;
    const postData = JSON.parse(e.postData.contents);
    
    Logger.log(`doPost received: action=${action}, data=${JSON.stringify(postData)}`);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let targetSheetName;
    let dataToAppend;

    switch (action) {
      case 'add_delivery':
        targetSheetName = 'T_納品';
        // フロントから送られてくるデータとシートの列順を合わせる
        dataToAppend = [
          Utilities.getUuid(), // 納品ID
          new Date(),        // 納品日時 (タイムスタンプ)
          new Date(postData.deliveryDate), // 納品日
          postData.productCode,
          postData.quantity,
          new Date(postData.expirationDate)
        ];
        break;

      case 'add_collection':
        targetSheetName = 'T_回収';
        dataToAppend = [
          Utilities.getUuid(), // 回収ID
          new Date(),        // 回収日時 (タイムスタンプ)
          new Date(postData.recoveryDate), // 回収日
          postData.productCode,
          postData.quantity,
          new Date(postData.expirationDate)
        ];
        break;

      case 'add_stocktake':
        targetSheetName = 'T_棚卸';
        dataToAppend = [
          Utilities.getUuid(), // 棚卸ID
          new Date(),        // 棚卸日時 (タイムスタンプ)
          postData.productCode,
          postData.actualStock,
          postData.staffName // 担当者コード (TODO: 今は名前を直接入れる)
        ];
        break;

      default:
        throw new Error('無効なアクションが指定されました。');
    }

    const sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) throw new Error(`シートが見つかりません: ${targetSheetName}`);
    
    // データを最終行に追記
    sheet.appendRow(dataToAppend);
    Logger.log(`Data appended to ${targetSheetName}`);

    return createJsonResponse({ success: true, message: `${targetSheetName}にデータを追加しました。` });

  } catch (error) {
    Logger.log(`doPost error: ${error.message}`);
    return createJsonResponse({ success: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

// ===================================================================================
// ヘルパー関数
// ===================================================================================

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
