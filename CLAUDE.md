# DrawSVG

Electron + TypeScript で構築された SVG 編集ドローツール。

## プロジェクト概要

直線・楕円・長方形・テキスト・グラフ（ノードとエッジ）を描画し、選択・移動・リサイズ・スタイル変更ができる SVG エディタ。
Undo/Redo、ファイル保存/読み込み、コピー/ペーストに対応。

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
│   │   ├── Sidebar.ts       # サイドバー（スタイル編集）
│   │   └── TextInputDialog.ts # テキスト入力ダイアログ
│   ├── core/                # コアロジック
│   │   ├── EventBus.ts      # イベント通信
│   │   ├── EditorState.ts   # 状態管理
│   │   ├── SelectionManager.ts  # 選択管理
│   │   ├── HistoryManager.ts    # Undo/Redo履歴管理
│   │   ├── FileManager.ts       # SVGシリアライズ/パース
│   │   ├── ClipboardManager.ts  # コピー/ペースト管理
│   │   ├── MarkerManager.ts     # SVGマーカー定義（矢印）
│   │   └── GraphManager.ts      # グラフ（ノード-エッジ）関係管理
│   ├── commands/            # コマンドパターン（Undo/Redo）
│   │   ├── Command.ts           # インターフェース
│   │   ├── AddShapeCommand.ts   # 図形追加
│   │   ├── DeleteShapeCommand.ts # 図形削除
│   │   ├── MoveShapeCommand.ts  # 図形移動
│   │   ├── ResizeShapeCommand.ts # 図形リサイズ
│   │   ├── StyleChangeCommand.ts # スタイル変更
│   │   ├── PasteShapesCommand.ts # 図形ペースト
│   │   ├── TextPropertyChangeCommand.ts # テキストプロパティ変更
│   │   ├── MarkerChangeCommand.ts # 矢印マーカー変更
│   │   ├── ZOrderCommand.ts       # 重ね順変更
│   │   ├── AddNodeCommand.ts      # ノード追加
│   │   ├── AddEdgeCommand.ts      # エッジ追加
│   │   ├── DeleteNodeCommand.ts   # ノード削除（接続エッジも削除）
│   │   ├── DeleteEdgeCommand.ts   # エッジ削除
│   │   ├── NodeLabelChangeCommand.ts  # ノードラベル変更
│   │   └── EdgeDirectionChangeCommand.ts # エッジ方向変更
│   ├── shapes/              # 図形クラス
│   │   ├── Shape.ts         # インターフェース
│   │   ├── Line.ts          # 直線
│   │   ├── Ellipse.ts       # 楕円
│   │   ├── Rectangle.ts     # 長方形
│   │   ├── Text.ts          # テキスト
│   │   ├── Node.ts          # グラフノード（楕円＋ラベル）
│   │   ├── Edge.ts          # グラフエッジ（直線/曲線/自己ループ）
│   │   └── ShapeFactory.ts  # 図形生成ファクトリ
│   ├── tools/               # ツール
│   │   ├── Tool.ts          # インターフェース
│   │   ├── SelectTool.ts    # 選択・移動・リサイズ・範囲選択
│   │   ├── LineTool.ts      # 直線描画
│   │   ├── EllipseTool.ts   # 楕円描画
│   │   ├── RectangleTool.ts # 長方形描画
│   │   ├── TextTool.ts      # テキスト配置
│   │   ├── NodeTool.ts      # ノード配置
│   │   ├── EdgeTool.ts      # エッジ作成
│   │   ├── DeleteNodeTool.ts # ノード削除
│   │   └── DeleteEdgeTool.ts # エッジ削除
│   ├── handles/             # リサイズハンドル
│   │   ├── Handle.ts        # インターフェース
│   │   ├── LineHandles.ts   # 直線用（2点）
│   │   ├── EllipseHandles.ts # 楕円用（4隅）
│   │   ├── RectangleHandles.ts # 長方形用（4隅）
│   │   ├── TextHandles.ts   # テキスト用（中心点）
│   │   └── NodeHandles.ts   # ノード用（4隅）
│   └── styles/              # CSS（main, toolbar, sidebar, canvas, dialog）
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
- `shapes:paste` - 図形ペーストリクエスト
- `shapes:zorder` - 重ね順変更リクエスト
- `selection:changed` - 選択変更
- `history:changed` - Undo/Redo状態変更
- `canvas:zoomChanged` - ズーム/パン変更
- `canvas:zoomReset` - ズームリセットリクエスト
- `snap:changed` - グリッドスナップ状態変更
- `file:save` - ファイル保存リクエスト
- `file:saveAs` - 別名で保存リクエスト
- `file:open` - ファイル読み込みリクエスト
- `file:dirtyChanged` - 未保存状態変更
- `node:added` - ノード追加
- `edge:added` - エッジ追加
- `node:delete` - ノード削除リクエスト
- `edge:delete` - エッジ削除リクエスト
- `edgeDirection:changed` - エッジ方向変更
- `shape:updated` - 図形の位置・サイズ変更（ドラッグ移動/リサイズ時）

## キーボードショートカット

