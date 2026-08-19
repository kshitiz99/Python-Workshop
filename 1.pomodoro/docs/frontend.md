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

---

## `timer.js` — DOM コントローラ

### 定数

| 定数 | 値 | 説明 |
|---|---|---|
| `STORAGE_KEY` | `"pomodoro-state"` | localStorage のキー |
| `DEFAULT_SETTINGS` | `{ work:25, shortBreak:5, longBreak:15, sessionsBeforeLongBreak:4, theme:"dark", sounds:{start:true,end:true,tick:false} }` | デフォルト設定 |
| `RING_CIRCUMFERENCE` | `2π × 90 ≈ 565.49` | SVG 進捗リングの円周（px） |
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

### 主要な関数

| 関数 | 説明 |
|---|---|
| `startTimer()` | タイマーを開始し、1 秒ごとに `tick()` を呼び出す |
| `stopTimer()` | タイマーを停止する |
| `toggleTimer()` | Start/Pause を切り替える |
| `resetTimer()` | 現在のモードの開始時間にリセットする |
| `setMode(mode)` | モードを切り替え、タイマーをリセットする |
| `tick()` | 1 秒減算し、0 になったらサウンド再生・通知・自動モード遷移を実行する |
| `updateDisplay()` | 残り時間表示・リングアニメーション・タブタイトルを更新する |
| `playTone(frequency, durationSeconds, volume)` | Web Audio API で指定周波数のトーンを再生する |
| `playStartSound()` | タイマー開始音を再生する（660Hz、0.15 秒） |
| `playEndSound()` | タイマー終了音を再生する（880Hz、0.6 秒） |
| `playTickSound()` | 毎秒のティック音を再生する（520Hz、0.03 秒） |
| `notifyCompletion()` | ブラウザ通知 API でセッション終了を通知する |
| `applyTheme(theme)` | `<body>` に `theme-{name}` クラスを付与してテーマを切り替える |
| `getAllowedNumber(value, allowedValues, fallback)` | 値が許容リストに含まれるか検証し、含まれない場合はフォールバック値を返す |
| `getAllowedTheme(value)` | テーマ値が `THEME_OPTIONS` に含まれるか検証し、含まれない場合はデフォルトを返す |
| `loadSettings()` | localStorage から設定を読み込む |
| `loadSessionCount()` | localStorage からセッション数を読み込む |
| `persistState()` | 設定とセッション数を localStorage に保存する |
| `openSettingsPanel()` | 設定パネルの表示/非表示を切り替える |
| `saveSettings()` | 設定パネルの入力値を検証・保存してモードをリセットする |

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

| 変数 | 値 | 用途 |
|---|---|---|
| `--color-work` | `#d64541` | 作業モードのテーマカラー |
| `--color-short-break` | `#4e9a51` | 短い休憩のテーマカラー |
| `--color-long-break` | `#2e86c1` | 長い休憩のテーマカラー |
| `--color-bg` | `#1e1e2f` | ページ背景色 |
| `--color-surface` | `#2a2a3d` | カードの背景色 |
| `--color-text` | `#f5f5f5` | テキストカラー |

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

---

## `templates/index.html` — HTML テンプレート

Flask の `url_for` ヘルパーを使って静的ファイルを参照しています。

```html
<link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}">
<script src="{{ url_for('static', filename='js/timerLogic.js') }}"></script>
<script src="{{ url_for('static', filename='js/timer.js') }}"></script>
```

`timerLogic.js` は `timer.js` より先に読み込む必要があります（グローバル `PomodoroLogic` の依存のため）。
