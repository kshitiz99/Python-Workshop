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

| フィールド | 型 | デフォルト値 | 許容値 | 説明 |
|---|---|---|---|---|
| `work` | `number` | `25` | `15`, `25`, `35`, `45` | 作業セッションの長さ（分） |
| `shortBreak` | `number` | `5` | `5`, `10`, `15` | 短い休憩の長さ（分） |
| `longBreak` | `number` | `15` | `5`, `10`, `15` | 長い休憩の長さ（分） |
| `sessionsBeforeLongBreak` | `number` (≥1) | `4` | 1〜12 | 長い休憩に入るまでの作業セッション数 |
| `theme` | `string` | `"dark"` | `"dark"`, `"light"`, `"focus"` | UI テーマ |
| `sounds.start` | `boolean` | `true` | — | タイマー開始音の有効/無効 |
| `sounds.end` | `boolean` | `true` | — | タイマー終了音の有効/無効 |
| `sounds.tick` | `boolean` | `false` | — | チック音の有効/無効 |

#### `sessionCount`

| フィールド | 型 | デフォルト値 | 説明 |
|---|---|---|---|
| `sessionCount` | `number` (整数, ≥0) | `0` | 完了した作業セッションの累計数 |

#### `sessionHistoryByDate`

日付ごとの完了セッション数を記録するオブジェクトです。

| フィールド | 型 | 説明 |
|---|---|---|
| キー | `string` (`"YYYY-MM-DD"`) | ISO 日付文字列 |
| 値 | `number` (整数, ≥0) | その日に完了した作業セッション数 |

#### `focusMinutesByDate`

日付ごとの合計集中時間（分）を記録するオブジェクトです。

| フィールド | 型 | 説明 |
|---|---|---|
| キー | `string` (`"YYYY-MM-DD"`) | ISO 日付文字列 |
| 値 | `number` (≥0) | その日の合計作業時間（分、`settings.work` の累計） |

---

## モード定義

タイマーには以下の 3 つのモードがあります。

| モードキー | 表示名 | テーマカラー |
|---|---|---|
| `work` | Work | `#d64541`（赤） |
| `shortBreak` | Short Break | `#4e9a51`（緑） |
| `longBreak` | Long Break | `#2e86c1`（青） |

---

## ゲーミフィケーションモデル

ゲーミフィケーション計算値は `localStorage` には保存されず、`sessionCount` と `sessionHistoryByDate` から毎回リアルタイムに算出されます。

| 項目 | 計算式 | 定数 |
|---|---|---|
| XP | `sessionCount × XP_PER_SESSION` | `XP_PER_SESSION = 25` |
| Level | `Math.floor(XP / XP_PER_LEVEL) + 1` | `XP_PER_LEVEL = 100` |
| Streak | `sessionHistoryByDate` 内の今日から遡った連続日数 | — |

### バッジ定義

| バッジ ID | ラベル | 付与条件 | トーン |
|---|---|---|---|
| `streak-3` | 3日連続 | ストリーク ≥ 3 | `bronze` |
| `weekly-10` | 週10回達成 | 直近7日のセッション数 ≥ 10 | `silver` |
| `total-100` | 100回達成 | 累計セッション数 ≥ 100 | `gold` |

---

## 状態の初期化ルール

- `localStorage` のデータが存在しない・壊れている場合は、デフォルト値が使用されます。
- `settings` フィールドが存在しない場合は `DEFAULT_SETTINGS` で補完されます（スプレッド演算子によるマージ）。
- `settings.work` / `shortBreak` / `longBreak` が許容値に含まれない場合はデフォルト値にフォールバックします。
- `settings.theme` が許容値に含まれない場合は `"dark"` にフォールバックします。
- `sessionCount` が整数でない場合は `0` にリセットされます。
