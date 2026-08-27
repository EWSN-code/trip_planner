# 旅行比較機能 実装計画

設計: `.kilo/plans/1787842567158-travel-comparison-investigation.md` の C 案を厳守する。

設計原則 (再掲):
- 既存アーキテクチャ (ESM, 1-file-per-concern, dialog ベース) を尊重
- 必要最小限の変更
- UI 状態は永続化しない (`Storage.save` を呼ばない)
- `state` / Supabase スキーマは変更しない
- 比較機能は読み取り専用
- スコープ外のリファクタリングは行わない

---

## Step 1: 比較用ユーティリティ関数の追加

- **目的**: 2 つの旅を日単位で対応付ける純粋関数を `js/utils.js` に追加する。後のレンダリング層が DOM を意識せずテスト可能になる。
- **変更するファイル**:
  - `js/utils.js` のみ
- **変更内容**:
  - `formatDayHeader(trip, day)` — `trip.name` と `day` 番目の「日」ヘッダ文字列を返す (例: `"京都の旅 - 1日目"`)
  - `pairByDay(tripA, tripB)` — 2 つの旅を受け取り、`{ day: number, itemsA: Item[], itemsB: Item[] }[]` の配列を返す
    - 両旅の `day` の和集合を昇順に並べ、各日について左右の `timeline.filter(i => Number(i.day||1) === day)` を返す
    - 既存コードに合わせて「`day` プロパティの欠落は 1 として扱う」
- **完了条件**:
  - `js/utils.js` の末尾に上記 2 関数が追加されている
  - 既存のエクスポート (`uid`, `now`, `clone`, `esc`, `yen`, `amount`, `payments`, `categories`, `total`, `summarize`, `mapUrl`, `routeUrl`) に変更がない
  - 既存 import 文 (`import {...} from "./utils.js"`) が壊れていない
- **想定されるリスク**:
  - `utils.js` はミニファイ済み 1 行のため、追記位置を誤ると既存関数を破壊する → ファイルの最終行 (`export const routeUrl=...`) の直後に `;` を付けて改行してから追記する
  - `day` の和集合で旅行 A に存在しない日 / B に存在しない日が混ざる → 関数は `itemsA` または `itemsB` が `undefined` にならず、空配列 `[]` を返すことで対応
- **自己レビュー基準**:
  - `pairByDay(tripA, tripB)` の `day` の和集合が `Set` で重複排除されているか
  - `Number(i.day||1)` のフォールバックが既存 `detail()` 関数 (`app.js` 1 行目) と一致しているか
  - 純粋関数か (副作用なし、入力オブジェクトを mutate しないか)

---

## Step 2: 比較用レンダラ関数の追加

- **目的**: 比較サマリ (期間 / 項目数 / 予定合計 / 支払方法別 / 科目別) と「日別の左右 2 列」を HTML 文字列として返す純粋関数を `js/render.js` に追加する。
- **変更するファイル**:
  - `js/render.js` のみ
- **変更内容**:
  - `renderCompareSummary(tripA, tripB)` — 左右 2 列のサマリ HTML を返す。既存の `yen`, `total`, `summarize` を再利用
  - `renderCompareDay({ day, itemsA, itemsB })` — 1 日分の左右 2 列 HTML を返す。片側にしかない項目は `data-side="only-a"` / `data-side="only-b"` を持つラッパで囲む
- **完了条件**:
  - `js/render.js` の末尾に 2 関数がエクスポート付きで追加されている
  - 既存の `render(i)` 関数の挙動が変わっていない
  - 出力 HTML が XSS 安全 (`utils.js#esc` を通すか、文字列リテラルで構成)
- **想定されるリスク**:
  - `render.js` も 1 行に圧縮されている → 既存 `export function render` の直後に `;` 付きで改行し追記
  - 既存の `render()` がプロジェクト内の唯一のエクスポートである破壊的変更を避ける
- **自己レビュー基準**:
  - 既存 `render()` の戻り値の構造に影響しないか
  - サマリで `total()` / `summarize()` を使う際、`trip.timeline` が空のときに落ちないか

---

## Step 3: HTML に比較セクションとトグル・比較ボタンを追加

- **目的**: 一覧の上部に「比較モード」トグルと「比較」ボタンを置き、`<main>` 内に `<section id="compareView">` の空骨格を追加する。
- **変更するファイル**:
  - `index.html` のみ
- **変更内容**:
  - `<section id="listView">` 内の `<h2>` の直後にトグル UI (`<label class="compare-toggle"><input id="compareModeToggle" type="checkbox">比較モード</label>`) と「比較」ボタン (`<button id="compareBtn" class="sub" disabled>比較</button>`) を追加
  - `<main>` の末尾 (現行 `</main>` の直前) に `<section id="compareView" hidden>` を追加。中身は空 (Step 4 で `app.js` から動的描画する)
- **完了条件**:
  - `index.html` 1 行目 (全体が 1 行に圧縮) の `#listView` 内にトグル / 比較ボタンがある
  - `<section id="compareView" hidden>` が `<main>` 内に存在する
  - 既存の `<section id="listView">` `<section id="detailView">` などの構造が変わっていない
  - ナビ (`<nav>`) は触らない (比較は一覧の上のボタンから入る)
- **想定されるリスク**:
  - `index.html` は 13 行に圧縮された 1 行ファイルで、HTML タグの途中で改行を入れると `</main>` や `</body>` の位置がずれる → 既存タグを壊さないよう、最小限の挿入に留める
  - `<dialog>` 群は触らない
