/**
 * @fileoverview
 * 在庫サマリを計算するためのスクリプト。
 * 通常の更新（直近期間）と、全期間の再計算に対応する。
 */

// ===================================================================================
// グローバル設定
// ===================================================================================

const CALC_CONFIG = {
  sourceSheets: {
    'T_納品': { type: '納品', dateCol: '納品日', codeCol: '商品コード', qtyCol: '数量', expCol: '賞味期限', sign: 1 },
    'T_販売': { type: '販売', dateCol: '売上日', codeCol: '商品コード', qtyCol: '売上点数', expCol: null, sign: -1 },
    'T_回収': { type: '回収', dateCol: '回収日', codeCol: '商品コード', qtyCol: '数量', expCol: '賞味期限', sign: -1 },
  },
  integrationSheetName: 'S_統合在庫トランザクション',
  summarySheetName: 'S_日次在庫サマリ',
  productMasterSheetName: 'M_商品',
  stocktakeSheetName: 'T_棚卸',
  defaultUpdateDays: 90,
};

// ===================================================================================
// メイン関数（UIから呼び出される）
// ===================================================================================

function updateFastSummary() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('在庫サマリ更新', `直近${CALC_CONFIG.defaultUpdateDays}日間の在庫サマリを更新します。よろしいですか？`, ui.ButtonSet.OK_CANCEL);
  if (response !== ui.Button.OK) return;

  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - CALC_CONFIG.defaultUpdateDays);

  executeCalculation('通常更新', startDate, today);
}

function recalculateAllSummary() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('全期間 在庫サマリ再計算', '全ての期間を対象に在庫を再計算します。データ量によっては時間がかかります。よろしいですか？', ui.ButtonSet.OK_CANCEL);
  if (response !== ui.Button.OK) return;

  executeCalculation('全期間再計算', null, new Date());
}

function executeCalculation(processName, startDate, endDate) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast(`処理を開始しました... [${processName}]`, '在庫計算', -1);
  Logger.log(`${processName}を開始します。`);

  try {
    aggregateTransactions(ss);
    calculateDailySummary(ss, startDate, endDate);
    ss.toast('処理が正常に完了しました。', '在庫計算', 5);
    Logger.log(`${processName}が正常に完了しました。`);
    SpreadsheetApp.getUi().alert(`${processName}が完了しました。`);
  } catch (e) {
    Logger.log(`エラーが発生しました: ${e.message}\n${e.stack}`);
    ss.toast('エラーが発生しました。詳細はログを確認してください。', '在庫計算', 5);
    SpreadsheetApp.getUi().alert(`エラーが発生しました: ${e.message}`);
  }
}

// ===================================================================================
// 計算ロジック本体
// ===================================================================================

function aggregateTransactions(ss) {
  ss.toast('ステップ1/2: トランザクションを集約中...');
  Logger.log('ステップ1: トランザクションの集約を開始します。');
  const destinationSheet = ss.getSheetByName(CALC_CONFIG.integrationSheetName);
  if (!destinationSheet) throw new Error(`集約シートが見つかりません: ${CALC_CONFIG.integrationSheetName}`);

  destinationSheet.getRange(2, 1, destinationSheet.getMaxRows() - 1, destinationSheet.getMaxColumns()).clearContent();

  const allTransactions = [];
  for (const sheetName in CALC_CONFIG.sourceSheets) {
    const config = CALC_CONFIG.sourceSheets[sheetName];
    const sourceSheet = ss.getSheetByName(sheetName);
    if (!sourceSheet || sourceSheet.getLastRow() < 2) continue;

    const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
    const dateColIdx = headers.indexOf(config.dateCol);
    const codeColIdx = headers.indexOf(config.codeCol);
    const qtyColIdx = headers.indexOf(config.qtyCol);
    const expColIdx = config.expCol ? headers.indexOf(config.expCol) : -1;

    if (dateColIdx === -1 || codeColIdx === -1 || qtyColIdx === -1) {
      Logger.log(`警告: ${sheetName} のヘッダーが不正です。スキップします。`);
      continue;
    }

    const data = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
    for (const row of data) {
      if (!row[dateColIdx] || !row[codeColIdx] || row[qtyColIdx] === '') continue;
      const expirationDate = expColIdx !== -1 && row[expColIdx] ? new Date(row[expColIdx]) : '';
      allTransactions.push([
        Utilities.getUuid(), new Date(), new Date(row[dateColIdx]),
        row[codeColIdx], config.type, Number(row[qtyColIdx]) * config.sign,
        expirationDate, '', // 賞味期限, 担当者コード (TODO)
      ]);
    }
  }

  if (allTransactions.length > 0) {
    allTransactions.sort((a, b) => a[2] - b[2]);
    destinationSheet.getRange(2, 1, allTransactions.length, 8).setValues(allTransactions);
    Logger.log(`${allTransactions.length}件のトランザクションを集約しました。`);
  }
  Logger.log('ステップ1: 完了');
}

