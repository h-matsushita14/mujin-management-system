function updateDropdownFromSheet() {
  const sheet = SpreadsheetApp.openById("1Khos4vfXVTzDg0dflL2RwuuM_lGq9K-WEMWJUTteXzY"); // 商品マスターのスプレッドシート
  const sheetName = '商品マスター';
  const questionTitle = '商品名';

  const dataSheet = sheet.getSheetByName(sheetName);
  const lastRow = dataSheet.getLastRow();
  // B列（2列目）のデータを取得
  const allProductNames = dataSheet.getRange(2, 2, lastRow - 1).getValues().flat();

  // 「送料」を含む商品名を除外
  const productNames = allProductNames.filter(name => !name.includes('送料'));

  // 対象フォームのID一覧
  const formIds = [
    "1svEsiNxD_zimMo5LG7wfEpIalgfaIVmkzCjLpDxf6K4",
    "1Qo5086WJntX8fyYFXRwPb2tLvNjksJ6euI8QXMZRo-4",
    "13RYKRlvUKkvR6a3Erf7mEWlBJeKmBg0l6j91DIL_yPY"
  ];

  // 各フォームに対してリストを更新
  formIds.forEach(formId => {
    const form = FormApp.openById(formId);
    const items = form.getItems(FormApp.ItemType.LIST);
    for (let i = 0; i < items.length; i++) {
      const item = items[i].asListItem();
      if (item.getTitle() === questionTitle) {
        item.setChoiceValues(productNames);
        break;
      }
    }
  });
}