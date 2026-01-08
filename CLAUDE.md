# DrawSVG

Electron + TypeScript で構築された SVG 編集ドローツール。

## プロジェクト概要

直線・楕円・長方形・多角形・ポリライン・ベジェパス・テキスト・グラフ（ノードとエッジ）を描画し、選択・移動・リサイズ・スタイル変更ができる SVG エディタ。
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
│   │   ├── GraphManager.ts      # グラフ（ノード-エッジ）関係管理
│   │   ├── BoundsCalculator.ts  # バウンディングボックス計算
│   │   ├── TransformParser.ts   # SVG transform 属性解析
│   │   └── PathParser.ts        # SVG path d属性パーサー
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
│   │   ├── EdgeDirectionChangeCommand.ts # エッジ方向変更
│   │   ├── GroupShapesCommand.ts    # グループ化
│   │   ├── UngroupShapesCommand.ts  # グループ解除
│   │   ├── FitCanvasToContentCommand.ts # キャンバスをコンテンツにフィット
│   │   └── RotateShapeCommand.ts    # 図形回転
│   ├── shapes/              # 図形クラス
│   │   ├── Shape.ts         # インターフェース
│   │   ├── Line.ts          # 直線
│   │   ├── Ellipse.ts       # 楕円
│   │   ├── Rectangle.ts     # 長方形
│   │   ├── Polygon.ts       # 多角形
│   │   ├── Polyline.ts      # ポリライン（折れ線）
│   │   ├── Path.ts          # パス（SVG標準path要素）
│   │   ├── Image.ts         # 画像（SVG image要素）
│   │   ├── Text.ts          # テキスト
│   │   ├── Node.ts          # グラフノード（楕円＋ラベル）
│   │   ├── Edge.ts          # グラフエッジ（直線/曲線/自己ループ）
│   │   ├── Group.ts         # グループ（複数図形をまとめる）
│   │   └── ShapeFactory.ts  # 図形生成ファクトリ
│   ├── tools/               # ツール
│   │   ├── Tool.ts          # インターフェース
│   │   ├── SelectTool.ts    # 選択・移動・リサイズ・範囲選択
│   │   ├── LineTool.ts      # 直線描画
│   │   ├── EllipseTool.ts   # 楕円描画
│   │   ├── RectangleTool.ts # 長方形描画
│   │   ├── PolygonTool.ts   # 多角形描画
│   │   ├── PolylineTool.ts  # ポリライン描画
│   │   ├── PathTool.ts      # パス描画
│   │   ├── TextTool.ts      # テキスト配置
│   │   ├── NodeTool.ts      # ノード配置
│   │   ├── EdgeTool.ts      # エッジ作成
│   │   ├── DeleteNodeTool.ts # ノード削除
│   │   ├── DeleteEdgeTool.ts # エッジ削除
│   │   └── RotateTool.ts     # 回転ツール
│   ├── handles/             # リサイズハンドル
│   │   ├── Handle.ts        # インターフェース
│   │   ├── LineHandles.ts   # 直線用（2点）
│   │   ├── EllipseHandles.ts # 楕円用（4隅）
│   │   ├── RectangleHandles.ts # 長方形用（4隅）
│   │   ├── TextHandles.ts   # テキスト用（中心点）
│   │   ├── NodeHandles.ts   # ノード用（4隅）
│   │   ├── PolygonHandles.ts # 多角形/ポリライン用（各頂点）
│   │   ├── PathHandles.ts   # パス用（アンカー＋制御点）
│   │   ├── ImageHandles.ts  # 画像用（4隅）
│   │   └── GroupHandles.ts  # グループ用（4隅＋破線境界）
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
- `shapes:group` - グループ化リクエスト
- `shapes:ungroup` - グループ解除リクエスト
- `selection:changed` - 選択変更
- `history:changed` - Undo/Redo状態変更
- `canvas:zoomChanged` - ズーム/パン変更
- `canvas:zoomReset` - ズームリセットリクエスト
- `snap:changed` - グリッドスナップ状態変更
- `file:new` - 新規ファイル作成リクエスト
- `file:save` - ファイル保存リクエスト
- `file:saveAs` - 別名で保存リクエスト
- `file:open` - ファイル読み込みリクエスト
- `file:dirtyChanged` - 未保存状態変更
- `file:exportFitToContent` - Fit to Contentエクスポートリクエスト
- `canvas:fitToContent` - キャンバスをコンテンツにフィットリクエスト
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
- `P` - 多角形ツール
- `Y` - ポリラインツール
- `B` - パスツール
- `T` - テキストツール
- `N` - ノードツール
- `W` - エッジツール
- `H` - パンツール
- `Z` - ズームツール
- `O` - 回転ツール
- `G` - グリッドスナップ切り替え
- `Delete` / `Backspace` - 選択図形を削除
- `Ctrl+Z` - 元に戻す（Undo）
- `Ctrl+Y` / `Ctrl+Shift+Z` - やり直し（Redo）
- `Ctrl+C` - コピー
- `Ctrl+V` - ペースト
- `Ctrl+N` - 新規作成
- `Ctrl+S` - ファイル保存
- `Ctrl+Shift+S` - 別名で保存
- `Ctrl+O` - ファイルを開く
- `Ctrl+]` - 1つ前面へ
- `Ctrl+[` - 1つ背面へ
- `Ctrl+Shift+]` - 最前面へ
- `Ctrl+Shift+[` - 最背面へ
- `Ctrl+G` - グループ化
- `Ctrl+Shift+G` - グループ解除
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

