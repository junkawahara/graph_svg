# DrawSVG

Electron + TypeScript で構築された SVG 編集ドローツール。

## プロジェクト概要

直線・楕円・長方形を描画し、選択・移動・リサイズ・スタイル変更ができる SVG エディタ。
Undo/Redo、ファイル保存/読み込みに対応。

## コマンド

```bash
npm install    # 依存関係のインストール
npm run build  # ビルド
npm start      # ビルド＆起動
npm run dev    # ウォッチモードでビルド
```

## プロジェクト構造

```
src/
├── main/                    # Electron メインプロセス
│   └── main.ts              # ウィンドウ作成、ファイルダイアログIPC
├── preload/                 # プリロードスクリプト
│   └── preload.ts           # electronAPI公開
├── renderer/                # レンダラープロセス
│   ├── index.html
│   ├── index.ts             # エントリポイント、ファイル操作ハンドラ
│   ├── components/          # UI コンポーネント
│   │   ├── Canvas.ts        # SVG キャンバス管理
│   │   ├── Toolbar.ts       # ツールバー（ツール選択、Undo/Redo、削除、ファイル操作）
│   │   └── Sidebar.ts       # サイドバー（スタイル編集）
│   ├── core/                # コアロジック
│   │   ├── EventBus.ts      # イベント通信
│   │   ├── EditorState.ts   # 状態管理
│   │   ├── SelectionManager.ts  # 選択管理
│   │   ├── HistoryManager.ts    # Undo/Redo履歴管理
│   │   └── FileManager.ts       # SVGシリアライズ/パース
│   ├── commands/            # コマンドパターン（Undo/Redo）
│   │   ├── Command.ts           # インターフェース
│   │   ├── AddShapeCommand.ts   # 図形追加
│   │   ├── DeleteShapeCommand.ts # 図形削除
│   │   ├── MoveShapeCommand.ts  # 図形移動
│   │   ├── ResizeShapeCommand.ts # 図形リサイズ
│   │   └── StyleChangeCommand.ts # スタイル変更
│   ├── shapes/              # 図形クラス
│   │   ├── Shape.ts         # インターフェース
│   │   ├── Line.ts          # 直線
│   │   ├── Ellipse.ts       # 楕円
│   │   └── Rectangle.ts     # 長方形
│   ├── tools/               # ツール
│   │   ├── Tool.ts          # インターフェース
│   │   ├── SelectTool.ts    # 選択・移動・リサイズ
│   │   ├── LineTool.ts      # 直線描画
│   │   ├── EllipseTool.ts   # 楕円描画
│   │   └── RectangleTool.ts # 長方形描画
│   ├── handles/             # リサイズハンドル
│   │   ├── Handle.ts        # インターフェース
│   │   ├── LineHandles.ts   # 直線用（2点）
│   │   ├── EllipseHandles.ts # 楕円用（4隅）
│   │   └── RectangleHandles.ts # 長方形用（4隅）
│   └── styles/              # CSS
└── shared/
    └── types.ts             # 共有型定義
```

## 設計パターン

- **EventBus**: コンポーネント間の疎結合通信
- **Tool パターン**: 各描画モードを Tool クラスに分離、Canvas がアクティブなツールにイベント委譲
- **Shape 抽象化**: 共通インターフェースで図形を扱い、新規図形追加を容易に
- **HandleSet**: 図形ごとに適切なハンドルセットを生成
- **Command パターン**: すべての編集操作をコマンドオブジェクト化し、Undo/Redo を実現

## 主要なイベント

- `tool:changed` - ツール切り替え
- `style:changed` - スタイル変更
- `shape:added` - 図形追加
- `shapes:delete` - 図形削除リクエスト
- `selection:changed` - 選択変更
- `history:changed` - Undo/Redo状態変更
- `file:save` - ファイル保存リクエスト
- `file:open` - ファイル読み込みリクエスト

## キーボードショートカット

- `V` - 選択ツール
- `L` - 直線ツール
- `E` - 楕円ツール
- `R` - 長方形ツール
- `Delete` / `Backspace` - 選択図形を削除
- `Ctrl+Z` - 元に戻す（Undo）
- `Ctrl+Y` / `Ctrl+Shift+Z` - やり直し（Redo）
- `Ctrl+S` - ファイル保存
- `Ctrl+O` - ファイルを開く

## スタイルプロパティ

- Fill（塗りつぶし色、None対応）
- Stroke（線色）
- Stroke Width（線幅）
- Opacity（不透明度）
- Stroke Dasharray（破線スタイル）
- Stroke Linecap（線端スタイル）