function calculateDailySummary(ss, startDate, endDate) {
  ss.toast('ステップ2/2: 在庫サマリを計算中...');
  Logger.log(`在庫サマリ計算を開始。期間: ${startDate ? toYMD(startDate) : '最古'} ~ ${toYMD(endDate)}`);

  const sheets = {
    integration: ss.getSheetByName(CALC_CONFIG.integrationSheetName),
    summary: ss.getSheetByName(CALC_CONFIG.summarySheetName),
    productMaster: ss.getSheetByName(CALC_CONFIG.productMasterSheetName),
    stocktake: ss.getSheetByName(CALC_CONFIG.stocktakeSheetName),
  };
  for (const key in sheets) {
    if (!sheets[key]) throw new Error(`シートが見つかりません: ${key}`);
  }

  const managedProductCodes = getManagedProductCodes(sheets.productMaster);
  const transactions = sheets.integration.getLastRow() > 1 ? sheets.integration.getRange(2, 1, sheets.integration.getLastRow() - 1, 8).getValues() : [];
  const stocktakes = sheets.stocktake.getLastRow() > 1 ? sheets.stocktake.getRange(2, 1, sheets.stocktake.getLastRow() - 1, sheets.stocktake.getLastColumn()).getValues() : [];
  const stHeaders = sheets.stocktake.getRange(1, 1, 1, sheets.stocktake.getLastColumn()).getValues()[0];
  const stDateIdx = stHeaders.indexOf('棚卸日時'), stCodeIdx = stHeaders.indexOf('商品コード'), stQtyIdx = stHeaders.indexOf('実在庫数');

  const { dailyTransactions, firstTransactionDate } = getDailyTransactions(transactions, managedProductCodes);
  const { dailyStocktakes, firstStocktakeDate } = getDailyStocktakes(stocktakes, managedProductCodes, stDateIdx, stCodeIdx, stQtyIdx);
  
  const actualStartDate = startDate ? startDate : (firstTransactionDate < firstStocktakeDate ? firstTransactionDate : new Date());
  const today = endDate;
  const summaryRows = [];

  const initialStocks = getInitialStocks(startDate, sheets.summary, managedProductCodes);
  const oldestExpirations = getOldestExpirationDates(managedProductCodes, transactions);

  for (const code of managedProductCodes) {
    let currentStock = initialStocks[code] || 0;
    let loopStartDate = actualStartDate;
    
    if (!startDate) {
      const startPoint = getCalculationStartPoint(code, stocktakes, stDateIdx, stCodeIdx, stQtyIdx, transactions);
      if (!startPoint || !startPoint.date) continue;
      loopStartDate = startPoint.date;
      currentStock = startPoint.qty;
    }

    for (let d = new Date(loopStartDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dateStr = toYMD(d);
      const dailyTransQty = dailyTransactions[dateStr]?.[code] || 0;
      const stocktakeInfo = dailyStocktakes[dateStr]?.[code];
      let discrepancy = null, finalStock;

      if (stocktakeInfo !== undefined) {
        discrepancy = stocktakeInfo - currentStock;
        finalStock = stocktakeInfo + dailyTransQty;
      } else {
        finalStock = currentStock + dailyTransQty;
      }

      const oldestExpiration = oldestExpirations[code] || '';
      let daysToExpire = '';
      if (oldestExpiration) {
        const diffTime = new Date(oldestExpiration).getTime() - d.getTime();
        daysToExpire = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      summaryRows.push([new Date(d), code, finalStock, stocktakeInfo !== undefined ? stocktakeInfo : '', discrepancy !== null ? discrepancy : '', oldestExpiration, daysToExpire]);
      currentStock = finalStock;
    }
  }

  deleteSummaryRows(sheets.summary, actualStartDate, today);
  if (summaryRows.length > 0) {
    sheets.summary.getRange(sheets.summary.getLastRow() + 1, 1, summaryRows.length, 7).setValues(summaryRows);
    sheets.summary.sort(1, true);
  }

  Logger.log('在庫サマリ計算完了');
}

// ===================================================================================
// ヘルパー関数群
// ===================================================================================

function getManagedProductCodes(sheet) {
  if (sheet.getLastRow() < 2) return new Set();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const codeIdx = headers.indexOf('商品コード');
  const mgmtIdx = headers.indexOf('在庫管理対象');
  if (codeIdx === -1 || mgmtIdx === -1) return new Set();
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  return new Set(data.filter(row => row[mgmtIdx] === true).map(row => row[codeIdx]));
}

function getDailyTransactions(transactions, codes) {
  const daily = {};
  let firstDate = new Date(8640000000000000); // Max date
  for (const trans of transactions) {
    const date = new Date(trans[2]), code = trans[3], qty = trans[5];
    if (!codes.has(code)) continue;
    if (date < firstDate) firstDate = date;
    const dateStr = toYMD(date);
    if (!daily[dateStr]) daily[dateStr] = {};
    if (!daily[dateStr][code]) daily[dateStr][code] = 0;
    daily[dateStr][code] += qty;
  }
  return { dailyTransactions: daily, firstTransactionDate: firstDate };
}

function getDailyStocktakes(stocktakes, codes, dateIdx, codeIdx, qtyIdx) {
  const daily = {};
  let firstDate = new Date(8640000000000000); // Max date
  for (const st of stocktakes) {
    const date = new Date(st[dateIdx]);
    if (isNaN(date.getTime())) continue;
    if (date < firstDate) firstDate = date;
    const dateStr = toYMD(date), code = st[codeIdx];
    if (!codes.has(code)) continue;
    if (!daily[dateStr]) daily[dateStr] = {};
    daily[dateStr][code] = st[qtyIdx];
  }
  return { dailyStocktakes: daily, firstStocktakeDate: firstDate };
}

function getInitialStocks(startDate, summarySheet, managedProductCodes) {
  const initialStocks = {};
  for (const code of managedProductCodes) initialStocks[code] = 0;
  if (!startDate || summarySheet.getLastRow() < 2) return initialStocks;

  const summaryData = summarySheet.getRange(2, 1, summarySheet.getLastRow() - 1, summarySheet.getLastColumn()).getValues();
  const summaryHeaders = summarySheet.getRange(1, 1, 1, summarySheet.getLastColumn()).getValues()[0];
  const sumDateIdx = summaryHeaders.indexOf('日付'), sumCodeIdx = summaryHeaders.indexOf('商品コード'), sumStockIdx = summaryHeaders.indexOf('理論在庫');
  if (sumDateIdx === -1 || sumCodeIdx === -1 || sumStockIdx === -1) return initialStocks;

  const targetDateStr = toYMD(new Date(startDate.getTime() - 24 * 60 * 60 * 1000));
  for (const row of summaryData) {
    if (toYMD(row[sumDateIdx]) === targetDateStr) {
      initialStocks[row[sumCodeIdx]] = row[sumStockIdx];
    }
  }
  return initialStocks;
}

function getCalculationStartPoint(code, stocktakes, stDateIdx, stCodeIdx, stQtyIdx, transactions) {
  let lastStocktake = null;
  for (const st of stocktakes) {
    if (st[stCodeIdx] === code) {
      const stDate = new Date(st[stDateIdx]);
      if (!isNaN(stDate.getTime()) && (!lastStocktake || stDate > lastStocktake.date)) {
        lastStocktake = { date: stDate, qty: st[stQtyIdx] };
      }
    }
  }
  if (lastStocktake) return lastStocktake;

  for (const trans of transactions) {
    if (trans[3] === code && trans[4] === '納品') {
      const firstDeliveryDate = new Date(trans[2]);
      if (!isNaN(firstDeliveryDate.getTime())) {
        return { date: firstDeliveryDate, qty: 0 };
      }
    }
  }
  return null;
}

function getOldestExpirationDates(managedProductCodes, transactions) {
  const deliveries = {};
  const recoveries = {};

  for (const trans of transactions) {
    const code = trans[3], type = trans[4], expDateStr = trans[6] ? toYMD(trans[6]) : null;
    if (!managedProductCodes.has(code) || !expDateStr) continue;

    const lotKey = `${code}-${expDateStr}`;
    if (type === '納品') {
      if (!deliveries[lotKey]) deliveries[lotKey] = 0;
      deliveries[lotKey] += trans[5];
    } else if (type === '回収') {
      if (!recoveries[lotKey]) recoveries[lotKey] = 0;
      recoveries[lotKey] += Math.abs(trans[5]);
    }
  }

  const remainingLots = {};
  for (const lotKey in deliveries) {
    const deliveryQty = deliveries[lotKey];
    const recoveryQty = recoveries[lotKey] || 0;
    if ((deliveryQty - recoveryQty) > 0) {
      const [code, expDateStr] = lotKey.split('-');
      if (!remainingLots[code]) remainingLots[code] = [];
      remainingLots[code].push(new Date(expDateStr));
    }
  }

  const oldestExpirations = {};
  for (const code in remainingLots) {
    remainingLots[code].sort((a, b) => a - b);
    oldestExpirations[code] = toYMD(remainingLots[code][0]);
  }
  return oldestExpirations;
}

function deleteSummaryRows(sheet, startDate, endDate) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const values = range.getValues();

  const start = startDate.getTime();
  const end = endDate.getTime();

  const keptValues = values.filter(row => {
    if (!row[0] || isNaN(new Date(row[0]).getTime())) return true; // Keep rows with invalid or no date
    const rowDate = new Date(row[0]).getTime();
    return rowDate < start || rowDate > end;
  });

  range.clearContent();

  if (keptValues.length > 0) {
    sheet.getRange(2, 1, keptValues.length, keptValues[0].length).setValues(keptValues);
  }
}

function toYMD(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) throw new Error(`Invalid date: ${date}`);
    d.setHours(d.getHours() + 9); // JSTに補正
    return d.toISOString().slice(0, 10);
  } catch (e) {
    Logger.log(e.message);
    return '';
  }
}
