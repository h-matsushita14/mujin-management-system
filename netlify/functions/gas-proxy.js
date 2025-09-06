const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // GAS WebアプリのデプロイURLをここに設定してください
  // 例: https://script.google.com/macros/s/AKfycbz.../exec
  const GAS_API_URLS = {
    manuals: process.env.GAS_MANUALS_WEB_APP_URL,
    stock: process.env.GAS_STOCK_WEB_APP_URL,
  };

  const type = event.queryStringParameters.type || 'stock'; // Default to 'stock'
  const GAS_WEB_APP_URL = GAS_API_URLS[type];

  if (!GAS_WEB_APP_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `GAS_WEB_APP_URL for type '${type}' environment variable is not set.` }),
    };
  }

  try {
    // クエリパラメータをGASに転送
    const queryString = new URLSearchParams(event.queryStringParameters).toString();
    const gasUrl = `${GAS_WEB_APP_URL}?${queryString}`;

    const response = await fetch(gasUrl, {
      method: 'GET', // doGetを呼び出すためGETを使用
      // headers: {
      //   'Content-Type': 'application/json',
      //   // 必要に応じて追加のヘッダー
      // },
    });

    if (!response.ok) { // レスポンスがOKでない場合にエラーをスロー
      throw new Error(`GAS Web App responded with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // ReactアプリからのCORSを許可
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error proxying to GAS:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy request to Google Apps Script.', details: error.message }),
    };
  }
};