## Fit to Content 機能

キャンバスサイズを全オブジェクトにフィットさせる機能。

### メニュー

- **File > Export Fit to Content...**: 全オブジェクトを含む最小サイズでSVGをエクスポート
  - 元のキャンバスは変更せず、エクスポートのみ
  - ファイル名に `-fitted` が自動で付与

- **View > Fit Canvas to Content**: キャンバスサイズを全オブジェクトにフィット
  - 図形を原点(0,0)付近に移動
  - キャンバスサイズを最小化
  - Undo/Redo対応

### 設定

- **Fit to Content 余白**: 図形周囲の余白サイズ（デフォルト: 20px）
- Edit > Settings... で変更可能（0〜100px）

## SVG transform 対応

SVGファイル読み込み時に `transform` 属性を解析し、図形の座標に反映します。

### 対応する変換

| 変換 | 説明 | 例 |
|------|------|-----|
| `translate(x, y)` | 平行移動 | `translate(100, 50)` |
| `scale(sx, sy)` | 拡大縮小 | `scale(2)`, `scale(1.5, 2)` |
| `rotate(angle)` | 回転 | `rotate(45)`, `rotate(90, 50, 50)` |
| `skewX(angle)` | X軸方向の傾斜 | `skewX(30)` |
| `skewY(angle)` | Y軸方向の傾斜 | `skewY(15)` |
| `matrix(a,b,c,d,e,f)` | 行列変換 | `matrix(1, 0, 0, 1, 100, 50)` |

※ `matrix()` は translate、scale、rotation、skew に分解して適用

### skew 変換の制限

`skewX`/`skewY` は以下の図形タイプにのみ適用されます:
- Line、Polygon、Polyline、Path、Group

Rectangle、Ellipse、Text、Node、Image などの軸平行図形には skew を適用できません（警告ログを出力して無視）。

### ネストしたtransform

グループ内グループなど、ネストしたtransformは自動的に合成されます:

```xml
<g transform="translate(100, 0)">
  <g transform="scale(2)">
    <rect x="0" y="0" width="50" height="50"/>
  </g>
</g>
```

上記の場合、矩形は `translate(100, 0)` と `scale(2)` が合成され、位置 (100, 0) に 100x100 の矩形として読み込まれます。

### 書き出し時の動作

書き出し時は `transform` 属性を使用せず、変換後の絶対座標で出力します（現状維持）。

