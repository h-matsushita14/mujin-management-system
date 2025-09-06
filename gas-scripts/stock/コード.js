/**
 * @fileoverview 在庫_一覧シートを、各種マスターデータに基づいて更新するスクリプト。
 * メンテナンス性と堅牢性を高めるために、設定の分離とエラー処理を追加しています。
 */

/**
 * 外部スプレッドシートのIDとシート名を一元管理する設定オブジェクト。
 * IDやシート名が変更された場合は、ここを修正するだけで済みます。
 */
const CONFIG = {
  inventorySheetId: "1a0BWCtsUEPqCx-eVQcvct_Z7esfFOCHf05xg81meOIg",
  inventorySheetName: "在庫_一覧",
  actualStockSheetId: "15t8oWxHKOCUuUai72jZRzr9jUPJqoD1o55ZHxZvQk2w",
  actualStockSheetName: "実在庫マスター",
  deliverySheetId: "1OJFzqX4KfpfmwBhC1qxsmuoNUFGS7Xc0JCvRAgEI6BQ",
  deliverySheetName: "納品マスター",
  salesSheetId: "1zXlwzwMRA1PJbd5ooqeO_n2urVzAvd2Ycgp7xvAqMOs",
  salesSheetName: "販売実績マスター",
  recoverySheetId: "1HTXe3CxFB-WdTr6sTgWXc_mOiDsJFCBliS1Ex78o7gE",
  recoverySheetName: "回収マスター",
  productMasterSheetId: "1Khos4vfXVTzDg0dflL2RwuuM_lGq9K-WEMWJUTteXzY",
  productMasterSheetName: "商品マスター",
};

/**
 * 日付オブジェクトを'yyyy-MM-dd'形式の文字列に変換します。
 * @param {Date|string|number} value 日付の元となる値。
 * @returns {string} 形式変換された日付文字列。
 */
const formatDateToYMD = value => {
  const date = (value instanceof Date) ? value : new Date(value);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
};

/**
 * 文字列から空白を削除し、トリムします。
 * @param {*} value 対象の値。
 * @returns {string} 正規化された文字列。
 */
const normalize = value => value?.toString().replace(/\s+/g, "").trim() || "";

/**
 * 指定されたスプレッドシートとシートのデータを取得します。
 * @param {string} fileId スプレッドシートのID。
 * @param {string} sheetName シート名。
 * @returns {Array<Array<any>>|null} データ配列。取得に失敗した場合はnull。
 */
function getSheetData(fileId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(fileId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`シート '${sheetName}' が見つかりませんでした。`);
    }
    return sheet.getDataRange().getValues();
  } catch (e) {
    Logger.log(`エラー: スプレッドシートID '${fileId}' またはシート名 '${sheetName}' の取得に失敗しました。詳細: ${e.message}`);
    return null;
  }
}

/**
 * 実在庫マスターから、基準日以前の最新の実在庫数を集計します。
 * @param {string} actualSheetId 実在庫マスターのファイルID。
 * @param {string} actualSheetName 実在庫マスターのシート名。
 * @param {string} baseDateYMD 基準日（'yyyy-MM-dd'形式）。
 * @returns {{actualStock: Object<string, number>, actualDate: Object<string, Date>}} 実在庫数と日付のマップ。
 */
function getLatestActualStock(actualSheetId, actualSheetName, baseDateYMD) {
  const actualData = getSheetData(actualSheetId, actualSheetName);
  if (!actualData) return { actualStock: {}, actualDate: {} };

  const actualHeaderMap = {};
  actualData[0].forEach((h, i) => actualHeaderMap[normalize(h)] = i);

  const actualStock = {};
  const actualDate = {};

  for (let i = 1; i < actualData.length; i++) {
    const row = actualData[i];
    const code = normalize(row[actualHeaderMap["商品コード"]]);
    const qty = Number(row[actualHeaderMap["実在庫数"]]) || 0;
    const timestamp = new Date(row[actualHeaderMap["タイムスタンプ"]]);
    const ymd = formatDateToYMD(timestamp);

    if (code && ymd <= baseDateYMD) {
      // 同じ商品コードで、より新しいタイムスタンプの実在庫数に更新
      if (!actualDate[code] || actualDate[code].getTime() < timestamp.getTime()) {
        actualStock[code] = qty;
        actualDate[code] = timestamp;
      }
    }
  }
  return { actualStock, actualDate };
}

/**
 * 在庫_一覧シートを、マスターデータに基づいて更新するメイン関数です。
 * 同じ日に実行された場合、既存のデータを上書きします。
 */
