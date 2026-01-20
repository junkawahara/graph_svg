# DrawSVG: Electron/Web 共通化計画

## 概要

既存の Electron アプリを、Electron 版と Web 版の両方で動作するように共通化する。プラットフォーム固有の処理を抽象化レイヤーで分離し、`src/renderer/` 以下のコードを最大限共通化する。

## 方針

- **ファイル操作（Web版）**: `<input type="file">` でアップロード、`<a download>` でダウンロード
- **画像インポート**: Web版では未対応
- **設定保存（Web版）**: localStorage
- **メニュー（Web版）**: 既存の Toolbar + キーボードショートカットで対応（追加UI不要）

---

## ファイル構成

### 新規作成

```
src/shared/platform/
├── PlatformAPI.ts        # インターフェース定義
├── ElectronPlatform.ts   # Electron版実装
└── WebPlatform.ts        # Web版実装

src/renderer/
└── index-web.ts          # Web版エントリポイント

src/web/
└── index.html            # Web版HTML

webpack.web.config.js     # Web版ビルド設定
```

### 修正対象

- `src/renderer/index.ts` - `window.electronAPI.*` → `platform.*` に置換
- `src/renderer/core/EditorState.ts` - `setWindowTitle` を platform API 経由に
- `package.json` - Web版ビルドスクリプト追加

---

## 実装ステップ

### Step 1: PlatformAPI インターフェース作成

`src/shared/platform/PlatformAPI.ts` を作成:

```typescript
export interface PlatformAPI {
  // ファイル操作
  openFile(): Promise<FileOpenResult | null>;
  openGraphFile(): Promise<FileOpenResult | null>;
  saveFile(content: string, currentPath: string | null): Promise<FileSaveResult>;
  saveFileAs(content: string, defaultName?: string): Promise<FileSaveResult>;

  // 設定
  readSettings(): Promise<AppSettings>;
  writeSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // ウィンドウ
  setWindowTitle(title: string): void;
  allowClose(): Promise<void>;

  // イベント
  onBeforeClose(callback: () => void): () => void;
  onMenu*(callback): () => void;  // 各メニューイベント

  // プラットフォーム情報
  readonly platformType: 'electron' | 'web';
  readonly supportsImageImport: boolean;
}
```

### Step 2: ElectronPlatform 実装

`src/shared/platform/ElectronPlatform.ts` - 既存の `window.electronAPI` をラップ

### Step 3: index.ts を platform API 経由に修正

変更箇所（約25箇所）:
- `window.electronAPI.saveFileToPath()` → `platform.saveFile()`
- `window.electronAPI.saveFileAs()` → `platform.saveFileAs()`
- `window.electronAPI.openFile()` → `platform.openFile()`
- `window.electronAPI.readSettings()` → `platform.readSettings()`
- 他、メニューイベントリスナー登録

### Step 4: EditorState.ts を修正

247行目: `window.electronAPI.setWindowTitle(title)` → `platform.setWindowTitle(title)`

### Step 5: WebPlatform 実装

`src/shared/platform/WebPlatform.ts`:
- `openFile()`: `<input type="file">` で選択 → `FileReader` で読み込み
- `saveFile()` / `saveFileAs()`: `Blob` + `<a download>` でダウンロード
- `readSettings()` / `writeSettings()`: `localStorage`
- `setWindowTitle()`: `document.title`
- `onBeforeClose()`: `beforeunload` イベント
- `onMenu*()`: 空の解除関数を返す（Toolbar で対応済み）

### Step 6: Web版エントリポイント作成

`src/renderer/index-web.ts`:
```typescript
import { initializePlatform } from '../shared/platform/PlatformAPI';
import { WebPlatform } from '../shared/platform/WebPlatform';
initializePlatform(new WebPlatform());
// 共通初期化ロジックを実行
```

### Step 7: Web版 HTML 作成

`src/web/index.html` - 既存の `src/renderer/index.html` をベースに CSP を調整

### Step 8: Web版ビルド設定

`webpack.web.config.js`:
```javascript
module.exports = {
  entry: './src/renderer/index-web.ts',
  target: 'web',
  output: { path: 'dist-web', filename: 'index.js' },
  // 他は既存設定を流用
};
```

`package.json` に追加:
```json
"build:web": "webpack --config webpack.web.config.js",
"dev:web": "webpack serve --config webpack.web.config.js --open"
```

---

## Web版の制限事項

| 機能 | Electron版 | Web版 |
|------|-----------|-------|
| ファイル保存 | 上書き保存可能 | 常にダウンロード |
| ファイルパス | フルパス表示 | ファイル名のみ |
| 画像インポート | 対応 | 未対応 |
| 終了確認 | カスタムダイアログ | ブラウザネイティブ |
| メニューバー | ネイティブメニュー | Toolbar のみ |

---

## 検証方法

1. **Electron版**: `npm start` で起動、既存機能が正常動作することを確認
2. **Web版**: `npm run dev:web` でブラウザ起動
   - 新規作成、図形描画、Undo/Redo
   - ファイル保存（ダウンロード）
   - ファイル読み込み（アップロード）
   - 設定の保存/読み込み（リロード後も維持）
   - キーボードショートカット

---

## 作業量見積もり

| ステップ | 内容 | 見積もり |
|---------|------|---------|
| Step 1 | PlatformAPI インターフェース | 30分 |
| Step 2 | ElectronPlatform 実装 | 30分 |
| Step 3 | index.ts 修正 | 1時間 |
| Step 4 | EditorState.ts 修正 | 10分 |
| Step 5 | WebPlatform 実装 | 1時間 |
| Step 6 | index-web.ts 作成 | 20分 |
| Step 7 | Web版 HTML | 15分 |
| Step 8 | ビルド設定 | 30分 |
| テスト | 両版の動作確認 | 1時間 |
| **合計** | | **約5時間** |