- **自己レビュー基準**:
  - 既存の `id="listView"` `id="detailView"` `id="tripGrid"` などの ID と衝突していないか
  - `hidden` 属性の初期値が `true` (比較画面は最初閉じている) か
  - 追加した要素に `</section>` の閉じタグがあるか

---

## Step 4: 比較モード・選択・描画ロジックを `app.js` に追加

- **目的**: 一覧のトグル、選択状態 (2 件まで)、「比較」ボタンの活性制御、比較画面描画 (`renderCompare()`)、戻るハンドラを追加する。
- **変更するファイル**:
  - `js/app.js` のみ
- **変更内容**:
  - モジュールスコープ変数を追加: `let compareMode = false, compareSelection = []`
  - `list()` 関数内にトグル / 比較ボタンの参照と活性制御、`compareMode` に応じたラジオ表示分岐を追加
  - 比較画面用: `renderCompare()` を新設し、Step 1, 2 の関数を使って `#compareView` の中身を組み立てる
  - 「比較」ボタン押下で `#listView` を隠し `#compareView` を表示。戻るボタン (比較画面内) で `#listView` に戻す
  - `#floatingAddBtn` は比較画面では非表示 (編集不可を視覚化)
- **完了条件**:
  - 既存の `startApp()` `boot()` `list()` `detail()` `save()` `trip()` 等の関数シグネチャが変わらない
  - 比較画面では `#floatingAddBtn` が `hidden` になる
  - 戻るボタンで一覧に戻ると、`compareSelection` の選択状態は揮発性なので消える (永続化しない)
  - 既存の旅程詳細 (`#detailView`) の表示が崩れない
- **想定されるリスク**:
  - `app.js` は 13 行に圧縮されたミニファイ版で、関数が `function list(){...}` のように中括弧で囲まれている。**挿入位置を誤ると既存の関数本体を上書きする** → 挿入は必ず `function` 定義の直前に行う
  - 既存の `list()` 関数を上書き拡張する場合、必ず末尾の閉じ `}` の直前に新コードを入れる
  - イベント結線で `document.querySelectorAll("[data-open]")` など既存のループを壊さない
- **自己レビュー基準**:
  - 既存 `list()` の「開く / 複製 / 削除」 3 ボタンの挙動が変わっていないか
  - 比較モード ON のときだけラジオが出るか (OFF 時は出ない)
  - 比較画面から詳細 (`#detailView`) に直接戻れるか (戻れず一覧経由のみならコメントで明示)
  - `Storage.save` を呼んでいないか (呼ぶと UI 状態を永続化してしまう)

---

## Step 5: 比較画面用 CSS を追加

- **目的**: 2 列グリッドと「片方のみ」注釈のスタイルを追加する。
- **変更するファイル**:
  - `styles.css` のみ
- **変更内容**:
  - `.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }`
  - `[data-side="only-a"]` / `[data-side="only-b"]` の注釈スタイル (左右のどちらかにしか存在しない項目の枠)
  - レスポンシブ: `@media (max-width: 650px)` で 1 列に折り返す
- **完了条件**:
  - `styles.css` の既存クラス定義が変わっていない
  - 比較画面で左右 2 列が並ぶ
  - 650px 以下で 1 列に折り返す
  - 既存のテーマ (`theme.css`) と干渉しない (CSS 変数のみ使う)
- **想定されるリスク**:
  - `styles.css` は 8 行に圧縮されている。追記位置を誤ると既存定義を上書きする → 最終行 (`.actual-diff` 関連) の後に追記
  - `theme.css` の CSS 変数 (`--accent`, `--card`, `--line` 等) を再利用すればテーマ自動対応になる
- **自己レビュー基準**:
  - 既存の `.card` `.trip-grid` `.timeline-item` のスタイルが崩れていないか
  - モバイル (650px 以下) で `#compareView` 内のテキストが読みやすいか

---

## Step 6: 検証 (手動チェックリスト)

- **目的**: §C-9 のチェックリストを実行し、既存機能にリグレッションがないことを確認する。
- **変更するファイル**: なし
- **実施内容**:
  - 旅 0 件 / 1 件 / 2 件 / 3 件でトグル ON 時の挙動を確認
  - 2 件選択して比較 → サマリ値が左右でそれぞれ正しい (`total` / `summarize` と一致)
  - 1 件にだけ存在する day / item が「片方のみ」と表示される
  - 編集モードで `#detailView` を開いて戻ってきても、比較画面の選択状態が壊れない
  - ログアウト (`#logoutBtn`) しても比較選択は揮発性なので消える
  - 印刷 (Ctrl+P) で比較画面が 1〜2 ページに収まる
  - 既存の `print/index.html?trip=ID` が壊れていない
- **完了条件**: 上記 7 項目すべて期待動作
- **想定されるリスク**:
  - 自動テストがないため確認漏れが出る → 各項目を「事前条件 / 操作 / 期待」の 3 段で確認

---

## コミット粒度の指針

- Step 1 → `feat: 比較用ユーティリティ (formatDayHeader, pairByDay) を追加`
- Step 2 → `feat: 比較サマリと日別タイムラインのレンダラを追加`
- Step 3 → `feat: 比較セクションの HTML 骨格とトグル / 比較ボタンを追加`
- Step 4 → `feat: 比較モードと選択 / 描画ロジックを app.js に追加`
- Step 5 → `style: 比較画面用 CSS を追加`
- Step 6 → コミットなし (検証のみ)

各 Step は独立して `git diff` でレビュー可能な大きさに保つ。
