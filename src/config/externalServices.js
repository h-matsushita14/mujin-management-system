// Configuration for external services like Looker Studio, Google Sheets, etc.

export const EXTERNAL_SERVICES = {
  lookerStudio: {
    salesReport: {
      url: 'https://lookerstudio.google.com/reporting/a76d0615-84d0-4083-b07a-fcdec9123c40', // Replace with actual URL
      id: 'YOUR_LOOKER_STUDIO_SALES_REPORT_ID_HERE',   // Replace with actual ID if needed for embedding
    },
    // Add other Looker Studio reports here
  },
  googleSheets: {
    // 新しいV2スプレッドシートのURL
    v2db: {
      url: 'https://docs.google.com/spreadsheets/d/1l6iInhRC5dSkw_O7ZYayHyg9X2LRWeNBB-TnWX-GbBQ/edit',
      id: '1l6iInhRC5dSkw_O7ZYayHyg9X2LRWeNBB-TnWX-GbBQ',
    },
  },
  gasApi: {
    // 新しいV2 APIのエンドポイント
    v2: {
      url: '/.netlify/functions/gas-proxy',
    },
    stockApp: { // この定義は新しいAPIに移行後、削除または変更される
      url: 'https://script.google.com/macros/s/AKfycbz_YOUR_STOCK_APP_ID/exec', // 仮のURL
    },
  },
  productApi: {
    baseUrl: '/api/products',
  },
  // 新しい在庫APIのプレースホルダー
  inventoryApi: {
    baseUrl: '/api/inventory', // 新しい在庫APIのベースURL (仮)
    endpoints: {
      getInventoryList: '/list', // 在庫リスト取得エンドポイント (仮)
      updateInventory: '/update', // 在庫更新エンドポイント (仮)
      getManagedProducts: '/products', // 管理対象商品リスト取得エンドポイント (仮)
      getInventoryHistory: '/history', // 在庫履歴取得エンドポイント (仮)
      getDiscrepancyHistory: '/discrepancy-history', // 差異履歴取得エンドポイント (仮)
    }
  }
};