## パス機能

標準 SVG path 要素（`d` 属性）を使用したパスを描画・編集可能。
外部 SVG ファイル（PowerPoint等）のパス要素もインポート可能。

### 対応コマンド

| コマンド | 説明 | 対応 |
|---------|------|------|
| M, m | Move to（移動） | ✓ |
| L, l | Line to（直線） | ✓ |
| C, c | Cubic Bezier（3次ベジェ） | ✓ |
| Q, q | Quadratic Bezier（2次ベジェ） | ✓ |
| Z, z | Close path（閉じる） | ✓ |
| H, h, V, v | 水平/垂直線 | L に変換 |
| S, s | 滑らかな3次ベジェ | C に変換 |
| T, t | 滑らかな2次ベジェ | Q に変換 |
| A, a | 円弧（楕円弧） | ✓ |

※ 相対コマンド（小文字）は読み込み時に絶対座標に変換

### 描画方法

- `B`キー または ツールバーパスボタンでパスツールに切り替え
- **直線パス**: クリックでアンカーポイントを順次配置（L コマンド）
- **ベジェ曲線**: `Shift`+クリックで3次ベジェ曲線セグメントを追加（C コマンド）
- 開始点付近をクリックで閉じたパスとして完成（Z コマンド）
- ダブルクリックまたは `Enter` キーで開いたパスとして完成
- `Escape`キーでキャンセル

### 制御点の編集

- パスを選択すると、アンカーポイント（四角ハンドル）と制御点（丸ハンドル）が表示される
- 制御点をドラッグして曲線の形状を調整
- 各制御点は独立して移動可能（角を作れる）
- 制御点とアンカーの間には破線の制御線を表示

### ハンドル

| ハンドル | 形状 | 説明 |
|---------|------|------|
| アンカーポイント | 四角(8x8) | 曲線の頂点（M, L, C, Q の終点）、白地＋青枠 |
| 制御点 | 丸(r=4) | 曲線の形状を制御（C, Q の制御点）、白地＋グレー枠 |
| 制御線 | 破線 | 制御点とアンカーを結ぶ線、グレー |

### SVG保存形式

```xml
<path id="path-123" data-shape-type="path"
      d="M 100 100 L 150 100 C 183 100 216 150 250 150 Z"
      fill="none" stroke="#000000" stroke-width="2"/>
```

### 外部SVGのインポート

他のツール（PowerPoint、Illustrator等）で作成した SVG ファイルのパス要素を読み込み可能:

```xml
<!-- PowerPoint などからエクスポートしたパス -->
<path d="M 0 0 L 100 0 L 100 100 L 0 100 Z" fill="#ff0000"/>
```

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

## グループ機能

複数の図形をグループ化して、1つの単位として扱う機能。

### グループ化

- 2つ以上の図形を選択
- `Ctrl+G` でグループ化
- グループは1つの図形として扱われる

### グループ解除

- グループを選択
- `Ctrl+Shift+G` でグループ解除
- 元の図形が個別に選択された状態になる

### グループの操作

- **移動**: グループをドラッグで移動（全子要素が連動）
- **リサイズ**: 4隅のハンドルでスケーリング（全子要素が比例変形）
- **位置のみリサイズ**: `Alt`+ドラッグで位置関係のみスケール（子要素のサイズは維持）
- **選択時表示**: 破線の境界ボックスでグループ範囲を表示

### ネストしたグループ

- グループ内にグループを含めることが可能
- 再帰的に移動・リサイズが適用される

### SVG保存形式

```xml
<g id="group-123" data-group-type="group">
  <rect id="shape-1" x="10" y="10" width="50" height="30" .../>
  <ellipse id="shape-2" cx="100" cy="50" rx="20" ry="20" .../>
  <!-- ネストしたグループ -->
  <g id="group-456" data-group-type="group">
    <line id="shape-3" x1="0" y1="0" x2="50" y2="50" .../>
  </g>
</g>
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
