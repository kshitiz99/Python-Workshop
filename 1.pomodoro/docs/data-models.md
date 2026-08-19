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
    "sessionsBeforeLongBreak": 4
  },
  "sessionCount": 0
}
```

### フィールド詳細

#### `settings` オブジェクト

| フィールド | 型 | デフォルト値 | 説明 |
|---|---|---|---|
| `work` | `number` (整数, ≥1) | `25` | 作業セッションの長さ（分） |
| `shortBreak` | `number` (整数, ≥1) | `5` | 短い休憩の長さ（分） |
| `longBreak` | `number` (整数, ≥1) | `15` | 長い休憩の長さ（分） |
| `sessionsBeforeLongBreak` | `number` (整数, ≥1) | `4` | 長い休憩に入るまでの作業セッション数 |

#### `sessionCount`

| フィールド | 型 | デフォルト値 | 説明 |
|---|---|---|---|
| `sessionCount` | `number` (整数, ≥0) | `0` | 完了した作業セッションの累計数 |

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
