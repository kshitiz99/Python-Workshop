# データモデル

## 概要

本アプリケーションにはサーバーサイドのデータベースやモデル定義はありません。
永続データはすべてブラウザの `localStorage` に JSON 形式で保存されます。

---

## localStorage スキーマ

**キー**: `"pomodoro-state"`

```json
{
  "settings": {
    "work": 25,
    "shortBreak": 5,
    "longBreak": 15,
    "sessionsBeforeLongBreak": 4,
    "theme": "dark",
    "sounds": {
      "start": true,
      "end": true,
      "tick": false
    }
  },
  "sessionCount": 0,
  "sessionHistoryByDate": {
    "2026-08-19": 3
  },
  "focusMinutesByDate": {
    "2026-08-19": 75
  }
}
```

### フィールド詳細

#### `settings` オブジェクト

| フィールド | 型 | デフォルト値 | 有効値 | 説明 |
|---|---|---|---|---|
| `work` | `number` | `25` | `15`, `25`, `35`, `45` | 作業セッションの長さ（分） |
| `shortBreak` | `number` | `5` | `5`, `10`, `15` | 短い休憩の長さ（分） |
| `longBreak` | `number` | `15` | `5`, `10`, `15` | 長い休憩の長さ（分） |
| `sessionsBeforeLongBreak` | `number` (≥1) | `4` | 1以上の数値（整数以外や12超も許容、UI入力は1〜12） | 長い休憩に入るまでの作業セッション数 |
| `theme` | `string` | `"dark"` | `"dark"`, `"light"`, `"focus"` | アプリのテーマ |
| `sounds.start` | `boolean` | `true` | — | タイマー開始時のサウンドを有効にするか |
| `sounds.end` | `boolean` | `true` | — | タイマー終了時のサウンドを有効にするか |
| `sounds.tick` | `boolean` | `false` | — | 毎秒のティックサウンドを有効にするか |

`work` / `shortBreak` / `longBreak` / `theme` に有効値以外の値が保存されていた場合、`loadSettings()` は自動的にデフォルト値に置き換えます。`sessionsBeforeLongBreak` と `sounds` の各値は保存値をそのまま読み込みます。

#### `sessionCount`

| フィールド | 型 | デフォルト値 | 説明 |
|---|---|---|---|
| `sessionCount` | `number` (整数, ≥0) | `0` | 完了した作業セッションの累計数 |

#### `sessionHistoryByDate`

日付ごとの完了セッション数を記録します。

| フィールド | 型 | 説明 |
|---|---|---|
| `sessionHistoryByDate` | `object` | キーが `"YYYY-MM-DD"` 形式の日付文字列、値がその日の完了セッション数（整数） |

#### `focusMinutesByDate`

日付ごとの累計フォーカス時間（分）を記録します。

| フィールド | 型 | 説明 |
|---|---|---|
| `focusMinutesByDate` | `object` | キーが `"YYYY-MM-DD"` 形式の日付文字列、値がその日の累計フォーカス分数 |

---

## モード定義

タイマーには以下の 3 つのモードがあります。

| モードキー | 表示名 | テーマカラー |
|---|---|---|
| `work` | Work | `#d64541`（赤） |
| `shortBreak` | Short Break | `#4e9a51`（緑） |
| `longBreak` | Long Break | `#2e86c1`（青） |

---

## 状態の初期化ルール

- `localStorage` のデータが存在しない・壊れている場合は、デフォルト値が使用されます。
- `settings` フィールドが存在しない場合は `DEFAULT_SETTINGS` で補完されます（スプレッド演算子によるマージ）。
- `sessionCount` が整数でない場合は `0` にリセットされます。
- `sessionHistoryByDate` / `focusMinutesByDate` が存在しない場合は空オブジェクト `{}` が使用されます。
- 許容値リスト外の `work`・`shortBreak`・`longBreak` 値はデフォルト値にフォールバックします。
- `theme` が許容値リスト外の場合は `"dark"` にフォールバックします。
