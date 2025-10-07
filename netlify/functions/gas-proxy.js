
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { path, httpMethod, headers, queryStringParameters, body } = event;

  console.log('Received request:', { path, httpMethod, queryStringParameters }); // 追加

  // Netlify環境変数からGASウェブアプリのURLを取得
  const GAS_WEB_APP_URL = process.env.GAS_V2_WEB_APP_URL;

  if (!GAS_WEB_APP_URL) {
    console.error('GAS_V2_WEB_APP_URL environment variable is not set.'); // 変更
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'GAS_V2_WEB_APP_URL environment variable is not set.' })
    };
  }

  // GASウェブアプリへのリクエストURLを構築
  // フロントエンドからのクエリパラメータをそのままGASに渡す
  const gasUrl = new URL(GAS_WEB_APP_URL);
  for (const key in queryStringParameters) {
    gasUrl.searchParams.append(key, queryStringParameters[key]);
  }
  console.log('Constructed GAS URL:', gasUrl.toString()); // 追加

  try {
    let response;
    if (httpMethod === 'GET') {
      response = await fetch(gasUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json', // GASがJSONを返すことを想定
        },
      });
    } else if (httpMethod === 'POST') {
      // POSTリクエストの場合、フロントエンドからのbodyをそのままGASに転送
      response = await fetch(gasUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': headers['content-type'] || 'application/json', // フロントエンドのContent-Typeを尊重
        },
        body: body, // フロントエンドからのbodyをそのまま転送
      });
    } else {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const gasResponse = await response.json();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // CORS対応
      },
      body: JSON.stringify(gasResponse)
    };

  } catch (error) {
    console.error('Error proxying to GAS:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy request to GAS.', details: error.message })
    };
  }
};
