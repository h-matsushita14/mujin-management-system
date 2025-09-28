/**
 * @fileoverview
 * 手動実行を前提とした在庫計算スクリプト。
 * 1. 各トランザクションシート(T系)からS_統合在庫トランザクションへデータを集約（洗い替え）。
 * 2. S_統合在庫トランザクションを元に、S_日次在庫サマリを計算する。
 */

// ===================================================================================
// グローバル設定
// ===================================================================================

const CALC_CONFIG = {
  sourceSheets: {
    'T_納品': { type: '納品', dateCol: '納品日', codeCol: '商品コード', qtyCol: '数量', sign: 1 },
    'T_販売': { type: '販売', dateCol: '売上日', codeCol: '商品コード', qtyCol: '売上点数', sign: -1 },
    'T_回収': { type: '回収', dateCol: '回収日', codeCol: '商品コード', qtyCol: '数量', sign: -1 },
  },
  integrationSheetName: 'S_統合在庫トランザクション',
  summarySheetName: 'S_日次在庫サマリ',
  productMasterSheetName: 'M_商品',
  stocktakeSheetName: 'T_棚卸'
};

// ===================================================================================
// メニュー
// ===================================================================================

/**
 * スプレッドシートを開いたときにカスタムメニューを追加する関数。
 * initialize_spreadsheet.jsのonOpenと競合するが、GASでは同名関数はマージされる。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('システム管理')
    .addItem('データベースを初期化', 'initializeSpreadsheet') 
    .addSeparator()
    .addItem('在庫サマリを更新', 'updateInventorySummary')
    .addToUi();
}

// ===================================================================================
// メイン処理
// ===================================================================================

/**
 * 手動で実行されるメイン関数。
 */
function updateInventorySummary() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('在庫サマリ更新', '在庫サマリの更新を開始します。シートの全データが再計算されます。よろしいですか？', ui.ButtonSet.OK_CANCEL);
  if (response !== ui.Button.OK) {
    ui.alert('処理を中断しました。');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('処理を開始しました...', '在庫サマリ更新', -1);
  Logger.log('在庫サマリ更新処理を開始します。');

  try {
    // ステップ1: トランザクションの集約
    aggregateTransactions(ss);

    // ステップ2: 在庫サマリの計算
    calculateDailySummary(ss);

    ss.toast('処理が正常に完了しました。', '在庫サマリ更新', 5);
    Logger.log('在庫サマリ更新処理が正常に完了しました。');
    ui.alert('在庫サマリの更新が完了しました。');

  } catch (e) {
    Logger.log(`エラーが発生しました: ${e.message}\n${e.stack}`);
    ss.toast('エラーが発生しました。詳細はログを確認してください。', '在庫サマリ更新', 5);
    ui.alert(`エラーが発生しました: ${e.message}`);
  }
}

/**
 * ステップ1: 各T系シートからS_統合在庫トランザクションへデータを集約（洗い替え）。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss 
 */
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

    if (dateColIdx === -1 || codeColIdx === -1 || qtyColIdx === -1) {
      Logger.log(`警告: ${sheetName} のヘッダーが不正です。スキップします。`);
      continue;
    }

    const data = sourceSheet.getRange(2, 1, sourceSheet.getLastRow() - 1, sourceSheet.getLastColumn()).getValues();
    for (const row of data) {
      if (!row[dateColIdx] || !row[codeColIdx] || row[qtyColIdx] === '') continue;
      
      allTransactions.push([
        Utilities.getUuid(),
        new Date(),
        new Date(row[dateColIdx]),
        row[codeColIdx],
        config.type,
        Number(row[qtyColIdx]) * config.sign,
        '', // 賞味期限 (TODO)
        ''  // 担当者コード (TODO)
      ]);
    }
  }

  if (allTransactions.length > 0) {
    // 日付順にソートしてから書き込む
    allTransactions.sort((a, b) => a[2] - b[2]);
    destinationSheet.getRange(2, 1, allTransactions.length, allTransactions[0].length).setValues(allTransactions);
    Logger.log(`${allTransactions.length}件のトランザクションをS_統合在庫トランザクションに集約しました。`);
  }
  Logger.log('ステップ1: トランザクションの集約が完了しました。');
}

/**
 * ステップ2: S_日次在庫サマリを計算する。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss 
 */
function calculateDailySummary(ss) {
  ss.toast('ステップ2/2: 在庫サマリを計算中...');
  Logger.log('ステップ2: 在庫サマリの計算を開始します。');
  const summarySheet = ss.getSheetByName(CALC_CONFIG.summarySheetName);
  if (!summarySheet) throw new Error(`サマリシートが見つかりません: ${CALC_CONFIG.summarySheetName}`);

  summarySheet.getRange(2, 1, summarySheet.getMaxRows() - 1, summarySheet.getMaxColumns()).clearContent();

  // TODO: ここに在庫サマリ計算のロジックを実装する
  Logger.log('（TODO: 在庫サマリ計算ロジックは未実装です）');

  Logger.log('ステップ2: 在庫サマリの計算が完了しました。');
}
