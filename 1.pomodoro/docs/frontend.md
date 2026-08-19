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

#### `computeProgressColor(secondsLeft: number, totalSeconds: number): string`

経過時間の割合に応じてリングの色を補間します。
開始時は青 (`#2e86c1`)、中間で黄 (`#f1c40f`)、終了時は赤 (`#d64541`) になります。
作業モードのみで使用され、休憩モードではモード固有の固定色が使用されます。

```js
PomodoroLogic.computeProgressColor(60, 60); // → "#2e86c1"（青）
PomodoroLogic.computeProgressColor(30, 60); // → "#f1c40f"（黄）
PomodoroLogic.computeProgressColor(0, 60);  // → "#d64541"（赤）
```

#### `calculateXP(completedWorkSessions: number, xpPerSession: number): number`

完了セッション数から合計 XP を計算します。負の値は 0 にクランプされます。

```js
PomodoroLogic.calculateXP(4, 25); // → 100
```

#### `calculateLevel(totalXP: number, xpPerLevel: number): number`

合計 XP からレベルを計算します。レベルは 1 から始まります。

```js
PomodoroLogic.calculateLevel(0, 100);   // → 1
PomodoroLogic.calculateLevel(100, 100); // → 2
PomodoroLogic.calculateLevel(250, 100); // → 3
```

#### `calculateStreak(sessionHistoryByDate: object, referenceDate?: string): number`

日付別セッション履歴から基準日（デフォルト: 今日）までの連続日数を計算します。
今日のセッションがなければ `0` を返します。

```js
const history = { "2026-08-17": 2, "2026-08-18": 1, "2026-08-19": 3 };
PomodoroLogic.calculateStreak(history, "2026-08-19T12:00:00Z"); // → 3
```

#### `buildPeriodStats(sessionHistoryByDate: object, focusMinutesByDate: object, days: number, referenceDate?: string): object`

指定日数分の期間統計を計算します。

戻り値の構造:

```js
{
  days: 7,
  totalSessions: 4,
  activeDays: 3,
  completionRate: 42.9,       // activeDays / days × 100（小数点1桁）
  averageFocusMinutes: 26.3,  // totalFocusMinutes / totalSessions（小数点1桁）
  daily: [
    { date: "2026-08-13", sessions: 0, focusMinutes: 0 },
    // ...
  ]
}
```

#### `collectBadges(streakDays: number, weeklySessions: number, totalSessions: number): object[]`

条件を満たしたバッジの配列を返します。各バッジは `{ id, label, tone }` の形式です。

| バッジ ID | 付与条件 | tone |
|---|---|---|
| `streak-3` | `streakDays >= 3` | `"bronze"` |
| `weekly-10` | `weeklySessions >= 10` | `"silver"` |
| `total-100` | `totalSessions >= 100` | `"gold"` |

```js
PomodoroLogic.collectBadges(3, 10, 100);
// → [{ id: "streak-3", label: "3日連続", tone: "bronze" }, ...]
```

---

## `timer.js` — DOM コントローラ

### 定数

| 定数 | 値 | 説明 |
|---|---|---|
| `STORAGE_KEY` | `"pomodoro-state"` | localStorage のキー |
| `DEFAULT_SETTINGS` | `{ work:25, shortBreak:5, longBreak:15, sessionsBeforeLongBreak:4, theme:"dark", sounds:{start:true,end:true,tick:false} }` | デフォルト設定 |
| `RING_CIRCUMFERENCE` | `2π × 90 ≈ 565.49` | SVG 進捗リングの円周（px） |
| `XP_PER_SESSION` | `25` | 1 セッションあたりの獲得 XP |
| `XP_PER_LEVEL` | `100` | 1 レベルアップに必要な XP |
| `WORK_OPTIONS` | `[15, 25, 35, 45]` | 作業時間の許容値（分） |
| `BREAK_OPTIONS` | `[5, 10, 15]` | 休憩時間の許容値（分） |
| `THEME_OPTIONS` | `["dark", "light", "focus"]` | テーマの許容値 |

### 主要な状態変数

| 変数 | 説明 |
|---|---|
| `settings` | 現在のタイマー設定（localStorage から初期化） |
| `currentMode` | 現在のモード (`"work"` / `"shortBreak"` / `"longBreak"`) |
| `secondsLeft` | 残り秒数（浮動小数点） |
| `animationFrameId` | `requestAnimationFrame` のハンドル（`null` = 停止中） |
| `completionTimeoutId` | `setTimeout` のハンドル（タイマー完了検出用） |
| `targetEndTimeMs` | タイマー終了予定の Unix タイムスタンプ（ms） |
| `lastTickDisplaySeconds` | チック音の重複再生防止に使用する直前の表示秒数 |
| `sessionCount` | 完了した作業セッション数 |
| `audioCtx` | Web Audio API のコンテキスト（遅延初期化） |
| `sessionHistoryByDate` | 日付別の完了セッション数マップ |
| `focusMinutesByDate` | 日付別の合計集中時間（分）マップ |

### 主要な関数

