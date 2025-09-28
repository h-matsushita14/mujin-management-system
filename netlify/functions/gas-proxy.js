
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // 新しいGAS V2 WebアプリのURLを環境変数から取得
  const GAS_WEB_APP_URL = process.env.GAS_V2_WEB_APP_URL;

  if (!GAS_WEB_APP_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GAS_V2_WEB_APP_URL environment variable is not set.' }),
    };
  }

  try {
    let gasUrl = GAS_WEB_APP_URL;
    let fetchOptions = {};

    if (event.httpMethod === 'GET') {
      // すべてのクエリパラメータをそのままGASに転送
      const queryString = new URLSearchParams(event.queryStringParameters).toString();
      if (queryString) {
        gasUrl = `${GAS_WEB_APP_URL}?${queryString}`;
      }
      fetchOptions.method = 'GET';
    } else if (event.httpMethod === 'POST') {
      // POSTリクエストのボディをGASに転送
      fetchOptions.method = 'POST';
      // フロントエンドの実装に合わせてContent-Typeを調整する必要があるかもしれない
      fetchOptions.headers = {
        'Content-Type': event.headers['content-type'] || 'application/json',
      };
      fetchOptions.body = event.body;
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    const response = await fetch(gasUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`GAS Web App responded with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // 必要に応じてオリジンを制限
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
