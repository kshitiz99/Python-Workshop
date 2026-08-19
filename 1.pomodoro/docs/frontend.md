# フロントエンドモジュール

## モジュール構成

| ファイル | 役割 |
|---|---|
| `static/js/timerLogic.js` | DOM 非依存のピュアロジック関数 |
| `static/js/timer.js` | DOM コントローラ・状態管理・イベント処理 |
| `static/css/style.css` | アプリケーション全体のスタイル |
| `templates/index.html` | Flask テンプレート（シングルページ） |

---

## `timerLogic.js` — ピュアロジックモジュール

Node.js とブラウザの両方で動作する UMD スタイルで記述されています。
ブラウザでは `window.PomodoroLogic` として、Node.js では `module.exports` として公開されます。

### 公開 API

#### `formatTime(totalSeconds: number): string`

秒数を `"MM:SS"` 形式の文字列に変換します。

```js
PomodoroLogic.formatTime(300);  // → "05:00"
PomodoroLogic.formatTime(65);   // → "01:05"
PomodoroLogic.formatTime(0);    // → "00:00"
```

#### `getDurationSeconds(mode: string, settings: object): number`

指定モードの設定時間を秒数で返します。
不明なモードキーは `"work"` にフォールバックします。

```js
const settings = { work: 25, shortBreak: 5, longBreak: 15, sessionsBeforeLongBreak: 4 };
PomodoroLogic.getDurationSeconds("work", settings);       // → 1500
PomodoroLogic.getDurationSeconds("shortBreak", settings); // → 300
PomodoroLogic.getDurationSeconds("longBreak", settings);  // → 900
```

#### `computeNextMode(currentMode: string, sessionCount: number, settings: object): string`

現在のモードとセッション数から次のモードを決定します。

- ブレーク中 → 常に `"work"` を返す
- 作業中 → `sessionCount > 0 && sessionCount % sessionsBeforeLongBreak === 0` なら `"longBreak"`、それ以外は `"shortBreak"`

```js
const settings = { sessionsBeforeLongBreak: 4, ... };
PomodoroLogic.computeNextMode("work", 1, settings);        // → "shortBreak"
PomodoroLogic.computeNextMode("work", 4, settings);        // → "longBreak"
PomodoroLogic.computeNextMode("shortBreak", 1, settings);  // → "work"
```

#### `computeRingOffset(secondsLeft: number, totalSeconds: number, circumference: number): number`

SVG の `stroke-dashoffset` 値を計算します。
時間が満杯のとき `0`、時間切れのとき `circumference` を返します。

```js
PomodoroLogic.computeRingOffset(60, 60, 565.48); // → 0
PomodoroLogic.computeRingOffset(0, 60, 565.48);  // → 565.48
PomodoroLogic.computeRingOffset(30, 60, 565.48); // → 282.74
```

#### `calculateXP(completedWorkSessions: number, xpPerSession: number): number`

完了した作業セッション数から累計 XP を計算します。
負の値や不正な値は `0` に補正されます。`xpPerSession` が `0` 以下の場合はデフォルトの `25` を使用します。

```js
PomodoroLogic.calculateXP(4, 25);  // → 100
PomodoroLogic.calculateXP(-1, 25); // → 0
```

#### `calculateLevel(totalXP: number, xpPerLevel: number): number`

累計 XP からレベルを計算します（レベル 1 から始まる）。

```js
PomodoroLogic.calculateLevel(0, 100);   // → 1
PomodoroLogic.calculateLevel(100, 100); // → 2
PomodoroLogic.calculateLevel(250, 100); // → 3
```

#### `calculateStreak(sessionHistoryByDate: object, referenceDate?: string): number`

`"YYYY-MM-DD"` をキーとするセッション履歴から、今日を終点とした連続日数（ストリーク）を返します。
`referenceDate` を省略すると現在日時を基準にします。

```js
const history = { "2026-08-17": 2, "2026-08-18": 1, "2026-08-19": 3 };
PomodoroLogic.calculateStreak(history, "2026-08-19T12:00:00Z"); // → 3
```

#### `buildPeriodStats(sessionHistoryByDate: object, focusMinutesByDate: object, days: number, referenceDate?: string): object`

指定期間の統計サマリーを返します。戻り値の構造は以下の通りです。

```js
{
  days: 7,
  totalSessions: 4,
  activeDays: 3,
  completionRate: 42.9,        // activeDays / days × 100 (小数点1桁)
  averageFocusMinutes: 26.3,   // totalFocusMinutes / totalSessions (小数点1桁)
  daily: [
    { date: "2026-08-13", sessions: 0, focusMinutes: 0 },
    // ... 直近 days 日分のエントリ
  ]
}
```