| 関数 | 説明 |
|---|---|
| `loadSettings()` | localStorage から設定を読み込み、許容値でバリデートして返す |
| `loadSessionCount()` | localStorage からセッション数を読み込む |
| `loadSessionHistory()` | localStorage から日付別セッション履歴を読み込む |
| `loadFocusMinutesHistory()` | localStorage から日付別集中時間履歴を読み込む |
| `persistState()` | 設定・セッション数・履歴を localStorage に保存する |
| `applyTheme(theme)` | `body` に `theme-{dark\|light\|focus}` クラスを付け替える |
| `startTimer()` | `requestAnimationFrame` + `setTimeout` でタイマーを開始する |
| `stopTimer(refreshDisplay?)` | タイマーを停止し、残り秒数を正確に保持する |
| `toggleTimer()` | Start/Pause を切り替える |
| `resetTimer()` | 現在のモードの開始時間にリセットする |
| `setMode(mode)` | モードを切り替え、タイマーを停止・リセットする |
| `updateDisplay(displaySeconds?, preciseSecondsLeft?)` | 残り時間・リング・タブタイトルを更新する |
| `notifyCompletion()` | ブラウザ通知 API でセッション終了を通知する |
| `playTone(frequency, durationSeconds, volume)` | Web Audio API で指定周波数のサイン波を再生する |
| `playStartSound()` | 開始音を再生する（660Hz, 0.15 秒）。`sounds.start` が false の場合はスキップ |
| `playEndSound()` | 終了音を再生する（880Hz, 0.6 秒）。`sounds.end` が false の場合はスキップ |
| `playTickSound()` | チック音を再生する（520Hz, 0.03 秒）。`sounds.tick` が true の場合のみ動作 |
| `openSettingsPanel()` | 設定パネルの入力値を現在の設定で埋め、表示/非表示を切り替える |
| `saveSettings()` | 設定パネルの入力値を検証・保存し、テーマとモードを再適用する |
| `renderGraph(container, stats)` | `stats.daily` データから棒グラフ DOM を生成してコンテナに描画する |
| `updateGamificationViews()` | XP・レベル・ストリーク・バッジ・週次/月次グラフを再描画する |

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

| 変数 | デフォルト値（dark テーマ） | 用途 |
|---|---|---|
| `--color-work` | `#d64541` | 作業モードのテーマカラー |
| `--color-short-break` | `#4e9a51` | 短い休憩のテーマカラー |
| `--color-long-break` | `#2e86c1` | 長い休憩のテーマカラー |
| `--color-bg` | `#1e1e2f` | ページ背景色 |
| `--color-surface` | `#2a2a3d` | カードの背景色 |
| `--color-text` | `#f5f5f5` | テキストカラー |
| `--color-border` | `rgba(255,255,255,0.2)` | ボーダーカラー |
| `--color-input-bg` | `rgba(255,255,255,0.05)` | 入力欄の背景色 |

### テーマ

| クラス | 説明 |
|---|---|
| `body`（デフォルト） | ダークテーマ |
| `body.theme-light` | ライトテーマ（`--color-bg: #f3f5f8`） |
| `body.theme-focus` | フォーカステーマ（全黒背景、ボーダーあり） |

### 主要なクラス

| クラス | 説明 |
|---|---|
| `.app` | メインカードコンテナ（幅 360px、角丸 16px） |
| `.app__header` | タイトルと設定ボタンを含むヘッダー行 |
| `.icon-btn` | 設定歯車ボタン（絶対配置） |
| `.modes` | モード切り替えボタングループ |
| `.mode-btn` | モードボタン（`.is-active` クラスで選択状態） |
| `.timer` | タイマー表示エリア（220×220px） |
| `.timer__ring` | SVG 進捗リング（-90 度回転で 12 時方向スタート） |
| `.timer__ring-progress` | 進捗リングの前景（`stroke-dashoffset` でアニメーション） |
| `.timer__display` | 残り時間テキストのオーバーレイ |
| `.controls` | Start / Reset ボタングループ |
| `.control-btn--primary` | プライマリボタン（作業モード色の背景） |
| `.settings-panel` | 設定パネル（`hidden` 属性で制御） |
| `.settings-field` | 設定項目の行（label + input/select） |
| `.settings-field--checkbox` | チェックボックス型の設定項目 |
| `.is-focus-mode` | 作業モード中に `body` に付与されるクラス（パーティクルアニメーション有効化） |
| `.gamification` | ゲーミフィケーションセクションのコンテナ |
| `.badge-list` | バッジ一覧の flex コンテナ |
| `.badge` | 個別バッジ（pill 型） |
| `.badge--bronze` | ブロンズバッジ（背景 `#795548`） |
| `.badge--silver` | シルバーバッジ（背景 `#90a4ae`） |
| `.badge--gold` | ゴールドバッジ（背景 `#d4af37`、テキスト暗色） |
| `.badge--empty` | バッジ未獲得時のプレースホルダー |
| `.stats` | 週次・月次統計セクション |
| `.stats__graph` | バーグラフのグリッドコンテナ（週次: 7列、月次: 30列） |
| `.stats__bar-item` | グラフの1列（値・バー・ラベルの縦並び） |
| `.stats__bar` | グラフのバー（高さは最大値に対する割合、最小 8px） |
| `.stats__bar-label` | バーの下部に表示される日付ラベル（`MM/DD` 形式） |
| `.stats__bar-value` | バーの上部に表示されるセッション数 |

---

## `templates/index.html` — HTML テンプレート

Flask の `url_for` ヘルパーを使って静的ファイルを参照しています。

```html
<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
<script src="{{ url_for('static', filename='js/timerLogic.js') }}"></script>
<script src="{{ url_for('static', filename='js/timer.js') }}"></script>
```

`timerLogic.js` は `timer.js` より先に読み込む必要があります（グローバル `PomodoroLogic` の依存のため）。