function update在庫数_fromマスター群() {
  try {
    // 1. スプレッドシートとシートオブジェクトを取得
    const targetSS = SpreadsheetApp.openById(CONFIG.inventorySheetId);
    const sheet = targetSS.getSheetByName(CONFIG.inventorySheetName);
    if (!sheet) {
      throw new Error(`出力先シート '${CONFIG.inventorySheetName}' が見つかりません。`);
    }

    // 2. ヘッダー情報を取得してマップを作成
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = {};
    headers.forEach((h, i) => { if (h) headerMap[normalize(h)] = i; });
    const dateColumnIndex = headerMap["日付"];
    if (dateColumnIndex === undefined) {
      throw new Error("ヘッダーに '日付' 列が見つかりません。");
    }

    // 3. マスターデータから最新の在庫情報を計算
    const { calculatedInventories: allCalculatedInventories, productInfoMap, scriptExecutionDate } = calculateInventoryBasedOnNewLogic();
    const todayFormatted = formatDateToYMD(scriptExecutionDate);

    // 4. シートに書き込むための新しい行データを準備
    const rowsToWrite = [];
    if (allCalculatedInventories) {
      for (const code in allCalculatedInventories) {
        const result = allCalculatedInventories[code];
        const productInfo = productInfoMap[code];
        const newRow = new Array(headers.length).fill("");
        
        if (headerMap["日付"] !== undefined) newRow[headerMap["日付"]] = todayFormatted;
        if (headerMap["商品コード"] !== undefined) newRow[headerMap["商品コード"]] = code;
        if (headerMap["netDoA商品コード"] !== undefined && productInfo) newRow[headerMap["netDoA商品コード"]] = productInfo.netDoAProductCode || "";
        if (headerMap["商品名"] !== undefined && productInfo) newRow[headerMap["商品名"]] = productInfo.productName || "";
        if (headerMap["在庫数"] !== undefined) newRow[headerMap["在庫数"]] = result.inventory;
        if (headerMap["在庫割合"] !== undefined) newRow[headerMap["在庫割合"]] = result.inventoryRatio;
        if (headerMap["賞味期限"] !== undefined) newRow[headerMap["賞味期限"]] = result.oldestExpirationDate ? formatDateToYMD(result.oldestExpirationDate) : "";
        if (headerMap["販売可能日数"] !== undefined) newRow[headerMap["販売可能日数"]] = result.daysUntilSalePossible;
        if (headerMap["直近の実在庫確認日"] !== undefined) newRow[headerMap["直近の実在庫確認日"]] = result.baseDate ? formatDateToYMD(result.baseDate) : "";

        rowsToWrite.push(newRow);
      }
    }

    // 5. 既存のデータを処理（削除またはクリア）
    const frozenRows = sheet.getFrozenRows();
    const firstDataRow = frozenRows + 1;
    const lastRow = sheet.getLastRow();

    if (lastRow >= firstDataRow) {
      const dataRange = sheet.getRange(firstDataRow, 1, lastRow - frozenRows, headers.length);
      const data = dataRange.getValues();
      const rowsToDelete = [];
      data.forEach((row, index) => {
        const rowDateValue = row[dateColumnIndex];
        if (rowDateValue && formatDateToYMD(new Date(rowDateValue)) === todayFormatted) {
          rowsToDelete.push(firstDataRow + index);
        }
      });

      // ケース1: 既存の全データが今日の日付の場合 -> 範囲をクリアして上書き
      if (rowsToDelete.length > 0 && rowsToDelete.length === data.length) {
        Logger.log("既存の全データが今日の日付のため、範囲をクリアして上書きします。");
        dataRange.clearContent();
        if (rowsToWrite.length > 0) {
          sheet.getRange(firstDataRow, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
          Logger.log(`${rowsToWrite.length}行のデータを書き込みました。`);
        }
      } else {
        // ケース2: 一部のデータが今日の日付の場合 -> 該当行を削除して追記
        if (rowsToDelete.length > 0) {
          rowsToDelete.reverse().forEach(rowNum => {
            sheet.deleteRow(rowNum);
          });
          Logger.log(`${rowsToDelete.length}行の古いデータを削除しました。`);
        }
        if (rowsToWrite.length > 0) {
          const newLastRow = sheet.getLastRow();
          sheet.getRange(newLastRow + 1, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
          Logger.log(`${rowsToWrite.length}行の新しいデータを追記しました。`);
        }
      }
    } else {
      // ケース3: 既存データがない場合 -> 単純に書き込み
      if (rowsToWrite.length > 0) {
        sheet.getRange(firstDataRow, 1, rowsToWrite.length, headers.length).setValues(rowsToWrite);
        Logger.log(`${rowsToWrite.length}行の新しいデータを書き込みました。`);
      }
    }

    Logger.log("在庫数の更新が完了しました。");

  } catch (e) {
    Logger.log(`スクリプト実行中にエラーが発生しました: ${e.message}\n${e.stack}`);
  }
}


/**
 * 新しいロジックに基づいて、各商品の現在の在庫数、基準日、最新売上日を計算します。
 * @returns {{calculatedInventories: Object<string, {inventory: number, baseDate: Date|null, latestSalesDate: Date|null}>, productInfoMap: Object<string, {productName: string, netDoAProductCode: string, shelfLifeDays: number}>}} 計算結果と商品情報のマップ。
 */
function calculateInventoryBasedOnNewLogic() {
  const today = new Date(); // 今日の日付

  // 既存のユーティリティ関数を再利用
  // getSheetData, formatDateToYMD, normalize は コード.js に存在すると仮定

  // 1. 全てのマスターデータを取得
  const actualData = getSheetData(CONFIG.actualStockSheetId, CONFIG.actualStockSheetName);
  const deliveryData = getSheetData(CONFIG.deliverySheetId, CONFIG.deliverySheetName);
  const salesData = getSheetData(CONFIG.salesSheetId, CONFIG.salesSheetName);
  const recoveryData = getSheetData(CONFIG.recoverySheetId, CONFIG.recoverySheetName);
  const productMasterData = getSheetData(CONFIG.productMasterSheetId, CONFIG.productMasterSheetName); // New

  if (!actualData || !deliveryData || !salesData || !recoveryData || !productMasterData) { // Updated condition
    Logger.log("必要なマスターデータの一部または全てが取得できませんでした。");
    return {};
  }

  // ヘッダーマップの作成
  const actualHeaderMap = {};
  actualData[0].forEach((h, i) => actualHeaderMap[normalize(h)] = i);

  const deliveryHeaderMap = {};
  deliveryData[0].forEach((h, i) => deliveryHeaderMap[normalize(h)] = i);

  const salesHeaderMap = {};
  salesData[0].forEach((h, i) => salesHeaderMap[normalize(h)] = i);

  const recoveryHeaderMap = {};
  recoveryData[0].forEach((h, i) => recoveryHeaderMap[normalize(h)] = i);

  const productMasterHeaderMap = {}; // New
  productMasterData[0].forEach((h, i) => productMasterHeaderMap[normalize(h)] = i); // New

  // 商品マスターから商品情報を取得
  const productInfoMap = {};
  const inventoryManagementCol = productMasterHeaderMap["在庫管理"]; // Get the index of '在庫管理' column
  const standardStockCol = productMasterHeaderMap["基準在庫"]; // New: Get index for 基準在庫
  const alertDaysCol = productMasterHeaderMap["アラート日数"]; // New: Get index for アラート日数

  productMasterData.slice(1).forEach(row => {
    const code = normalize(row[productMasterHeaderMap["商品コード"]]);
    const inventoryManagement = normalize(row[inventoryManagementCol]);

    if (code && inventoryManagement === "有") {
      productInfoMap[code] = {
        productName: row[productMasterHeaderMap["商品名"]],
        netDoAProductCode: row[productMasterHeaderMap["netDoA商品コード"]],
        shelfLifeDays: row[productMasterHeaderMap["賞味期限（日数）"]],
        standardStock: Number(row[standardStockCol]) || 0, // New: 基準在庫
        alertDays: Number(row[alertDaysCol]) || 0, // New: アラート日数
      };
    }
  });

  // 全ての商品コードを収集 (商品マスターからも収集)
  const managedProductCodes = new Set();
  productMasterData.slice(1).forEach(row => {
    const inventoryManagement = normalize(row[productMasterHeaderMap["在庫管理"]]);
    if (inventoryManagement === "有") {
      managedProductCodes.add(normalize(row[productMasterHeaderMap["商品コード"]]));
    }
  });
  Logger.log(`Managed Product Codes (count): ${managedProductCodes.size}`); // LOG
  // Logger.log(`Managed Product Codes: ${Array.from(managedProductCodes).join(', ')}`); // Uncomment for full list if needed

  const allProductCodes = new Set();
  actualData.slice(1).forEach(row => {
    const code = normalize(row[actualHeaderMap["商品コード"]]);
    if (managedProductCodes.has(code)) {
      allProductCodes.add(code);
      // Logger.log(`Adding from actualData: ${code}`); // LOG
    }
  });
  deliveryData.slice(1).forEach(row => {
    const code = normalize(row[deliveryHeaderMap["商品コード"]]);
    if (managedProductCodes.has(code)) {
      allProductCodes.add(code);
      // Logger.log(`Adding from deliveryData: ${code}`); // LOG
    }
  });
  salesData.slice(1).forEach(row => {
    const code = normalize(row[salesHeaderMap["商品コード"]]);
    if (managedProductCodes.has(code)) {
      allProductCodes.add(code);
      // Logger.log(`Adding from salesData: ${code}`); // LOG
    }
  });
  recoveryData.slice(1).forEach(row => {
    const code = normalize(row[recoveryHeaderMap["商品コード"]]);
    if (managedProductCodes.has(code)) {
      allProductCodes.add(code);
      // Logger.log(`Adding from recoveryData: ${code}`); // LOG
    }
  });
  // Add product codes from productMasterData that are managed
  managedProductCodes.forEach(code => allProductCodes.add(code));
  Logger.log(`Final All Product Codes (count): ${allProductCodes.size}`); // LOG
  // Logger.log(`Final All Product Codes: ${Array.from(allProductCodes).join(', ')}`); // Uncomment for full list if needed

  const currentInventoryResults = {};

  allProductCodes.forEach(productCode => {
    let baseQty = 0;
    let baseDate = null;

    // 2. 直近の実在庫数を検索
    let latestActualStockEntry = null;
    actualData.slice(1).filter(row => normalize(row[actualHeaderMap["商品コード"]]) === productCode)
      .forEach(row => {
        const timestamp = new Date(row[actualHeaderMap["タイムスタンプ"]]);
        if (!latestActualStockEntry || timestamp > new Date(latestActualStockEntry[actualHeaderMap["タイムスタンプ"]])) {
          latestActualStockEntry = row;
        }
      });

    if (latestActualStockEntry) {
      baseQty = Number(latestActualStockEntry[actualHeaderMap["実在庫数"]]) || 0;
      baseDate = new Date(latestActualStockEntry[actualHeaderMap["タイムスタンプ"]]);
    } else {
      // 3. 直近の実在庫がない場合、最初の納品数を検索
      let firstDeliveryEntry = null;
      deliveryData.slice(1).filter(row => normalize(row[deliveryHeaderMap["商品コード"]]) === productCode)
        .forEach(row => {
          const deliveryDate = new Date(row[deliveryHeaderMap["納品日"]]);
          if (!firstDeliveryEntry || deliveryDate < new Date(firstDeliveryEntry[deliveryHeaderMap["納品日"]])) {
            firstDeliveryEntry = row;
          }
        });

      if (firstDeliveryEntry) {
        baseQty = Number(firstDeliveryEntry[deliveryHeaderMap["数量"]]) || 0;
        baseDate = new Date(firstDeliveryEntry[deliveryHeaderMap["納品日"]]);
      }
    }

    // baseDate が設定されていない場合（実在庫も納品も無い場合）、全てのトランザクションを考慮しない
    if (!baseDate) {
      currentInventoryResults[productCode] = { inventory: 0, baseDate: null, latestSalesDate: null };
      return; // 次の商品へ
    }

    // 4. 基準日以降のトランザクションを集計
    let totalDeliveries = 0;
    deliveryData.slice(1).filter(row => normalize(row[deliveryHeaderMap["商品コード"]]) === productCode)
      .forEach(row => {
        const deliveryDate = new Date(row[deliveryHeaderMap["納品日"]]);
        if (deliveryDate >= baseDate && deliveryDate <= today) {
          totalDeliveries += Number(row[deliveryHeaderMap["数量"]]) || 0;
        }
      });

    let totalSales = 0;
    salesData.slice(1).filter(row => normalize(row[salesHeaderMap["商品コード"]]) === productCode)
      .forEach(row => {
        const salesDate = new Date(row[salesHeaderMap["売上日"]]);
        if (salesDate >= baseDate && salesDate <= today) {
          totalSales += Number(row[salesHeaderMap["売上点数"]]) || 0;
        }
      });

    let totalRecoveries = 0;
    recoveryData.slice(1).filter(row => normalize(row[recoveryHeaderMap["商品コード"]]) === productCode)
      .forEach(row => {
        const recoveryDate = new Date(row[recoveryHeaderMap["回収日"]]);
        if (recoveryDate >= baseDate && recoveryDate <= today) {
          totalRecoveries += Number(row[recoveryHeaderMap["数量"]]) || 0;
        }
      });

    // Calculate latest sales date for this product
    let latestSalesEntry = null;
    salesData.slice(1).filter(row => normalize(row[salesHeaderMap["商品コード"]]) === productCode)
      .forEach(row => {
        const salesDate = new Date(row[salesHeaderMap["売上日"]]);
        if (!latestSalesEntry || salesDate > new Date(latestSalesEntry[salesHeaderMap["売上日"]])) {
          latestSalesEntry = row;
        }
      });
    if (latestSalesEntry) {
      latestSalesDate = new Date(latestSalesEntry[salesHeaderMap["売上日"]]);
    }

    // 5. 在庫数を計算
    const currentInventory = baseQty + totalDeliveries - totalSales - totalRecoveries;
    
    let inventoryRatio = null;
    const productMasterInfo = productInfoMap[productCode];
    if (productMasterInfo && productMasterInfo.standardStock > 0) {
      inventoryRatio = (currentInventory / productMasterInfo.standardStock) * 100;
    }

    // Call the new helper function for oldest valid expiration date
    const oldestExpirationDate = getOldestValidExpirationDate(
      productCode,
      deliveryData,
      deliveryHeaderMap,
      recoveryData,
      recoveryHeaderMap
    );

    let daysUntilSalePossible = null;
    if (oldestExpirationDate && productMasterInfo) {
      const diffTime = oldestExpirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days remaining
      daysUntilSalePossible = diffDays - productMasterInfo.alertDays;
    }

    currentInventoryResults[productCode] = {
      inventory: currentInventory,
      baseDate: baseDate,
      latestSalesDate: latestSalesDate,
      inventoryRatio: inventoryRatio, // New: 在庫割合
      oldestExpirationDate: oldestExpirationDate, // New: 最も古い有効な賞味期限
      daysUntilSalePossible: daysUntilSalePossible, // New: 販売可能日数
    };
  });

  return {
    calculatedInventories: currentInventoryResults,
    productInfoMap: productInfoMap,
    scriptExecutionDate: today // Add script execution date
  };
}

/**
 * 納品マスターから最も古い賞味期限を取得し、回収マスターの賞味期限を除外します。
 * @param {string} productCode 商品コード
 * @param {Array<Array<any>>} deliveryData 納品マスターデータ
 * @param {Object<string, number>} deliveryHeaderMap 納品マスターヘッダーマップ
 * @param {Array<Array<any>>} recoveryData 回収マスターデータ
 * @param {Object<string, number>} recoveryHeaderMap 回収マスターヘッダーマップ
 * @returns {Date|null} 最も古い賞味期限、またはnull
 */
function getOldestValidExpirationDate(productCode, deliveryData, deliveryHeaderMap, recoveryData, recoveryHeaderMap) {
  const deliveryExpirationCol = deliveryHeaderMap["賞味期限"]; // Assuming "賞味期限" header in Delivery Master
  const recoveryExpirationCol = recoveryHeaderMap["賞味期限"]; // Assuming "賞味期限" header in Recovery Master

  if (deliveryExpirationCol === undefined || recoveryExpirationCol === undefined) {
    Logger.log("Warning: 賞味期限 header not found in Delivery or Recovery Master.");
    return null;
  }

  // 回収マスターにある賞味期限を収集
  const recoveredExpirationDates = new Set();
  recoveryData.slice(1).filter(row => normalize(row[recoveryHeaderMap["商品コード"]]) === productCode)
    .forEach(row => {
      const expDate = row[recoveryExpirationCol];
      if (expDate) {
        recoveredExpirationDates.add(formatDateToYMD(expDate));
      }
    });

  let oldestExpirationDate = null;

  // 納品マスターから有効な賞味期限を検索
  deliveryData.slice(1).filter(row => normalize(row[deliveryHeaderMap["商品コード"]]) === productCode)
    .forEach(row => {
      const expDateValue = row[deliveryExpirationCol];
      if (expDateValue) {
        const currentExpDate = new Date(expDateValue);
        const currentExpDateYMD = formatDateToYMD(currentExpDate);

        // 回収マスターにない賞味期限のみを考慮
        if (!recoveredExpirationDates.has(currentExpDateYMD)) {
          if (!oldestExpirationDate || currentExpDate.getTime() < oldestExpirationDate.getTime()) {
            oldestExpirationDate = currentExpDate;
          }
        }
      }
    });
  return oldestExpirationDate;
}

/**
 * WebアプリからのGETリクエストを処理します。
 * @param {GoogleAppsScript.Events.DoGet} e イベントオブジェクト。
 * @returns {GoogleAppsScript.Content.TextOutput} JSON形式のレスポンス。
 */
function doGet(e) {
  try {
    const result = calculateInventoryBasedOnNewLogic();
    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`doGet error: ${error.message}\n${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: `Error: ${error.message}` }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