#### `collectBadges(streakDays: number, weeklySessions: number, totalSessions: number): Array`

条件を満たすバッジの配列を返します。

| バッジ ID | 条件 | ラベル | トーン |
|---|---|---|---|
| `"streak-3"` | `streakDays >= 3` | `"3日連続"` | `"bronze"` |
| `"weekly-10"` | `weeklySessions >= 10` | `"週10回達成"` | `"silver"` |
| `"total-100"` | `totalSessions >= 100` | `"100回達成"` | `"gold"` |

```js
PomodoroLogic.collectBadges(3, 10, 100);
// → [{ id: "streak-3", label: "3日連続", tone: "bronze" },
//     { id: "weekly-10", label: "週10回達成", tone: "silver" },
//     { id: "total-100", label: "100回達成", tone: "gold" }]
```

---

## `timer.js` — DOM コントローラ

### 定数

| 定数 | 値 | 説明 |
|---|---|---|
| `STORAGE_KEY` | `"pomodoro-state"` | localStorage のキー |
| `DEFAULT_SETTINGS` | `{ work:25, shortBreak:5, longBreak:15, sessionsBeforeLongBreak:4, theme:"dark", sounds:{start:true, end:true, tick:false} }` | デフォルト設定 |
| `RING_CIRCUMFERENCE` | `2π × 90 ≈ 565.49` | SVG 進捗リングの円周（px） |
| `XP_PER_SESSION` | `25` | 1 作業セッション当たりの獲得 XP |
| `XP_PER_LEVEL` | `100` | レベルアップに必要な XP |
| `WORK_OPTIONS` | `[15, 25, 35, 45]` | 作業時間の選択肢（分） |
| `BREAK_OPTIONS` | `[5, 10, 15]` | 休憩時間の選択肢（分） |
| `THEME_OPTIONS` | `["dark", "light", "focus"]` | テーマの選択肢 |

### 主要な状態変数

| 変数 | 説明 |
|---|---|
| `settings` | 現在のタイマー設定（localStorage から初期化） |
| `currentMode` | 現在のモード (`"work"` / `"shortBreak"` / `"longBreak"`) |
| `secondsLeft` | 残り秒数 |
| `intervalId` | `setInterval` のハンドル（`null` = 停止中） |
| `sessionCount` | 完了した作業セッション数 |
| `audioCtx` | Web Audio API の `AudioContext` インスタンス（初回音声再生時に生成） |
| `sessionHistoryByDate` | 日付ごとの完了セッション数（`{ "YYYY-MM-DD": number }`） |
| `focusMinutesByDate` | 日付ごとの累計フォーカス分数（`{ "YYYY-MM-DD": number }`） |

### 主要な関数

| 関数 | 説明 |
|---|---|
| `startTimer()` | タイマーを開始し、1 秒ごとに `tick()` を呼び出す |
| `stopTimer()` | タイマーを停止する |
| `toggleTimer()` | Start/Pause を切り替える |
| `resetTimer()` | 現在のモードの開始時間にリセットする |
| `setMode(mode)` | モードを切り替え、タイマーをリセットする |
| `tick()` | 1 秒減算し、0 になったらアラートと自動モード遷移を実行する。作業セッション完了時は `sessionHistoryByDate`・`focusMinutesByDate` を更新する |
| `updateDisplay()` | 残り時間表示・リングアニメーション・タブタイトルを更新する |
| `playTone(frequency, durationSeconds, volume)` | Web Audio API でサイン波トーンを再生する |
| `playStartSound()` | タイマー開始時に 660Hz・0.15 秒のトーンを再生する（`sounds.start` が有効な場合のみ） |
| `playEndSound()` | セッション終了時に 880Hz・0.6 秒のトーンを再生する（`sounds.end` が有効な場合のみ） |
| `playTickSound()` | 520Hz・0.03 秒のトーンを再生する（呼び出し条件の判定は `tick()` 側で `sounds.tick` を確認） |
| `notifyCompletion()` | ブラウザ通知 API でセッション終了を通知する |
| `applyTheme(theme)` | `body` のテーマクラスを切り替える（`theme-dark` / `theme-light` / `theme-focus`） |
| `getAllowedNumber(value, allowedValues, fallback)` | 値が許容リストに含まれるか検証し、含まれない場合はフォールバック値を返す |
| `getAllowedTheme(value)` | テーマ値が `THEME_OPTIONS` に含まれるか検証し、含まれない場合はデフォルトを返す |
| `loadSettings()` | localStorage から設定を読み込む |
| `loadSessionCount()` | localStorage からセッション数を読み込む |
| `loadSessionHistory()` | localStorage から日付別セッション履歴を読み込む |
| `loadFocusMinutesHistory()` | localStorage から日付別フォーカス分数履歴を読み込む |
| `persistState()` | 設定・セッション数・履歴を localStorage に保存する |
| `openSettingsPanel()` | 設定パネルの表示/非表示を切り替える |
| `saveSettings()` | 設定パネルの入力値を検証・保存してモードをリセットする |
| `updateGamificationViews()` | XP・レベル・ストリーク・バッジ・統計グラフを再描画する |
| `renderGraph(container, stats)` | 棒グラフ UI を動的に生成してコンテナに挿入する |