- `V` - 選択ツール
- `L` - 直線ツール
- `E` - 楕円ツール
- `R` - 長方形ツール
- `T` - テキストツール
- `N` - ノードツール
- `W` - エッジツール
- `H` - パンツール
- `G` - グリッドスナップ切り替え
- `Delete` / `Backspace` - 選択図形を削除
- `Ctrl+Z` - 元に戻す（Undo）
- `Ctrl+Y` / `Ctrl+Shift+Z` - やり直し（Redo）
- `Ctrl+C` - コピー
- `Ctrl+V` - ペースト
- `Ctrl+S` - ファイル保存
- `Ctrl+Shift+S` - 別名で保存
- `Ctrl+O` - ファイルを開く
- `Ctrl+]` - 1つ前面へ
- `Ctrl+[` - 1つ背面へ
- `Ctrl+Shift+]` - 最前面へ
- `Ctrl+Shift+[` - 最背面へ
- `Ctrl+0` - ズームリセット（100%）

## 選択操作

- クリック - 図形を選択
- `Shift`+クリック - 選択に追加
- ドラッグ（空白から） - 範囲選択（完全包含）
- `Alt`+ドラッグ - 範囲選択（交差モード）
- `Shift`+ドラッグ - 既存選択に追加

## スタイルプロパティ

- Fill（塗りつぶし色、None対応）
- Stroke（線色）
- Stroke Width（線幅）
- Opacity（不透明度）
- Stroke Dasharray（破線スタイル）
- Stroke Linecap（線端スタイル）

## テキストプロパティ

テキスト図形選択時のみ表示:
- Content（テキスト内容）
- Font Size（フォントサイズ）
- Font Family（フォントファミリー）
- Bold（太字）

## 直線プロパティ（矢印）

直線図形選択時のみ表示:
- Arrow Start（始点マーカー）
- Arrow End（終点マーカー）

マーカー種類:
- None（なし）
- Triangle（三角形）
- Triangle Open（中抜き三角形）
- Circle（円）
- Diamond（ひし形）

※ マーカーの色は線の色（Stroke）に連動

## ズーム・パン

- マウスホイール - ズームイン/アウト（カーソル位置中心）
- `Space` + ドラッグ - パン（キャンバス移動）
- パンツールボタン（✋）- クリックでパンモード
- ツールバー「1:1」ボタン - ズームリセット
- ズーム範囲: 10% ～ 1000%
- ズームインジケーターで現在の倍率を表示

## グリッドスナップ

- ツールバー「#」ボタン - スナップモード切り替え
- `G`キー - スナップモード切り替え
- スナップ間隔: 10px
- スナップ対象:
  - 図形作成時（始点・終点）
  - 図形移動時
  - 図形リサイズ時
- スナップモード時はグリッド線を表示

## グラフ機能

ノード（頂点）とエッジ（辺）を描画してグラフを作成可能。

### ノード

- `N`キー または ツールバーノードボタンでノードツールに切り替え
- キャンバスをクリックでノードを配置
- ラベル入力ダイアログが表示される
- ノードは楕円＋中央ラベルで描画
- 選択してドラッグで移動（接続エッジも連動）
- 4隅のハンドルでリサイズ可能

### エッジ

- `W`キー または ツールバーエッジボタンでエッジツールに切り替え
- エッジ作成方法:
  - 始点ノードをクリック → 終点ノードをクリック
  - 始点ノードから終点ノードへドラッグ
- 有向/無向切り替えボタンで方向を設定
- 並行辺: 同じノード間に複数エッジがある場合、曲線でオフセット
- 自己ループ: 同じノードへのエッジはベジェ曲線で描画

### エッジ方向

- None（無向）: 矢印なし
- Forward（前方向）: 終点に矢印
- Backward（後方向）: 始点に矢印

### 削除

- DeleteNodeTool: ノードをクリックで削除（接続エッジも一括削除）
- DeleteEdgeTool: エッジをクリックで削除
- 削除対象にホバーすると赤ハイライト

### ノード/エッジプロパティ

ノード選択時:
- Node Label（ラベル文字列）
- Font Size（フォントサイズ）

エッジ選択時:
- Direction（方向: Undirected / Forward / Backward）

### SVG保存形式

```xml
<!-- ノード -->
<g id="node-123" data-graph-type="node" data-label="A">
  <ellipse cx="100" cy="100" rx="30" ry="30" fill="..." stroke="..."/>
  <text x="100" y="100" text-anchor="middle">A</text>
</g>

<!-- エッジ -->
<path id="edge-456" data-graph-type="edge"
      data-source-id="node-123" data-target-id="node-789"
      data-direction="forward" data-curve-offset="0"
      d="M 130 100 L 270 100" fill="none" stroke="..."/>
```

## 開発ワークフロー

### CHANGELOG.md への記録

機能実装やバグ修正を行った際は、必ず `CHANGELOG.md` に日本語で記録を残すこと。

フォーマット:
```markdown
## [バージョン or 日付] - YYYY-MM-DD

### 追加
- 新機能の説明

### 変更
- 変更内容の説明

### 修正
- バグ修正の説明
```

### Git コミット

実装完了後は自動的に git commit を行う。コミットメッセージは英語で、以下の形式に従う:

- `feat: 新機能の追加`
- `fix: バグ修正`
- `docs: ドキュメント更新`
- `refactor: リファクタリング`
- `style: コードスタイル修正`

フェーズごとの実装では、各フェーズ完了時にコミットする。
