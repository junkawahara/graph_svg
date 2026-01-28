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
│   │   ├── TextInputDialog.ts # テキスト入力ダイアログ
│   │   ├── GraphImportDialog.ts # グラフインポートダイアログ
│   │   └── GraphExportDialog.ts # グラフエクスポートダイアログ
│   ├── core/                # コアロジック
│   │   ├── EventBus.ts      # イベント通信
│   │   ├── EditorState.ts   # 状態管理
│   │   ├── SelectionManager.ts  # 選択管理
│   │   ├── HistoryManager.ts    # Undo/Redo履歴管理
│   │   ├── FileManager.ts       # SVGシリアライズ/パース（グループ形式対応）
│   │   ├── ClipboardManager.ts  # コピー/ペースト管理
│   │   ├── ArrowGeometry.ts     # 矢印の幾何学計算・自前描画
│   │   ├── GraphManager.ts      # グラフ（ノード-エッジ）関係管理
│   │   ├── GraphFileParser.ts   # グラフファイル（DIMACS/EdgeList）パーサー
│   │   ├── GraphFileExporter.ts # グラフファイル（DIMACS/EdgeList）エクスポーター
│   │   ├── LayoutManager.ts     # グラフ自動レイアウト
│   │   ├── StyleClassManager.ts # スタイルクラス管理
│   │   ├── BoundsCalculator.ts  # バウンディングボックス計算
│   │   ├── TransformParser.ts   # SVG transform 属性解析
│   │   ├── PathParser.ts        # SVG path d属性パーサー
│   │   └── MathUtils.ts         # 数学ユーティリティ（round3等）
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
│   │   ├── Line.ts          # 直線（マーカー付きはグループで描画）
│   │   ├── Ellipse.ts       # 楕円
│   │   ├── Rectangle.ts     # 長方形
│   │   ├── Polygon.ts       # 多角形
│   │   ├── Polyline.ts      # ポリライン（折れ線）
│   │   ├── Path.ts          # パス（マーカー付きはグループで描画）
│   │   ├── Image.ts         # 画像（SVG image要素）
│   │   ├── Text.ts          # テキスト
│   │   ├── Node.ts          # グラフノード（楕円＋ラベル）
│   │   ├── Edge.ts          # グラフエッジ（自前矢印描画）
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

## 数値精度

座標やサイズなど、小数になりうるすべての数値は **小数第3位まで** に丸める。

### 内部値

- 丸め方式: **四捨五入**（`Math.round(value * 1000) / 1000`）
- 適用タイミング: 図形の作成、移動、リサイズ、変換など、座標値が変更されるすべての操作時
- 対象プロパティ: x, y, cx, cy, rx, ry, width, height, x1, y1, x2, y2, パスの座標など

### プロパティパネル

- 表示: 小数第3位まで表示
- 入力: `step="any"` を使用し、任意の小数を入力可能
- スピンボタン: 1ずつ増減

### 理由

- 浮動小数点演算による微小な誤差の蓄積を防止
- SVGファイルサイズの削減
- デバッグ・可読性の向上
- 視覚的に区別不可能な精度（0.001px）で十分

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
- `5` - 多角形ツール
- `Y` - ポリラインツール
- `P` - パスツール
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

## リサイズ操作

- コーナーハンドルをドラッグ - 自由リサイズ
- `Ctrl`+ドラッグ - 縦横比を固定してリサイズ
- `Alt`+ドラッグ（グループのみ） - 位置関係のみスケール（子要素サイズは維持）

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

## マーカープロパティ（矢印）

直線またはパス図形選択時のみ表示:
- Arrow Start（始点マーカー）
- Arrow End（終点マーカー）

マーカー形状（4種類）:
- Arrow（開いた矢印 >）- 2本の線で描画
- Triangle（塗りつぶし三角 ▶）
- Circle（塗りつぶし丸 ●）- ベジェ曲線で描画
- Diamond（塗りつぶしひし形 ◆）

マーカーサイズ（3サイズ）:
- Small
- Medium
- Large

※ 合計12種類 + None = 13オプション
※ マーカーの色は線の色（Stroke）に連動

### 矢印の描画実装

