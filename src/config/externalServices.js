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
    inventorySheet: {
      url: 'YOUR_GOOGLE_SHEETS_INVENTORY_URL_HERE', // Replace with actual URL
      id: 'YOUR_GOOGLE_SHEETS_INVENTORY_ID_HERE',   // Replace with actual ID
    },
    // Add other Google Sheets here
  },
  gasApi: {
    manuals: {
      url: 'https://script.google.com/macros/s/AKfycbynn3c0bZJ8oRCp7n8nBnnu7LErMMp0-P_WwuJAn3zHnJKxy4c_gGvzneUaChvZtJBn/exec',
    },
    stockApp: {
      url: 'https://script.google.com/macros/s/AKfycbzcm29NtPBqS_kJ5-S0nfJBYsyMGU91WFlwUdU7sDsB-QE-SdnF4HFpVIoh_Ra2CvON/exec',
    },
  },
};
