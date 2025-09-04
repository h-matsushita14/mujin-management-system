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
  const today = new Date();

  // 1. 全てのマスターデータを取得
  const actualData = getSheetData(CONFIG.actualStockSheetId, CONFIG.actualStockSheetName);
  const deliveryData = getSheetData(CONFIG.deliverySheetId, CONFIG.deliverySheetName);
  const salesData = getSheetData(CONFIG.salesSheetId, CONFIG.salesSheetName);
  const recoveryData = getSheetData(CONFIG.recoverySheetId, CONFIG.recoverySheetName);
  const productMasterData = getSheetData(CONFIG.productMasterSheetId, CONFIG.productMasterSheetName);

  if (!actualData || !deliveryData || !salesData || !recoveryData || !productMasterData) {
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

  const productMasterHeaderMap = {};
  productMasterData[0].forEach((h, i) => productMasterHeaderMap[normalize(h)] = i);

  // 商品マスターから商品情報を取得
  const productInfoMap = {};
  const inventoryManagementCol = productMasterHeaderMap["在庫管理"];
  const standardStockCol = productMasterHeaderMap["基準在庫"];
  const alertDaysCol = productMasterHeaderMap["アラート日数"];

  productMasterData.slice(1).forEach(row => {
    const code = normalize(row[productMasterHeaderMap["商品コード"]]);
    const inventoryManagement = normalize(row[inventoryManagementCol]);

    if (code && inventoryManagement === "有") {
      productInfoMap[code] = {
        productName: row[productMasterHeaderMap["商品名"]],
        netDoAProductCode: row[productMasterHeaderMap["netDoA商品コード"]],
        shelfLifeDays: row[productMasterHeaderMap["賞味期限（日数）"]],
        standardStock: Number(row[standardStockCol]) || 0,
        alertDays: Number(row[alertDaysCol]) || 0,
      };
    }
  });

  // 在庫管理「有」の商品コードのみを対象とする
  const managedProductCodes = new Set(Object.keys(productInfoMap));
  Logger.log(`Managed Product Codes (count): ${managedProductCodes.size}`);

  const allProductCodes = new Set();
  const addCodeIfExists = (data, headerMap, codeHeader) => {
    data.slice(1).forEach(row => {
      const code = normalize(row[headerMap[codeHeader]]);
      if (managedProductCodes.has(code)) {
        allProductCodes.add(code);
      }
    });
  };

  addCodeIfExists(actualData, actualHeaderMap, "商品コード");
  addCodeIfExists(deliveryData, deliveryHeaderMap, "商品コード");
  addCodeIfExists(salesData, salesHeaderMap, "商品コード");
  addCodeIfExists(recoveryData, recoveryHeaderMap, "商品コード");
  managedProductCodes.forEach(code => allProductCodes.add(code));
  Logger.log(`Final All Product Codes (count): ${allProductCodes.size}`);

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

    if (!baseDate) {
      currentInventoryResults[productCode] = { inventory: 0, baseDate: null, latestSalesDate: null };
      return;
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

    let latestSalesDate = null;
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
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysUntilSalePossible = diffDays - productMasterInfo.alertDays;
    }

    currentInventoryResults[productCode] = {
      inventory: currentInventory,
      baseDate: baseDate,
      latestSalesDate: latestSalesDate,
      inventoryRatio: inventoryRatio,
      oldestExpirationDate: oldestExpirationDate,
      daysUntilSalePossible: daysUntilSalePossible,
    };
  });

  return {
    calculatedInventories: currentInventoryResults,
    productInfoMap: productInfoMap,
    scriptExecutionDate: today
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
  const deliveryExpirationCol = deliveryHeaderMap["賞味期限"];
  const recoveryExpirationCol = recoveryHeaderMap["賞味期限"];

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
 * WebアプリからのGETリクエストを処理するメイン関数。
 * pageパラメータに応じて、異なるデータをJSON形式で返します。
 * @param {Object} e - Apps Scriptのイベントオブジェクト。
 * @returns {ContentService.TextOutput} JSON形式のテキスト出力。
 */
function doGet(e) {
  try {
    const page = e.parameter.page;
    let data;

    switch (page) {
      case 'inventory_latest':
        data = getLatestInventory();
        break;
      case 'managed_products':
        data = getManagedProducts();
        break;
      case 'inventory_history':
        const productCode = e.parameter.productCode;
        if (!productCode) {
          throw new Error('productCodeパラメータが必要です。');
        }
        data = getInventoryHistory(productCode);
        break;
      case 'discrepancy_history':
        data = getDiscrepancyHistory();
        break;
      default:
        throw new Error('無効なpageパラメータです。');
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`doGet Error: ${error.message}`);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ヘッダー配列を{headerName: index}のマップに変換します。
 * @param {Array<string>} headers - ヘッダー行の配列。
 * @returns {Object} ヘッダー名と列インデックスのマップ。
 */
function createHeaderMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    if (h) map[normalize(h)] = i;
  });
  return map;
}

