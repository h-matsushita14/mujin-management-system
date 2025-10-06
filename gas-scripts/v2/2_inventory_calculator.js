/**
 * @fileoverview
 * 在庫サマリを計算するためのスクリプト。
 * 更新モード（90日/全期間）はトランザクション集約の範囲のみを決定し、
 * 在庫サマリ計算は常に同じルールで実行される。
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
  const response = ui.alert('在庫サマリ更新', `トランザクションを直近${CALC_CONFIG.defaultUpdateDays}日で集約し、在庫サマリを更新します。よろしいですか？`, ui.ButtonSet.OK_CANCEL);
  if (response !== ui.Button.OK) return;
  executeCalculation('90日更新');
}

function recalculateAllSummary() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('全期間 在庫サマリ再計算', '全てのトランザクションを集約し、在庫サマリを再計算します。よろしいですか？', ui.ButtonSet.OK_CANCEL);
  if (response !== ui.Button.OK) return;
  executeCalculation('全期間更新');
}

function executeCalculation(processName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast(`処理を開始しました... [${processName}]`, '在庫計算', -1);
  Logger.log(`${processName}を開始します。`);

  try {
    aggregateTransactions(ss, processName);
    calculateAndWriteSummary(ss);
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

function aggregateTransactions(ss, processName) {
  ss.toast('ステップ1/2: トランザクションを集約中...');
  Logger.log(`ステップ1: トランザクションの集約を開始します。モード: ${processName}`);
  const destinationSheet = ss.getSheetByName(CALC_CONFIG.integrationSheetName);
  if (!destinationSheet) throw new Error(`集約シートが見つかりません: ${CALC_CONFIG.integrationSheetName}`);

  destinationSheet.getRange(2, 1, destinationSheet.getMaxRows() - 1, destinationSheet.getMaxColumns()).clearContent();

  const allTransactions = [];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - CALC_CONFIG.defaultUpdateDays);

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
      const transactionDate = new Date(row[dateColIdx]);
      if (!row[dateColIdx] || !row[codeColIdx] || row[qtyColIdx] === '' || isNaN(transactionDate.getTime())) continue;

      if (processName === '90日更新' && transactionDate < ninetyDaysAgo) {
        continue;
      }

      const expirationDate = expColIdx !== -1 && row[expColIdx] ? new Date(row[expColIdx]) : '';
      allTransactions.push([
        Utilities.getUuid(), new Date(), transactionDate,
        row[codeColIdx], config.type, Number(row[qtyColIdx]) * config.sign,
        expirationDate, '',
      ]);
    }
  }

  const stocktakeSheet = ss.getSheetByName(CALC_CONFIG.stocktakeSheetName);
  if (stocktakeSheet && stocktakeSheet.getLastRow() > 1) {
    const headers = stocktakeSheet.getRange(1, 1, 1, stocktakeSheet.getLastColumn()).getValues()[0];
    const dateColIdx = headers.indexOf('棚卸日時');
    const codeColIdx = headers.indexOf('商品コード');
    const qtyColIdx = headers.indexOf('実在庫数');

    if (dateColIdx !== -1 && codeColIdx !== -1 && qtyColIdx !== -1) {
      const data = stocktakeSheet.getRange(2, 1, stocktakeSheet.getLastRow() - 1, stocktakeSheet.getLastColumn()).getValues();
      for (const row of data) {
        if (!row[dateColIdx] || !row[codeColIdx] || row[qtyColIdx] === '') continue;
        allTransactions.push([
          Utilities.getUuid(), new Date(), new Date(row[dateColIdx]),
          row[codeColIdx], '棚卸', Number(row[qtyColIdx]),
          '', '',
        ]);
      }
    }
  }

  if (allTransactions.length > 0) {
    allTransactions.sort((a, b) => a[2] - b[2]);
    destinationSheet.getRange(2, 1, allTransactions.length, 8).setValues(allTransactions);
    Logger.log(`${allTransactions.length}件のトランザクションを集約しました。`);
  }
  Logger.log('ステップ1: 完了');
}

function calculateAndWriteSummary(ss) {
  ss.toast('ステップ2/2: 在庫サマリを計算中...');
  Logger.log('ステップ2: 在庫サマリの計算を開始します。');

  const productInfo = getProductInfo(ss.getSheetByName(CALC_CONFIG.productMasterSheetName));
  const allManagedProductCodes = Object.keys(productInfo);
  if (allManagedProductCodes.length === 0) {
    Logger.log('在庫サマリ計算対象の商品が見つかりませんでした。');
    return;
  }
  Logger.log(`在庫サマリ計算対象の商品が ${allManagedProductCodes.length} 件見つかりました。`);

  const sheets = {
    integration: ss.getSheetByName(CALC_CONFIG.integrationSheetName),
    summary: ss.getSheetByName(CALC_CONFIG.summarySheetName),
    stocktake: ss.getSheetByName(CALC_CONFIG.stocktakeSheetName),
  };
  for (const key in sheets) {
    if (!sheets[key]) throw new Error(`シートが見つかりません: ${key}`);
  }

  const transactions = sheets.integration.getLastRow() > 1 ? sheets.integration.getRange(2, 1, sheets.integration.getLastRow() - 1, 8).getValues() : [];
  const stocktakes = sheets.stocktake.getLastRow() > 1 ? sheets.stocktake.getRange(2, 1, sheets.stocktake.getLastRow() - 1, sheets.stocktake.getLastColumn()).getValues() : [];
  const stHeaders = sheets.stocktake.getRange(1, 1, 1, sheets.stocktake.getLastColumn()).getValues()[0];
  
  // 1. 全社共通の「基本の起点日」を決定
  const commonStartDate = getCommonStartDate(stocktakes, stHeaders.indexOf('棚卸日時'));

  // 2. 各商品の起点から今日まですべて計算する
  const allSummaryRows = calculateDailySummary(
    new Date(), allManagedProductCodes, transactions, stocktakes, stHeaders, productInfo, commonStartDate
  );

  // 3. 表示開始日を「90日前」に設定
  const displayStartDate = new Date();
  displayStartDate.setDate(displayStartDate.getDate() - CALC_CONFIG.defaultUpdateDays);

  // 4. 計算結果から表示期間でフィルタリングする
  const finalRows = allSummaryRows.filter(row => {
    const rowDate = new Date(row[0]);
    return toYMD(rowDate) >= toYMD(displayStartDate);
  });

  // 5. シートをクリアして書き込む
  if (sheets.summary.getLastRow() > 1) {
    sheets.summary.getRange(2, 1, sheets.summary.getMaxRows() - 1, 7).clearContent();
  }
  if (finalRows.length > 0) {
    sheets.summary.getRange(2, 1, finalRows.length, 7).setValues(finalRows);
    sheets.summary.sort(1, true);
  }

  Logger.log('在庫サマリの計算と書き込みが完了しました。');
}

function calculateDailySummary(endDate, targetProductCodes, transactions, stocktakes, stHeaders, productInfo, commonStartDate) {
  const managedProductCodes = new Set(targetProductCodes);
  const allSummaryRows = [];

  const { dailyTransactions } = getDailyTransactions(transactions, managedProductCodes);
  const stDateIdx = stHeaders.indexOf('棚卸日時');
  const stCodeIdx = stHeaders.indexOf('商品コード');
  const stQtyIdx = stHeaders.indexOf('実在庫数');
  const { dailyStocktakes } = getDailyStocktakes(stocktakes, managedProductCodes, stDateIdx, stCodeIdx, stQtyIdx);
  
  const oldestExpirations = getOldestExpirationDates(managedProductCodes, transactions);

  for (const code of managedProductCodes) {
    const startPoint = getCalculationStartPoint(code, commonStartDate, stocktakes, stDateIdx, stCodeIdx, stQtyIdx, transactions);
    if (!startPoint) continue;

    let theoreticalStock = 0;

    for (let d = new Date(startPoint.date); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = toYMD(d);
      const transQty = (dailyTransactions[dateStr]?.[code]?.total || 0);
      const stocktakeInfo = dailyStocktakes[dateStr]?.[code];
      
      let discrepancy = null;
      let closingStock;

      if (toYMD(d) === toYMD(startPoint.date)) {
        if (startPoint.type === 'stocktake') {
          discrepancy = null;
          closingStock = startPoint.qty + transQty;
        } else { // 'delivery'
          discrepancy = null;
          closingStock = 0 + transQty;
        }
      } else {
        if (stocktakeInfo !== undefined) {
          discrepancy = stocktakeInfo - theoreticalStock;
          closingStock = stocktakeInfo + transQty;
        } else {
          closingStock = theoreticalStock + transQty;
        }
      }

      const oldestExpiration = oldestExpirations[code] || '';
      let daysToSell = '';

      if (oldestExpiration && productInfo[code] && productInfo[code].shelfLife) {
        const shelfLifeDays = productInfo[code].shelfLife;
        const expirationDate = new Date(oldestExpiration);
        
        const sellByDate = new Date(expirationDate.getTime());
        sellByDate.setDate(sellByDate.getDate() - Math.floor(shelfLifeDays / 3));

        const diffTime = sellByDate.getTime() - d.getTime();
        daysToSell = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      allSummaryRows.push([
        new Date(d), code, closingStock, 
        stocktakeInfo !== undefined ? stocktakeInfo : '', 
        discrepancy !== null ? discrepancy : '', 
        oldestExpiration, daysToSell
      ]);

      theoreticalStock = closingStock;
    }
  }
  return allSummaryRows;
}

// ===================================================================================
// ヘルパー関数群
// ===================================================================================

function getCommonStartDate(stocktakes, stDateIdx) {
  if (stDateIdx === -1 || !stocktakes || stocktakes.length === 0) {
    return null;
  }
  const uniqueDates = [...new Set(stocktakes.map(row => toYMD(new Date(row[stDateIdx]))).filter(d => d))];
  uniqueDates.sort((a, b) => b.localeCompare(a)); // YYYY-MM-DD形式の文字列を降順ソート

  if (uniqueDates.length >= 12) {
    return new Date(uniqueDates[11]);
  }
  return null;
}

function getProductInfo(sheet) {
  const productInfo = {};
  if (!sheet || sheet.getLastRow() < 2) return productInfo;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const codeIdx = headers.indexOf('商品コード');
  const mgmtIdx = headers.indexOf('在庫管理対象');
  const shelfLifeIdx = headers.indexOf('賞味日数');

  if (codeIdx === -1 || mgmtIdx === -1 || shelfLifeIdx === -1) {
    throw new Error('M_商品シートのヘッダー列（商品コード, 在庫管理対象, 賞味日数）が見つかりません。');
  }

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  data.forEach(row => {
    const code = row[codeIdx];
    if (code && row[mgmtIdx] === true) {
      productInfo[code] = { shelfLife: row[shelfLifeIdx] || 0 };
    }
  });
  return productInfo;
}

function getDailyTransactions(transactions, codes) {
  const daily = {};
  for (const trans of transactions) {
    const date = new Date(trans[2]);
    const code = String(trans[3]);
    const type = trans[4];
    const qty = trans[5];

    if (!codes.has(code) || isNaN(date.getTime()) || type === '棚卸') continue;

    const dateStr = toYMD(date);
    if (!dateStr) continue;

    if (!daily[dateStr]) daily[dateStr] = {};
    if (!daily[dateStr][code]) daily[dateStr][code] = { total: 0 };
    
    daily[dateStr][code].total += qty;
  }
  return { dailyTransactions: daily };
}

function getDailyStocktakes(stocktakes, codes, dateIdx, codeIdx, qtyIdx) {
  const daily = {};
  if (dateIdx === -1 || codeIdx === -1 || qtyIdx === -1) return { dailyStocktakes: daily };
  
  for (const st of stocktakes) {
    const date = new Date(st[dateIdx]);
    const code = String(st[codeIdx]);
    if (!codes.has(code) || isNaN(date.getTime())) continue;
    
    const dateStr = toYMD(date);
    if (!daily[dateStr]) daily[dateStr] = {};
    daily[dateStr][code] = st[qtyIdx];
  }
  return { dailyStocktakes: daily };
}

function getCalculationStartPoint(code, commonStartDate, stocktakes, stDateIdx, stCodeIdx, stQtyIdx, transactions) {
  const productStocktakes = [];
  if (stDateIdx !== -1 && stCodeIdx !== -1 && stQtyIdx !== -1) {
    for (const st of stocktakes) {
      if (String(st[stCodeIdx]) === code) {
        const stDate = new Date(st[stDateIdx]);
        if (!isNaN(stDate.getTime())) {
          productStocktakes.push({ date: stDate, qty: st[stQtyIdx] });
        }
      }
    }
  }

  if (commonStartDate && productStocktakes.length >= 13) {
    let qtyOnCommonDate = 0;
    const commonDateStr = toYMD(commonStartDate);
    for (const pst of productStocktakes) {
      if (toYMD(pst.date) === commonDateStr) {
        qtyOnCommonDate = pst.qty;
        break;
      }
    }
    return { date: commonStartDate, qty: qtyOnCommonDate, type: 'stocktake' };
  }

  let firstDelivery = null;
  for (const trans of transactions) {
    if (String(trans[3]) === code && trans[4] === '納品') {
      const deliveryDate = new Date(trans[2]);
      if (!isNaN(deliveryDate.getTime())) {
        if (!firstDelivery || deliveryDate < firstDelivery.date) {
          firstDelivery = { date: deliveryDate, qty: 0, type: 'delivery' };
        }
      }
    }
  }
  return firstDelivery;
}

function getOldestExpirationDates(managedProductCodes, transactions) {
  const lotInventories = {};

  for (const trans of transactions) {
    const code = String(trans[3]);
    const type = trans[4];
    const qty = trans[5];
    const expDateStr = trans[6] ? toYMD(new Date(trans[6])) : null;

    if (!managedProductCodes.has(code) || !expDateStr || (type !== '納品' && type !== '回収')) continue;
    
    const lotKey = `${code}-${expDateStr}`;
    if (!lotInventories[lotKey]) lotInventories[lotKey] = 0;
    lotInventories[lotKey] += qty;
  }

  const remainingLots = {};
  for (const lotKey in lotInventories) {
    if (lotInventories[lotKey] > 0) {
      const [code, expDateStr] = lotKey.split(/-(.*)/s);
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

function toYMD(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) throw new Error(`Invalid date: ${date}`);
    return Utilities.formatDate(d, 'JST', 'yyyy-MM-dd');
  } catch (e) {
    Logger.log(e.message);
    return '';
  }
}