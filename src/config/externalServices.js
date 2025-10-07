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
  },
  productApi: {
    baseUrl: '/api/products',
  },
};