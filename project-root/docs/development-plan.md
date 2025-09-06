# 開発方針まとめ

## 環境
- VS Code
- Gemini Code Assist / CLI Companion 利用
- React（Netlify デプロイ） + Google Apps Script（バックエンド）

## 現状の課題
- Gemini 経由でのデバッグがうまくいかない
- React → GAS 直 fetch で CORS 問題発生
- JSONP での回避は可能だが本番向きではない

## 今後の方針
- GAS をバックエンドとして継続利用
- Netlify Functions をプロキシにして通信統一
- React → Netlify Functions → GAS の構成で開発
- 将来の拡張（認証・他API連携）を見据えて設計

## Gemini に期待すること
- React + Netlify Functions + GAS 開発フローの補助
- デバッグ支援（リクエスト・レスポンスの可視化、エラーログ整理）
- 将来拡張を考慮した設計アドバイス
