# Travel Planner v2 Phase 1

## 起動
VS Code Live Server、または `python -m http.server` などHTTPサーバー経由で `index.html` を開いてください。

## 実装済み
- 旅行一覧
- 新規旅行・基本情報編集
- 旅行複製・削除
- 京都旅行データの初期移行
- 日別タイムライン
- 旅程項目の追加・編集・削除
- station / transport / transfer / activity / food / hotel
- 費用明細（単価・数量・支払方法）
- localStorage保存
- JSONインポート・エクスポート
- A4圧縮印刷画面

## 次のPhase
`js/storage.js` の `StorageAdapter` をSupabase対応Adapterへ差し替え、Auth・RLS・クラウド同期を追加します。

## 注意
GitHub Pagesへ公開しても、Phase 1のデータは各ブラウザのlocalStorageに保存されます。リポジトリ内に旅行データを残さない運用にする場合、初期データ移行後は `data/initial-state.json` を空のstateへ置き換えてください。Supabase化後はログインユーザーのクラウドデータを読み込みます。