/**
 * 在庫_一覧シートから最新日付の在庫データを取得します。
 * @returns {Array<Object>} 最新の在庫データオブジェクトの配列。
 */
function getLatestInventory() {
  const sheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
  if (!sheet) throw new Error('在庫_一覧シートが見つかりません。');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // ヘッダーのみか空

  const headers = data.shift(); // ヘッダー行を削除し、データ行のみにする
  const headerMap = createHeaderMap(headers);
  const dateCol = headerMap['日付'];
  if (dateCol === undefined) throw new Error('在庫_一覧に「日付」列がありません。');

  // 最新の日付を見つける
  let latestDate = new Date(0);
  data.forEach(row => {
    const rowDate = new Date(row[dateCol]);
    if (rowDate > latestDate) {
      latestDate = rowDate;
    }
  });
  const latestDateStr = formatDateToYMD(latestDate);

  // 最新日付のデータのみをフィルタリング
  const latestData = data.filter(row => formatDateToYMD(new Date(row[dateCol])) === latestDateStr);

  // データをオブジェクトの配列に変換
  return latestData.map(row => {
    const rowObj = {};
    headers.forEach((header, i) => {
      rowObj[header] = row[i];
    });
    return rowObj;
  });
}

/**
 * 商品マスターから在庫管理が「有」の商品リストを取得します。
 * @returns {Array<Object>} 商品オブジェクト（商品コード、商品名）の配列。
 */
function getManagedProducts() {
  const data = getSheetData(CONFIG.productMasterSheetId, CONFIG.productMasterSheetName);
  if (!data || data.length < 2) return [];

  const headers = data.shift();
  const headerMap = createHeaderMap(headers);
  const codeCol = headerMap['商品コード'];
  const nameCol = headerMap['商品名'];
  const mgmtCol = headerMap['在庫管理'];

  if (codeCol === undefined || nameCol === undefined || mgmtCol === undefined) {
    throw new Error('商品マスターのヘッダーが正しくありません（商品コード, 商品名, 在庫管理）。');
  }

  return data
    .filter(row => row[mgmtCol] === '有')
    .map(row => ({
      productCode: row[codeCol],
      productName: row[nameCol]
    }));
}

/**
 * 特定商品の直近1ヶ月の在庫履歴を取得します。
 * @param {string} productCode - 商品コード。
 * @returns {Array<Object>} 在庫履歴オブジェクト（日付、在庫数）の配列。
 */
function getInventoryHistory(productCode) {
  const sheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
  if (!sheet) throw new Error('在庫_一覧シートが見つかりません。');
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data.shift();
  const headerMap = createHeaderMap(headers);
  const codeCol = headerMap['商品コード'];
  const dateCol = headerMap['日付'];
  const stockCol = headerMap['在庫数'];

  if (codeCol === undefined || dateCol === undefined || stockCol === undefined) {
    throw new Error('在庫_一覧のヘッダーが正しくありません（商品コード, 日付, 在庫数）。');
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  return data
    .filter(row => {
      const rowCode = row[codeCol]?.toString().trim();
      const rowDate = new Date(row[dateCol]);
      return rowCode === productCode && rowDate >= oneMonthAgo;
    })
    .map(row => ({
      date: formatDateToYMD(new Date(row[dateCol])),
      stock: row[stockCol]
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // 日付で昇順にソート
}

/**
 * 全商品の差異履歴を取得します。
 * @returns {Array<Object>} 差異履歴オブジェクトの配列。
 */
function getDiscrepancyHistory() {
  const sheet = SpreadsheetApp.openById(CONFIG.inventorySheetId).getSheetByName(CONFIG.inventorySheetName);
  if (!sheet) throw new Error('在庫_一覧シートが見つかりません。');

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data.shift();
  const headerMap = createHeaderMap(headers);
  const codeCol = headerMap['商品コード'];
  const nameCol = headerMap['商品名'];
  const dateCol = headerMap['日付'];
  const diffCol = headerMap['差異']; // Assuming '差異' is the header name

  if (codeCol === undefined || nameCol === undefined || dateCol === undefined || diffCol === undefined) {
    throw new Error('在庫_一覧のヘッダーが正しくありません（商品コード, 商品名, 日付, 差異）。');
  }

  return data
    .filter(row => row[diffCol] !== '' && row[diffCol] != 0) // 差異が空でなく、0でもない
    .map(row => ({
      productCode: row[codeCol],
      productName: row[nameCol],
      date: formatDateToYMD(new Date(row[dateCol])),
      difference: row[diffCol]
    }));
}
