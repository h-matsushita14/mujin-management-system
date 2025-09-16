/**
 * @fileoverview 在庫一覧シートを、各種マスターデータに基づいて更新するスクリプト。
 * 機能：当日更新、過去30日更新（時間主導）、全履歴更新。
 */

// ===================================================================================
// グローバル設定
// ===================================================================================

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

// ===================================================================================
// トリガー設定
// ===================================================================================

function createTimeBasedTriggers() {
  const allTriggers = ScriptApp.getProjectTriggers();
  for (const trigger of allTriggers) {
    if (trigger.getHandlerFunction() === 'updatePast30Days') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  ScriptApp.newTrigger('updatePast30Days')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  SpreadsheetApp.getUi().alert('過去30日分の在庫を毎日自動更新するトリガーを設定しました。');
}

// ===================================================================================
// UI & API エントリーポイント
// ===================================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('在庫更新')
    .addItem('今日の在庫を更新', 'updateToday')
    .addItem('過去30日分を更新', 'updatePast30Days')
    .addSeparator()
    .addItem('全履歴を再計算', 'updateAllHistory')
    .addSeparator()
    .addItem('自動更新トリガーを設定', 'createTimeBasedTriggers')
    .addToUi();
}

function doPost(e) {
  try {
    const action = e.parameter.action;
    let resultMessage = "";
    if (action === "updateToday") {
      updateToday();
      resultMessage = "今日の在庫を更新しました。";
    } else if (action === "updateAllHistory") {
      updateAllHistory();
      resultMessage = "全履歴を再計算しました。";
    } else {
      throw new Error("無効なアクションが指定されました。");
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: resultMessage })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`doPostエラー: ${error.message}\n${error.stack}`);
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===================================================================================
// 在庫更新メイン関数
// ===================================================================================

function updateToday() {
  try {
    Logger.log("今日の在庫更新処理（部分上書き）を開始します。");
    const today = getStartOfDay(new Date());
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    upsertInventoryData(getStartOfDay(yesterday), today);
    Logger.log("今日の在庫更新処理が完了しました。");
  } catch (e) {
    Logger.log(`updateTodayでエラー: ${e.message}\n${e.stack}`);
    throw e;
  }
}

function updatePast30Days() {
  try {
    Logger.log("過去30日分の在庫更新処理（部分上書き）を開始します。");
    const today = getStartOfDay(new Date());
    const thirtyOneDaysAgo = new Date();
    thirtyOneDaysAgo.setDate(today.getDate() - 31);
    upsertInventoryData(getStartOfDay(thirtyOneDaysAgo), today);
    Logger.log("過去30日分の在庫更新処理が完了しました。");
  } catch (e) {
    Logger.log(`updatePast30Daysでエラー: ${e.message}\n${e.stack}`);
    throw e;
  }
}

function updateAllHistory() {
  try {
    Logger.log("全履歴の再計算処理（全削除・全書き込み）を開始します。");
    const targetSS = SpreadsheetApp.openById(CONFIG.inventorySheetId);
    const sheet = targetSS.getSheetByName(CONFIG.inventorySheetName);
    if (!sheet) throw new Error(`シート '${CONFIG.inventorySheetName}' が見つかりません。`);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerMap = createHeaderMap(headers);
    const earliestDate = findEarliestTransactionDate();
    const today = getStartOfDay(new Date());
    const allRowsToWrite = [];
    let yesterdaysInventories = null;

    for (let d = getStartOfDay(earliestDate); d <= today; d.setDate(d.getDate() + 1)) {
      const currentDate = getStartOfDay(d);
      const { calculatedInventories, productInfoMap } = calculateInventoryForDate(currentDate, yesterdaysInventories);
      const newRows = createSheetRows(calculatedInventories, productInfoMap, currentDate, headerMap, headers.length);
      allRowsToWrite.push(...newRows);
      yesterdaysInventories = calculatedInventories;
    }

    const frozenRows = sheet.getFrozenRows();
    const firstDataRow = frozenRows + 1;
    if (sheet.getLastRow() >= firstDataRow) {
      sheet.getRange(firstDataRow, 1, sheet.getLastRow() - frozenRows, headers.length).clearContent();
    }
    if (allRowsToWrite.length > 0) {
      sheet.getRange(firstDataRow, 1, allRowsToWrite.length, headers.length).setValues(allRowsToWrite);
      Logger.log(`${allRowsToWrite.length}行のデータを書き込みました。`);
    }
    Logger.log("全履歴の再計算処理が完了しました。");
  } catch (e) {
    Logger.log(`updateAllHistoryでエラー: ${e.message}\n${e.stack}`);
    throw e;
  }
}