SVG `<marker>` 要素は描画が不安定なため、自前で描画したパス要素で矢印を描画する。

**描画方法:**
- `ArrowGeometry.ts` が矢印の形状・位置・回転を計算
- Triangle/Circle/Diamond は線を短くして矢印を描画（矢印が線の端点を置き換える）
- Arrow（>）は線を短くせず、端点から2本の線を描画

**SVG保存形式:**

マーカー付きの線は `<g>` グループとして保存され、再読み込み時に1つのオブジェクトとして認識される。

```xml
<!-- マーカー付きLine -->
<g id="shape-123" data-shape-type="line-with-markers"
   data-marker-start="none" data-marker-end="triangle-large">
  <line data-role="main" x1="100" y1="100" x2="280" y2="180" stroke="#000" stroke-width="2"/>
  <path data-role="marker-end" d="M..." fill="#000"/>
</g>

<!-- マーカー付きPath -->
<g id="shape-456" data-shape-type="path-with-markers"
   data-marker-start="arrow-medium" data-marker-end="none">
  <path data-role="main" d="M 100 100 L 200 150 C..." fill="none" stroke="#000"/>
  <path data-role="marker-start" d="M..." fill="none" stroke="#000"/>
</g>
```

**後方互換性:**
- 旧形式（`marker-start="url(#...)"` 属性）のファイルも読み込み可能
- 保存時は常に新形式（グループ形式）で出力

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

- `P`キー または ツールバーパスボタンでパスツールに切り替え
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

### ポイントの追加・削除

パスに中間点を追加したり、既存のポイントを削除できる。
Edge（lineType='path'）にも対応。

**ポイント追加ツール（+ボタン）:**
- パスのセグメント上をクリック: 直線ポイント（L）を挿入
- `Shift`+クリック: ベジェポイント（C）を挿入（滑らかな制御点付き）
- ホバー時に挿入位置を青丸で表示

**ポイント削除ツール（-ボタン）:**
- アンカーポイントをクリック: そのポイントを削除
- ホバー時に削除対象を赤丸で表示
- 開始点（M）は削除不可
- 最低2点は維持される

**右クリックメニュー:**
- パスまたはEdge（lineType='path'）を右クリックで「ポイントを追加」「ベジェポイントを追加」「このポイントを削除」が選択可能

### エッジ端点の位置調整（Edge lineType='path'）

Edge（lineType='path'）の始点・終点ハンドルをドラッグして、ノードへの接続位置を調整可能。

- 始点ハンドル（最初のアンカー）: ソースノードの境界上でスライド可能
- 終点ハンドル（最後のアンカー）: ターゲットノードの境界上でスライド可能
- 接続角度として保存され、ノード移動時も維持される
- Undo/Redo 対応

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
- Edge Label（ラベル文字列）

### SVG保存形式

```xml
<!-- ノード -->
<g id="node-123" data-graph-type="node" data-label="A">
  <ellipse cx="100" cy="100" rx="30" ry="30" fill="..." stroke="..."/>
  <text x="100" y="100" text-anchor="middle">A</text>
</g>

<!-- エッジ（ラベルなし） -->
<g id="edge-456" data-graph-type="edge"
   data-source-id="node-123" data-target-id="node-789"
   data-direction="forward" data-curve-offset="0">
  <path d="M 130 100 L 270 100" fill="none" stroke="..."/>
</g>

<!-- エッジ（ラベルあり） -->
<g id="edge-789" data-graph-type="edge"
   data-source-id="node-123" data-target-id="node-456"
   data-direction="none" data-curve-offset="0" data-label="weight">
  <path d="M 130 100 L 270 100" fill="none" stroke="..."/>
  <rect fill="white" stroke="none" rx="2" ry="2" .../>
  <text x="200" y="100" text-anchor="middle" ...>weight</text>
</g>
```

### グラフファイルインポート

テキストファイルからグラフを読み込む機能。

#### 使い方

1. 「ファイル」メニュー > 「グラフファイルをインポート...」を選択
2. グラフファイル（.txt, .dimacs, .col, .edgelist）を選択
3. ダイアログでオプションを選択:
   - グラフの種類: 無向グラフ / 有向グラフ
   - インポート方法: 既存のグラフに追加 / 新規グラフ（キャンバスをクリア）
