# DrawSVG LLM統合機能 実装計画

## 概要

自然言語でSVG図形を操作するLLM統合機能を追加する。

**ユーザー入力例:**
- 「直線だけをすべて選択して」→ LLMがselect_shapesツールを実行
- 「赤い図形を削除して」→ LLMが条件に基づいて選択・削除
- 「犬を追加して」→ LLMが基本図形を組み合わせて犬を描画

## 要件

- 複数LLM API対応（Anthropic Claude、OpenAI、ローカルLLM）
- 基本図形の組み合わせで複雑な形状を生成
- 現在のSVG状態をLLMに送信してコンテキスト理解

---

## フェーズ1: LLMプロバイダー抽象化レイヤー

### 新規ファイル

| ファイル | 説明 |
|---------|------|
| `src/shared/llm-types.ts` | LLM関連の型定義 |
| `src/main/llm/LLMProvider.ts` | プロバイダー抽象基底クラス |
| `src/main/llm/AnthropicProvider.ts` | Anthropic Claude実装 |
| `src/main/llm/OpenAIProvider.ts` | OpenAI実装 |
| `src/main/llm/LocalLLMProvider.ts` | Ollama等のローカルLLM実装 |
| `src/main/llm/LLMProviderFactory.ts` | プロバイダーファクトリー |

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/main/main.ts` | IPC handlers追加 (`llm:sendMessage`, `llm:getConfig`, `llm:setConfig`) |
| `src/preload/preload.ts` | `electronAPI.llm` を公開 |
| `package.json` | `@anthropic-ai/sdk`, `openai` 依存追加 |

---

## フェーズ2: ツール/Function定義

### 新規ファイル

| ファイル | 説明 |
|---------|------|
| `src/renderer/llm/tools/LLMToolDefinitions.ts` | LLMツール定義 |
| `src/renderer/llm/tools/LLMToolExecutor.ts` | ツール実行エンジン |
| `src/renderer/llm/tools/CompositeShapeGenerator.ts` | 複合図形生成（犬、家など） |

### 定義するツール

| ツール名 | 説明 |
|---------|------|
| `add_rectangle` | 矩形追加 |
| `add_ellipse` | 楕円追加 |
| `add_line` | 直線追加 |
| `add_polygon` | 多角形追加 |
| `add_text` | テキスト追加 |
| `select_shapes` | 条件に基づいて図形を選択 |
| `delete_selected` | 選択図形を削除 |
| `change_style` | スタイル変更 |
| `move_selected` | 選択図形を移動 |
| `group_selected` | グループ化 |
| `add_composite_shape` | 複合図形追加（動物、建物など） |

---

## フェーズ3: キャンバス状態シリアライズ

### 新規ファイル

| ファイル | 説明 |
|---------|------|
| `src/renderer/llm/CanvasContextBuilder.ts` | キャンバス状態をLLM用JSONに変換 |

### 送信する情報

```json
{
  "canvasSize": { "width": 800, "height": 600 },
  "shapes": [
    { "id": "...", "type": "rectangle", "bounds": {...}, "style": {...} }
  ],
  "selectedShapeIds": ["..."],
  "currentTool": "select",
  "currentStyle": {...}
}
```

---

## フェーズ4: UIコンポーネント

### 新規ファイル

| ファイル | 説明 |
|---------|------|
| `src/renderer/components/AIChat.ts` | チャットパネルUI |
| `src/renderer/components/LLMSettingsDialog.ts` | LLM設定ダイアログ |
| `src/renderer/styles/ai-chat.css` | チャットパネルCSS |

### UI構成

- 右サイドに折りたたみ可能なチャットパネル
- テキスト入力欄 + 送信ボタン
- メッセージ履歴表示
- ツールバーにAIトグルボタン追加

---

## フェーズ5: LLMサービス統合

### 新規ファイル

| ファイル | 説明 |
|---------|------|
| `src/renderer/llm/LLMService.ts` | LLM通信とツール実行のオーケストレーション |

### 処理フロー

```
ユーザー入力
    ↓
CanvasContextBuilder（現在の状態を取得）
    ↓
LLMに送信（システムプロンプト + 履歴 + ツール定義）
    ↓
ツールコール受信 → LLMToolExecutorで実行
    ↓
結果をLLMに返送（ループ、最大10回）
    ↓
最終応答をユーザーに表示
```

---

## フェーズ6: 最終統合

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/renderer/index.ts` | LLMService, AIChat初期化 |
| `src/renderer/index.html` | CSSリンク追加 |
| `src/renderer/components/Toolbar.ts` | AIトグルボタン追加 |
| `src/shared/types.ts` | 新イベント型追加 (`ai:toggle`等) |
| `CLAUDE.md` | ドキュメント更新 |
| `CHANGELOG.md` | 変更履歴追記 |

---

## セキュリティ考慮事項

1. **APIキー**: メインプロセスで管理、レンダラーに露出しない
2. **IPC検証**: すべてのLLMリクエストをメインプロセスで検証
3. **入力サニタイズ**: ユーザー入力をLLM送信前にサニタイズ

---

## 依存パッケージ

```json
{
  "@anthropic-ai/sdk": "^0.21.0",
  "openai": "^4.28.0"
}
```

---

## ファイル構造（新規追加）

```
src/
├── main/
│   └── llm/
│       ├── LLMProvider.ts
│       ├── AnthropicProvider.ts
│       ├── OpenAIProvider.ts
│       ├── LocalLLMProvider.ts
│       └── LLMProviderFactory.ts
├── renderer/
│   ├── components/
│   │   ├── AIChat.ts
│   │   └── LLMSettingsDialog.ts
│   ├── llm/
│   │   ├── LLMService.ts
│   │   ├── CanvasContextBuilder.ts
│   │   └── tools/
│   │       ├── LLMToolDefinitions.ts
│   │       ├── LLMToolExecutor.ts
│   │       └── CompositeShapeGenerator.ts
│   └── styles/
│       └── ai-chat.css
└── shared/
    └── llm-types.ts
```
