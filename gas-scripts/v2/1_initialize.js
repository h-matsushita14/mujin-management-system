
/**
 * @fileoverview 新しいMujin Management System v2データベース（Googleスプレッドシート）を初期化するスクリプト。
 * 提案されたハイブリッド案に基づいて、必要なすべてのシートとヘッダーを自動生成します。
 */

/**
 * シートの定義。
 * キーがシート名、値がヘッダー項目の配列。
 */
const SHEET_DEFINITIONS = {
  // カテゴリ1: マスターデータ (M系)
  'M_商品': ['商品コード', '商品名', 'netDoA商品コード', '賞味日数', 'アラート日数', '基準在庫', '発注点', '納品ロット', '在庫管理対象'],
  'M_価格': ['価格ID', '商品コード', '税込売価', '適用開始日', '適用終了日'],
  'M_画像': ['画像ID', '商品コード', 'URL', '表示順'],
  'M_担当者': ['担当者コード', '名前', '権限'],
  'M_営業日設定': ['日付', '営業ステータス', '記録日時'],

  // カテゴリ2: 入力用トランザクションデータ (T系)
  'T_発注': ['発注ID', '発注日時', '発注日', '商品コード', '発注数', '納品ステータス', '発注者コード'],
  'T_納品': ['納品ID', '納品日時', '納品日', '商品コード', '数量', '賞味期限'],
  'T_販売': ['販売ID', '売上日', '商品コード', 'netDoA商品コード', '売上点数'],
  'T_回収': ['回収ID', '回収日時', '回収日', '商品コード', '数量', '賞味期限'],
  'T_棚卸': ['棚卸ID', '棚卸日時', '商品コード', '実在庫数', '担当者コード'],
  'T_シフト': ['シフトID', '作業日', '担当者コード', '作業種別'],
  'T_勤務状況': ['勤務状況ID', '記録日時', '担当者コード', '日付', '状況'],
  'T_レジ締め': ['レジ締めID', '作業日', '営業日', '担当者コード'],

  // カテゴリ3: GASによる集計・統合データ (S系)
  'S_統合在庫トランザクション': ['トランザクションID', '記録日時', '発生日', '商品コード', 'トランザクション種別', '数量', '賞味期限', '担当者コード'],
  'S_日次在庫サマリ': ['日付', '商品コード', '理論在庫', '実在庫', '差異', '最も古い賞味期限', '販売可能日数'],

  // カテゴリ4: その他
  'M_マニュアル': ['マニュアルID', 'マニュアル名', 'URL', '最終更新日時'],
  'T_ログ': ['ログID', '記録日時', '担当者コード', '操作内容']
};

/**
 * メイン関数。この関数を実行すると、スプレッドシートが初期化されます。
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 定義されたシート名とヘッダーをループ処理
  for (const sheetName in SHEET_DEFINITIONS) {
    let sheet = ss.getSheetByName(sheetName);

    // もしシートが存在しなければ、新しく作成する
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`シート '${sheetName}' を作成しました。`);
    } else {
      Logger.log(`シート '${sheetName}' は既に存在します。`);
      // 既存のシートの場合は、ヘッダーを上書きするために一度クリアする
      sheet.clear();
    }

    // ヘッダー項目を取得
    const headers = SHEET_DEFINITIONS[sheetName];

    // ヘッダーをシートの1行目に書き込む
    if (headers && headers.length > 0) {
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold'); // ヘッダーを太字にする
      sheet.setFrozenRows(1); // ヘッダー行を固定
      Logger.log(`シート '${sheetName}' にヘッダーを書き込みました。`);
    }
  }
  
  // デフォルトで作成される'Sheet1'が不要であれば削除
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) {
    ss.deleteSheet(defaultSheet);
    Logger.log("デフォルトシート 'Sheet1' を削除しました。");
  }

  SpreadsheetApp.getUi().alert('スプレッドシートの初期化が完了しました。');
}