4. 「インポート」をクリック

#### 対応フォーマット

**Edge List形式**

1行が1つの辺に対応。スペース区切りで頂点名を記述。

```
abc def
def ghij3
ghij3 45
```

3列目はエッジラベル（オプション）:
```
abc def 3
def ghij3 cd
```

**DIMACS形式（変種）**

```
p 4 3
c This is a comment line.
e abc def
e def ghij3
e ghij3 45
```

- `p n m`: 頂点数n、辺数m
- `c ...`: コメント行（無視）
- `e src dst`: 辺の定義

※ 孤立頂点（辺に現れない頂点）は連番ラベル（1, 2, 3...）で生成

#### レイアウト

インポート時は円形レイアウトで配置される。必要に応じて「配置」>「自動レイアウト」で再配置可能。

### グラフファイルエクスポート

グラフをテキストファイルにエクスポートする機能。

#### 使い方

1. 「Graph」メニュー > 「グラフをエクスポート...」を選択
2. エクスポートダイアログでオプションを選択:
   - 出力形式: Edge List形式 / DIMACS形式
   - エクスポート対象: 全て / 選択のみ
3. 「エクスポート」をクリック
4. ファイル保存ダイアログでファイル名を指定

#### 出力形式

**Edge List形式**

```
source target [label]
A B
B C weight
C A 10
```

- 1行1エッジ、スペース区切り
- エッジラベルがあれば3列目に出力
- 孤立ノード（エッジに接続されていないノード）は出力しない

**DIMACS形式**

```
p 3 3
c 1: A
c 2: B
c 3: C
e 1 2
e 2 3
e 3 1
```

- `p n m`: ヘッダー（n: ノード数、m: エッジ数）
- `c N: label`: コメント行でノード番号とラベルの対応を出力
- `e src dst`: エッジ（ノード番号で指定）
- ノードは作成順に1から番号付け
- 孤立ノードも頂点数に含める
- エッジラベルは出力しない

#### エクスポート対象

- **全て**: キャンバス上の全ノード・エッジをエクスポート
- **選択のみ**: 選択中のノード・エッジのみエクスポート
  - 選択がない場合は無効
  - 選択されたエッジの端点ノードは自動的に含める

#### ラベル警告

ノードラベルやエッジラベルにスペース・特殊文字が含まれる場合、警告ダイアログを表示:
- 問題のあるラベルを先頭5件まで列挙
- 5件を超える場合は「...他N件」と表示
- ユーザーが続行を選択可能（ラベルはそのまま出力）

#### その他の仕様

- エッジの方向は無視（すべて無向グラフとして出力）
- ファイルはUTF-8、LF改行で出力
- デフォルト拡張子: `.txt`
- デフォルトファイル名: SVGファイル名ベース（新規は `untitled.txt`）

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

## リッチテキスト機能

テキスト図形内で、部分的に異なるスタイルを適用できる機能。

### Phase 1（実装済み）

サイドバーの Range Style セクションで、選択範囲にスタイルを適用:

- **太字** (`font-weight: bold`)
- **イタリック** (`font-style: italic`)
- **下線** (`text-decoration: underline`)
- **取消線** (`text-decoration: line-through`)
- **文字色** (`fill`)

### Phase 2（実装済み）

- **上付き文字** (`baseline-shift: super` + `font-size: 70%`)
- **下付き文字** (`baseline-shift: sub` + `font-size: 70%`)

### SVG 出力形式

リッチテキストはネストした `<tspan>` で出力:

```xml
<text x="100" y="100" font-size="24" ...>
  <tspan x="100" dy="0">
    <tspan>H</tspan>
    <tspan baseline-shift="sub" font-size="70%">2</tspan>
    <tspan>O</tspan>
  </tspan>
</text>
```

### 関連ファイル

- `src/shared/types.ts` - `TextRunStyle`, `TextRun` 型定義
- `src/renderer/core/TextRunUtils.ts` - Run 操作ユーティリティ
- `src/renderer/commands/RichTextChangeCommand.ts` - Undo/Redo 対応コマンド

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
