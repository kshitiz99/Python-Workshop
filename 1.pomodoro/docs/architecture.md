# アーキテクチャ概要

## システム全体像

本アプリケーションは Flask による軽量バックエンドと、ブラウザ上で動作するバニラ JavaScript フロントエンドで構成されます。
サーバーサイドのビジネスロジックやデータストアは持たず、実行中の状態はブラウザ内で管理し、設定・完了セッション数・日別セッション履歴・日別フォーカス分数を `localStorage` に永続化します。

```
ブラウザ
 ├── index.html        (テンプレート)
 ├── static/css/style.css
 ├── static/js/timerLogic.js  ← ピュアロジック層
 └── static/js/timer.js       ← DOM コントローラ層
         │
         │ HTTP GET /
         ▼
Flask サーバー (app.py)
 └── render_template("index.html")
```

---

## バックエンド層

### `app.py`

- **フレームワーク**: Flask
- **責務**: `index.html` テンプレートの配信のみ
- **設定**: `debug=True`（開発時）
- データベース・ORM・API ルーターは持たない

```python
app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")
```

---

## フロントエンド層

JavaScript は **ロジック層** と **UI 層** の 2 モジュールに分離されています。

### ロジック層 — `static/js/timerLogic.js`

- DOM に依存しないピュアな関数群
- Node.js (`module.exports`) とブラウザ（グローバル `PomodoroLogic`）の両方で動作する UMD スタイル
- Jest によるユニットテストが `tests/timerLogic.test.js` に存在する

### UI 層 — `static/js/timer.js`

- DOM 操作・イベント登録・`localStorage` の読み書きを担当
- `timerLogic.js` の公開関数を利用する
- `document`/`window` に依存するためブラウザ専用

---

## データフロー

```
[ユーザー操作]
      │
      ▼
  timer.js (イベントハンドラ)
      │
      ├─ timerLogic.js の関数呼び出し（計算）
      │
      ├─ DOM 更新 (timeLeftEl, ringProgressEl, etc.)
      │
      └─ localStorage への永続化 (persistState)
```

---

## テスト構成

| ファイル | テストランナー | 対象 |
|---|---|---|
| `tests/timerLogic.test.js` | Jest | `timerLogic.js` のピュアロジック |
| `tests/test_app.py` | pytest | Flask ルートおよび静的ファイル配信 |