function upsertInventoryData(startDate, endDate) {
  const targetSS = SpreadsheetApp.openById(CONFIG.inventorySheetId);
  const sheet = targetSS.getSheetByName(CONFIG.inventorySheetName);
  if (!sheet) throw new Error(`シート '${CONFIG.inventorySheetName}' が見つかりません。`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const headerMap = createHeaderMap(headers);
  const dateCol = headerMap["日付"];
  const codeCol = headerMap["商品コード"];
  if (dateCol === undefined || codeCol === undefined) throw new Error("ヘッダーに '日付' または '商品コード' 列が見つかりません。");

  const existingRowMap = new Map();
  const sheetData = sheet.getDataRange().getValues();
  sheetData.forEach((row, index) => {
    const key = `${formatDateToYMD(row[dateCol])}-${normalize(row[codeCol])}`;
    existingRowMap.set(key, index + 1);
  });

  const rowsToUpdate = [];
  const rowsToAppend = [];
  let yesterdaysInventories = null;

  const loopStartDate = new Date(startDate);
  loopStartDate.setDate(loopStartDate.getDate() - 1);

  for (let d = getStartOfDay(loopStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const currentDate = getStartOfDay(d);
    const { calculatedInventories, productInfoMap } = calculateInventoryForDate(currentDate, yesterdaysInventories);

    if (currentDate >= startDate) {
      const dateYMD = formatDateToYMD(currentDate);
      const calculatedRows = createSheetRows(calculatedInventories, productInfoMap, currentDate, headerMap, headers.length);
      for (const newRow of calculatedRows) {
        const productCode = newRow[codeCol];
        const key = `${dateYMD}-${normalize(productCode)}`;
        if (existingRowMap.has(key)) {
          rowsToUpdate.push({ rowNum: existingRowMap.get(key), data: newRow });
        } else {
          rowsToAppend.push(newRow);
        }
      }
    }
    yesterdaysInventories = calculatedInventories;
  }

  if (rowsToUpdate.length > 0) {
    Logger.log(`${rowsToUpdate.length}件のデータを更新します...`);
    rowsToUpdate.forEach(item => {
      sheet.getRange(item.rowNum, 1, 1, item.data.length).setValues([item.data]);
    });
  }
  if (rowsToAppend.length > 0) {
    Logger.log(`${rowsToAppend.length}件のデータを追記します...`);
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  }
  Logger.log(`部分上書き処理完了。更新: ${rowsToUpdate.length}件, 追記: ${rowsToAppend.length}件`);
}

// ===================================================================================
// 在庫計算コアロジック
// ===================================================================================

function calculateInventoryForDate(targetDate, yesterdaysInventories = {}) {
  const today = getStartOfDay(targetDate);
  const deliveryData = getSheetData(CONFIG.deliverySheetId, CONFIG.deliverySheetName);
  const salesData = getSheetData(CONFIG.salesSheetId, CONFIG.salesSheetName);
  const recoveryData = getSheetData(CONFIG.recoverySheetId, CONFIG.recoverySheetName);
  const actualData = getSheetData(CONFIG.actualStockSheetId, CONFIG.actualStockSheetName);
  const productMasterData = getSheetData(CONFIG.productMasterSheetId, CONFIG.productMasterSheetName);
  if (!deliveryData || !salesData || !recoveryData || !actualData || !productMasterData) {
    throw new Error("必要なマスターデータの一部または全てが取得できませんでした。");
  }
  const deliveryHeaderMap = createHeaderMap(deliveryData[0]);
  const salesHeaderMap = createHeaderMap(salesData[0]);
  const recoveryHeaderMap = createHeaderMap(recoveryData[0]);
  const actualHeaderMap = createHeaderMap(actualData[0]);
  const productMasterHeaderMap = createHeaderMap(productMasterData[0]);
  const productInfoMap = createProductInfoMap(productMasterData, productMasterHeaderMap);
  const managedProductCodes = new Set(Object.keys(productInfoMap));
  const deliveries = aggregateByProductAndDate(deliveryData.slice(1), deliveryHeaderMap, "納品日", "数量", managedProductCodes);
  const sales = aggregateByProductAndDate(salesData.slice(1), salesHeaderMap, "売上日", "売上点数", managedProductCodes);
  const recoveries = aggregateByProductAndDate(recoveryData.slice(1), recoveryHeaderMap, "回収日", "数量", managedProductCodes);
  const { latestStock, stockOnDate } = preprocessActualStock(actualData.slice(1), actualHeaderMap, today, managedProductCodes);

  const calculatedInventories = {};
  for (const code of managedProductCodes) {
    const productInfo = productInfoMap[code];
    const actualStockOnDate = stockOnDate[code];
    let inventory;
    let baseDate;

    if (actualStockOnDate !== undefined) {
      // 実在庫確認日の処理
      baseDate = today;
      const todayYMD = formatDateToYMD(today);

      // その日の入出庫量を計算
      const deliveryTodayQty = deliveries[code] ? deliveries[code].filter(d => formatDateToYMD(d.date) === todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0;
      const salesTodayQty = sales[code] ? sales[code].filter(s => formatDateToYMD(s.date) === todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0;
      const recoveryTodayQty = recoveries[code] ? recoveries[code].filter(r => formatDateToYMD(r.date) === todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0;

      // 同日の入出庫データが存在するかどうかで計算方法を分岐
      if (deliveryTodayQty > 0 || salesTodayQty > 0 || recoveryTodayQty > 0) {
        // MODE_A: 入出庫が存在する場合、実在庫を基点に変動を反映
        inventory = actualStockOnDate + deliveryTodayQty - salesTodayQty - recoveryTodayQty;
      } else {
        // MODE_B: 実在庫の記録しかない場合、実在庫の値をそのまま使用
        inventory = actualStockOnDate;
      }
    } else {
      // 実在庫が登録されていない日は、従来の理論在庫計算を行う
      const actual = latestStock[code];
      baseDate = actual ? actual.date : null;
      const baseQty = actual ? actual.qty : 0;
      inventory = baseQty;
      if (baseDate) {
        const baseDateYMD = formatDateToYMD(baseDate);
        const todayYMD = formatDateToYMD(today);
        inventory += (deliveries[code] ? deliveries[code].filter(d => formatDateToYMD(d.date) >= baseDateYMD && formatDateToYMD(d.date) <= todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0);
        inventory -= (sales[code] ? sales[code].filter(s => formatDateToYMD(s.date) >= baseDateYMD && formatDateToYMD(s.date) <= todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0);
        inventory -= (recoveries[code] ? recoveries[code].filter(r => formatDateToYMD(r.date) >= baseDateYMD && formatDateToYMD(r.date) <= todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0);
      } else {
        const todayYMD = formatDateToYMD(today);
        inventory += (deliveries[code] ? deliveries[code].filter(d => formatDateToYMD(d.date) <= todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0);
        inventory -= (sales[code] ? sales[code].filter(s => formatDateToYMD(s.date) <= todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0);
        inventory -= (recoveries[code] ? recoveries[code].filter(r => formatDateToYMD(r.date) <= todayYMD).reduce((sum, item) => sum + item.qty, 0) : 0);
      }
    }

    let discrepancy = null;
    let yesterdayTheoreticalStock = null;
    if (actualStockOnDate !== undefined && yesterdaysInventories && yesterdaysInventories[code]) {
      yesterdayTheoreticalStock = yesterdaysInventories[code].inventory;
      discrepancy = actualStockOnDate - yesterdayTheoreticalStock; // ★★★ 計算式を修正 ★★★
    }

    const inventoryRatio = (productInfo.standardStock > 0) ? (inventory / productInfo.standardStock) * 100 : null;
    const oldestExpirationDate = getOldestValidExpirationDate(code, deliveryData, deliveryHeaderMap, recoveryData, recoveryHeaderMap);
    let daysUntilSalePossible = null;
    if (oldestExpirationDate && productInfo.alertDays !== undefined) {
      const diffTime = oldestExpirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysUntilSalePossible = diffDays - productInfo.alertDays;
    }
    calculatedInventories[code] = {
      inventory,
      inventoryRatio,
      discrepancy,
      actualStockOnDate,
      yesterdayTheoreticalStock,
      baseDate,
      oldestExpirationDate,
      daysUntilSalePossible,
    };
  }
  return { calculatedInventories, productInfoMap };
}

// ===================================================================================
// ヘルパー関数（データ集計・加工）
// ===================================================================================

function createHeaderMap(headers) {
  const map = {};
  headers.forEach((h, i) => { if (h) map[normalize(h)] = i; });
  return map;
}
function createProductInfoMap(data, headerMap) {
  const productInfoMap = {};
  const inventoryManagementCol = headerMap["在庫管理"];
  data.slice(1).forEach(row => {
    const code = normalize(row[headerMap["商品コード"]]);
    if (code && normalize(row[inventoryManagementCol]) === "有") {
      productInfoMap[code] = {
        productName: row[headerMap["商品名"]],
        netDoAProductCode: row[headerMap["netDoA商品コード"]],
        shelfLifeDays: row[headerMap["賞味期限（日数）"]],
        standardStock: Number(row[headerMap["基準在庫"]]) || 0,
        alertDays: Number(row[headerMap["アラート日数"]]) || 0,
      };
    }
  });
  return productInfoMap;
}
function aggregateByProductAndDate(data, headerMap, dateHeader, qtyHeader, managedCodes) {
  const result = {};
  const codeCol = headerMap["商品コード"];
  const dateCol = headerMap[dateHeader];
  const qtyCol = headerMap[qtyHeader];
  data.forEach(row => {
    const code = normalize(row[codeCol]);
    if (managedCodes.has(code) && row[dateCol]) {
      if (!result[code]) result[code] = [];
      result[code].push({ date: getStartOfDay(new Date(row[dateCol])), qty: Number(row[qtyCol]) || 0 });
    }
  });
  return result;
}
function preprocessActualStock(data, headerMap, baseDate, managedCodes) {
  const latestStock = {};
  const stockOnDate = {};
  const codeCol = headerMap["商品コード"];
  const qtyCol = headerMap["実在庫数"];
  const tsCol = headerMap["タイムスタンプ"];
  if (tsCol === undefined) {
    return { latestStock, stockOnDate };
  }
  const baseDateYMD = formatDateToYMD(baseDate);
  data.forEach(row => {
    const code = normalize(row[codeCol]);
    if (!code) return;
    const rawTimestamp = row[tsCol];
    if (!rawTimestamp) return;
    const timestamp = new Date(rawTimestamp);
    if (isNaN(timestamp.getTime())) return;
    const timestampYMD = formatDateToYMD(timestamp);
    if (timestampYMD === baseDateYMD) {
      stockOnDate[code] = Number(row[qtyCol]) || 0;
    }
    // latestStockは計算対象日より前の最新在庫とする
    if (managedCodes.has(code) && timestamp < baseDate) {
      if (!latestStock[code] || timestamp > latestStock[code].timestamp) {
        latestStock[code] = { qty: Number(row[qtyCol]) || 0, date: getStartOfDay(timestamp), timestamp: timestamp };
      }
    }
  });
  return { latestStock, stockOnDate };
}
function getOldestValidExpirationDate(productCode, deliveryData, deliveryHeaderMap, recoveryData, recoveryHeaderMap) {
  const deliveryExpCol = deliveryHeaderMap["賞味期限"];
  const recoveryExpCol = recoveryHeaderMap["賞味期限"];
  if (deliveryExpCol === undefined || recoveryExpCol === undefined) return null;
  const recoveredDates = new Set();
  recoveryData.slice(1).forEach(row => {
    if (normalize(row[recoveryHeaderMap["商品コード"]]) === productCode && row[recoveryExpCol]) {
      recoveredDates.add(formatDateToYMD(row[recoveryExpCol]));
    }
  });
  let oldestDate = null;
  deliveryData.slice(1).forEach(row => {
    if (normalize(row[deliveryHeaderMap["商品コード"]]) === productCode && row[deliveryExpCol]) {
      const expDate = new Date(row[deliveryExpCol]);
      if (!recoveredDates.has(formatDateToYMD(expDate))) {
        if (!oldestDate || expDate.getTime() < oldestDate.getTime()) {
          oldestDate = expDate;
        }
      }
    }
  });
  return oldestDate;
}
function findEarliestTransactionDate() {
  let earliestDate = new Date();
  const sheetsToScan = [
    { id: CONFIG.deliverySheetId, name: CONFIG.deliverySheetName, dateCol: "納品日" },
    { id: CONFIG.salesSheetId, name: CONFIG.salesSheetName, dateCol: "売上日" },
    { id: CONFIG.recoverySheetId, name: CONFIG.recoverySheetName, dateCol: "回収日" },
    { id: CONFIG.actualStockSheetId, name: CONFIG.actualStockSheetName, dateCol: "タイムスタンプ" },
  ];
  sheetsToScan.forEach(sheetInfo => {
    const data = getSheetData(sheetInfo.id, sheetInfo.name);
    if (!data || data.length <= 1) return;
    const headerMap = createHeaderMap(data[0]);
    const dateColIndex = headerMap[sheetInfo.dateCol];
    if (dateColIndex === undefined) return;
    data.slice(1).forEach(row => {
      if (row[dateColIndex]) {
        const transactionDate = getStartOfDay(new Date(row[dateColIndex]));
        if (transactionDate < earliestDate) {
          earliestDate = transactionDate;
        }
      }
    });
  });
  return earliestDate;
}

// ===================================================================================
// ヘルパー関数（ユーティリティ）
// ===================================================================================

function deleteRowsByDateRange(sheet, startDate, endDate, dateColIndex) {
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];
  const startYMD = getStartOfDay(startDate).getTime();
  const endYMD = getStartOfDay(endDate).getTime();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = data[i][dateColIndex];
    if (rowDate) {
      const rowDateTime = getStartOfDay(new Date(rowDate)).getTime();
      if (rowDateTime >= startYMD && rowDateTime <= endYMD) {
        rowsToDelete.push(i + 1);
      }
    }
  }
  rowsToDelete.forEach(rowNum => sheet.deleteRow(rowNum));
  if (rowsToDelete.length > 0) {
    Logger.log(`${formatDateToYMD(startDate)}から${formatDateToYMD(endDate)}までの既存データ ${rowsToDelete.length} 行を削除しました。`);
  }
}

function deleteRowsByDate(sheet, dateToDelete, dateColIndex) {
  deleteRowsByDateRange(sheet, dateToDelete, dateToDelete, dateColIndex);
}

function createSheetRows(calculatedInventories, productInfoMap, date, headerMap, headerLength) {
  const newRows = [];
  const dateFormatted = formatDateToYMD(date);
  for (const code in calculatedInventories) {
    const result = calculatedInventories[code];
    const productInfo = productInfoMap[code];
    const newRow = new Array(headerLength).fill("");

    if (headerMap["日付"] !== undefined) newRow[headerMap["日付"]] = dateFormatted;
    if (headerMap["商品コード"] !== undefined) newRow[headerMap["商品コード"]] = code;
    if (productInfo) {
      if (headerMap["netDoA商品コード"] !== undefined) newRow[headerMap["netDoA商品コード"]] = productInfo.netDoAProductCode || "";
      if (headerMap["商品名"] !== undefined) newRow[headerMap["商品名"]] = productInfo.productName || "";
    }

    // 在庫数は、実在庫が登録されていればそれを、なければ理論在庫を表示する
    let inventoryValue = result.inventory;
    if (result.actualStockOnDate !== undefined && result.actualStockOnDate !== null) {
      inventoryValue = result.actualStockOnDate;
    }
    if (headerMap["在庫数"] !== undefined) newRow[headerMap["在庫数"]] = inventoryValue;

    // 在庫割合も、表示された在庫数に基づいて計算する
    if (headerMap["在庫割合"] !== undefined) {
      const inventoryRatio = (productInfo.standardStock > 0) ? (inventoryValue / productInfo.standardStock) * 100 : null;
      newRow[headerMap["在庫割合"]] = inventoryRatio === null ? "N/A" : inventoryRatio.toFixed(2);
    }
    
    // 差異が計算された日のみ、関連する値を記録
    if (result.discrepancy !== null) {
      if (headerMap["理論在庫"] !== undefined) {
        newRow[headerMap["理論在庫"]] = result.yesterdayTheoreticalStock;
      }
      if (headerMap["実在庫数"] !== undefined) {
        newRow[headerMap["実在庫数"]] = result.actualStockOnDate;
      }
      if (headerMap["差異"] !== undefined) {
        newRow[headerMap["差異"]] = result.discrepancy;
      }
    }

    if (headerMap["賞味期限"] !== undefined) newRow[headerMap["賞味期限"]] = result.oldestExpirationDate ? formatDateToYMD(result.oldestExpirationDate) : "";
    if (headerMap["販売可能日数"] !== undefined) newRow[headerMap["販売可能日数"]] = result.daysUntilSalePossible;
    if (headerMap["直近の実在庫確認日"] !== undefined) newRow[headerMap["直近の実在庫確認日"]] = result.baseDate ? formatDateToYMD(result.baseDate) : "";
    
    newRows.push(newRow);
  }
  return newRows;
}

function getSheetData(fileId, sheetName) {
  try {
    const ss = SpreadsheetApp.openById(fileId);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`シート '${sheetName}' (ID: ${fileId}) が見つかりません。`);
    return sheet.getDataRange().getValues();
  } catch (e) {
    Logger.log(`シートデータ取得エラー: ${e.message}`);
    return null;
  }
}

const formatDateToYMD = value => {
  if (!value) return "";
  return Utilities.formatDate(new Date(value), Session.getScriptTimeZone(), "yyyy-MM-dd");
};

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const normalize = value => (value || "").toString().trim();