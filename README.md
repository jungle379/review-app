# 貯金計算アプリ

## 概要
このアプリは、毎月の収支を一覧化し、残高・給与・家賃・カード・友の会・競馬クラブを簡単に編集して、貯金額の把握をしやすくするためのNext.jsアプリです。

## 使う技術
- React / Next.js
- Mantine
- Clerk
- Turso

## 画面構成
- ログインページ
- 貯金計算ダッシュボード
- 収支項目の編集
- 保存処理（Tursoの設定時）

## 環境変数
.env.example をコピーして .env.local を作成し、Clerk と Turso の値を設定してください。

cp .env.example .env.local

## 開発開始
npm install
npm run dev

## 主なページ
- / : トップページ
- /login : ログイン
- /dashboard : 貯金計算

## 補足
この環境では npm registry から Clerk の依存解決が E403 で止まっているため、実際の依存インストールと起動確認はこのマシンでは完了していません。依存解決が可能な環境に移ってから、上記の手順で起動してください。
