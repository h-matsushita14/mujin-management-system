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

  console.log('GAS_WEB_APP_URL:', GAS_WEB_APP_URL); // Debug log

  if (!GAS_WEB_APP_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `GAS_WEB_APP_URL for type '${type}' environment variable is not set.` }),
    };
  }

  try {
    let gasUrl = GAS_WEB_APP_URL;
    let fetchOptions = {};

    if (event.httpMethod === 'GET') {
      // クエリパラメータをGASに転送
      const paramsToForward = new URLSearchParams();
      for (const key in event.queryStringParameters) {
        if (key !== 'type') {
          paramsToForward.append(key, event.queryStringParameters[key]);
        }
      }
      const queryString = paramsToForward.toString();
      gasUrl = `${GAS_WEB_APP_URL}?${queryString}`;
      fetchOptions.method = 'GET'; // doGetを呼び出すためGETを使用
    } else if (event.httpMethod === 'POST') {
      // POSTリクエストのボディをGASに転送
      fetchOptions.method = 'POST'; // doPostを呼び出すためPOSTを使用
      fetchOptions.headers = {
        'Content-Type': 'application/x-www-form-urlencoded', // React側と合わせる
      };
      fetchOptions.body = event.body; // event.bodyはすでにURLSearchParams形式の文字列
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    console.log('Fetching from GAS URL:', gasUrl); // Debug log
    console.log('Fetch options:', fetchOptions); // Debug log

    const response = await fetch(gasUrl, fetchOptions);

    console.log('GAS response status:', response.status); // Debug log

    if (!response.ok) { // レスポンスがOKでない場合にエラーをスロー
      throw new Error(`GAS Web App responded with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log('GAS response data:', data); // Debug log

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