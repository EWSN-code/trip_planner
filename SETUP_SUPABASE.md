# Phase 2 導入手順

1. Phase 1.1フォルダの直下へ、このoverlay ZIPの中身をすべてコピーします。
2. `python apply_phase2.py` を実行します。
3. Supabase SQL Editorで `supabase.sql` を実行します。
4. `config.js` へProject URLとPublishable keyを設定します。
5. AuthenticationでEmail providerを有効にします。
6. HTTPサーバーまたはGitHub Pagesで起動します。

初回ログイン時、クラウドにデータがなく、ブラウザのlocalStorageに旅行がある場合は自動移行します。別ブラウザの場合はJSONを書き出して、ログイン後に読み込んでください。
