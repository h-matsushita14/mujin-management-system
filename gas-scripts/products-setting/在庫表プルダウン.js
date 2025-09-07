function onEdit(e) {
  const sheet = e.range.getSheet();
  if (sheet.getName() !== "商品マスター") return;

  // 編集された列が「商品名」列だった場合のみ実行
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const colIndex = headers.findIndex(h => h.toString().trim() === "商品名");
  if (e.range.getRow() < 2 || e.range.getColumn() !== colIndex + 1) return;

  set商品名プルダウン();
}

function set商品名プルダウン() {
  const sourceSS = SpreadsheetApp.getActiveSpreadsheet(); // 商品マスター側
  const sourceSheet = sourceSS.getSheetByName("商品マスター");
  const headers = sourceSheet.getRange(1, 1, 1, sourceSheet.getLastColumn()).getValues()[0];
  const nameCol = headers.findIndex(h => h.toString().trim() === "商品名");
  if (nameCol === -1) {
    Logger.log("⚠️「商品名」列が見つかりませんでした。");
    return;
  }

  const lastRow = sourceSheet.getLastRow();
  const values = sourceSheet.getRange(2, nameCol + 1, lastRow - 1, 1).getValues()
                  .map(r => r[0])
                  .filter(v => v); // 空欄除外

  const targetSS = SpreadsheetApp.openById("1FIdKNjYHGmCwK85n1CEkeYWkIUrGA2WpxKeWOEDLfZo");
  const targetSheet = targetSS.getSheetByName("在庫_商品毎");

  const rule = SpreadsheetApp.newDataValidation()
                .requireValueInList(values, true)
                .setAllowInvalid(false)
                .build();

  targetSheet.getRange("C1").clearDataValidations().setDataValidation(rule);
}