### イベントバインディング

| 要素 | イベント | 処理 |
|---|---|---|
| `#start-btn` | `click` | `toggleTimer()` |
| `#reset-btn` | `click` | `resetTimer()` |
| `.mode-btn` | `click` | `setMode(btn.dataset.mode)` |
| `#settings-toggle` | `click` | `openSettingsPanel()` |
| `#settings-save` | `click` | `saveSettings()` |
| `document` | `keydown` (Space) | `toggleTimer()`（入力欄フォーカス時は除く） |

---

## `style.css` — スタイルシート

### CSS カスタムプロパティ（変数）

| 変数 | 値（dark テーマ） | 用途 |
|---|---|---|
| `--color-work` | `#d64541` | 作業モードのテーマカラー |
| `--color-short-break` | `#4e9a51` | 短い休憩のテーマカラー |
| `--color-long-break` | `#2e86c1` | 長い休憩のテーマカラー |
| `--color-bg` | `#1e1e2f` | ページ背景色 |
| `--color-surface` | `#2a2a3d` | カードの背景色 |
| `--color-text` | `#f5f5f5` | テキストカラー |

### テーマクラス

| クラス | 説明 |
|---|---|
| `body.theme-dark` | デフォルトテーマ（ダーク背景） |
| `body.theme-light` | ライトテーマ（`--color-bg: #f3f5f8`、`--color-surface: #ffffff`） |
| `body.theme-focus` | フォーカステーマ（`--color-bg: #0f1117`、ボーダー付き最小限デザイン） |

### 主要なクラス

| クラス | 説明 |
|---|---|
| `.app` | メインカードコンテナ（幅 360px、角丸 16px） |
| `.modes` | モード切り替えボタングループ |
| `.mode-btn` | モードボタン（`.is-active` クラスで選択状態） |
| `.timer` | タイマー表示エリア（220×220px） |
| `.timer__ring` | SVG 進捗リング（-90 度回転で 12 時方向スタート） |
| `.timer__ring-progress` | 進捗リングの前景（`stroke-dashoffset` でアニメーション） |
| `.timer__display` | 残り時間テキストのオーバーレイ |
| `.controls` | Start / Reset ボタングループ |
| `.control-btn--primary` | プライマリボタン（作業モード色の背景） |
| `.settings-panel` | 設定パネル（`hidden` 属性で制御） |
| `.gamification` | XP・レベル・ストリーク・バッジ・統計を含む gamification セクション |
| `.badge` | バッジのピル形状要素 |
| `.badge--bronze` | ブロンズバッジ（`#795548`） |
| `.badge--silver` | シルバーバッジ（`#90a4ae`） |
| `.badge--gold` | ゴールドバッジ（`#d4af37`） |
| `.badge--empty` | バッジ未取得時のプレースホルダー |
| `.stats__graph` | 7 日分の棒グラフコンテナ（7 列グリッド） |
| `#monthly-graph` | 30 日分の棒グラフコンテナ（30 列グリッド、横スクロール） |
| `.stats__bar` | 個々の棒グラフ要素（グラデーション背景） |

---

## `templates/index.html` — HTML テンプレート

Flask の `url_for` ヘルパーを使って静的ファイルを参照しています。

```html
<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
<script src="{{ url_for('static', filename='js/timerLogic.js') }}"></script>
<script src="{{ url_for('static', filename='js/timer.js') }}"></script>
```

`timerLogic.js` は `timer.js` より先に読み込む必要があります（グローバル `PomodoroLogic` の依存のため）。

### HTML 構成

| セクション | 説明 |
|---|---|
| `.modes` | Work / Short Break / Long Break の切り替えボタン |
| `.timer` | SVG 進捗リングと残り時間表示 |
| `.controls` | Start / Reset ボタン |
| `.session-count` | 完了セッション数の表示 |
| `section.gamification` | XP・レベル・ストリーク・バッジ・週次／月次統計グラフ |
| `section#settings-panel` | 設定パネル（hidden 属性で初期非表示） |
