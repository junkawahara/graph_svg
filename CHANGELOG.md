# Changelog

このプロジェクトの変更履歴を記録します。

## [Unreleased]

### 追加
- ラベル配置機能（TikZ スタイル）
  - ノードのラベル配置オプション
    - 位置: `center`（デフォルト）、`above`、`below`、`left`、`right`、斜め4方向、カスタム角度（0-360°）
    - 距離: ノード境界からの距離（px）
  - エッジのラベル配置オプション
    - 長さ方向: `auto`（midway）、`midway`（0.5）、`near start`（0.25）、`near end`（0.75）、カスタム（0-1）
    - 側面: `above`（デフォルト）、`below`
    - 傾き: `sloped`（エッジの傾きに合わせて回転）
    - 距離: エッジからの距離（px）
  - サイドバーに Label Position セクションを追加
  - SVG 保存時に `data-label-position`、`data-label-distance` 等の属性を出力
  - Undo/Redo 対応: `NodeLabelPlacementCommand`、`EdgeLabelPlacementCommand`
- リッチテキスト機能（1行内の部分的スタイル変更）
  - テキスト図形内で部分的に異なるスタイルを適用可能
    - 太字、イタリック、下線、取消線
    - 文字色（親のfillを上書き）
    - **上付き文字**（X²ボタン）: `baseline-shift: super` + フォントサイズ70%
    - **下付き文字**（X₂ボタン）: `baseline-shift: sub` + フォントサイズ70%
  - サイドバーに Range Style セクションを追加
    - Content の textarea でテキストを選択すると範囲が自動入力
    - 範囲スタイルボタン: B（太字）、I（イタリック）、U（下線）、S（取消線）、X²（上付き）、X₂（下付き）
    - 色ピッカーで範囲の文字色を変更
    - Clear Formatting ボタンで全てのリッチテキストスタイルをクリア
  - 新規型定義: `TextRunStyle`, `TextRun`, `BaselineShift`
  - `TextData` に `runs` フィールドを追加（行の配列、各行はRunの配列）
  - SVG 出力形式: ネストした `<tspan>` でスタイルを保持
  - Undo/Redo 対応: `RichTextChangeCommand`, `ClearRichTextCommand`
- Electron と Web ブラウザの両方で動作するハイブリッドアプリ化
  - Platform Adapter パターンによるプラットフォーム抽象化
    - `PlatformAdapter` インターフェース（ファイル操作、設定、メニューイベント）
    - `ElectronAdapter`: Electron 環境用実装
    - `WebAdapter`: Web ブラウザ環境用実装
  - Web 専用機能
    - Web メニューバー（File, Edit, View, Tools, Arrange）
    - ドラッグ&ドロップによるファイル読み込み（SVG, グラフファイル）
    - File System Access API 対応（Chrome/Edge で完全対応）
    - フォールバック: `<input type="file">` + ダウンロードリンク（Firefox, Safari）
    - localStorage による設定保存
    - beforeunload による未保存警告
  - Web ビルド設定
    - `npm run build:web` - Web 用ビルド
    - `npm run start:web` - Web 版起動（serve）
    - `npm run dev:web` - Web 用ウォッチモード
    - 出力先: `dist-web/`

### 修正
- Node.ts: ノード内テキストを getBBox() を使って正確に上下中央に配置
  - `dominant-baseline="middle"` だけでは正確に中央にならないフォントに対応
  - render() と updateElement() で位置を自動調整
- Text.ts: SVGファイル読み込み時にインラインtspanを持つテキストが改行で分割される問題を修正
  - `<text><tspan>L</tspan><tspan>=</tspan><tspan>0</tspan></text>` のような形式を正しく1行として読み込む
  - dy属性の有無で複数行テキストとインラインリッチテキストを区別
- PathParser.ts: `vectorAngle()` が退化した弧（長さゼロのベクトル）で NaN を返す問題を修正
  - `len < 1e-10` の場合は 0 を返すように修正
- Path.ts: `samplePath()` が Z コマンドを処理しない問題を修正
  - Z コマンドでサブパス開始点への閉路セグメントを追加
  - 複数サブパスを別々に追跡する `samplePathSubpaths()` メソッドを追加
- Path.ts: `isPointInsidePath()` が複数サブパスを正しく処理しない問題を修正
  - 各サブパスを個別の閉多角形として扱い、even-odd フィルルールで判定
  - パスに穴がある場合も正しくヒットテストが動作するように改善
- Edge.ts の複数の問題を修正
  - `getPathTypeData()`: Arc (`A`) コマンドが出力されない問題を修正
  - `hitTestPath()`: Arc (`A`) と Close (`Z`) コマンドのヒットテストを追加
  - `getCommandStart()`: `Z` コマンド後にサブパス開始点を正しく返すように修正
  - `getBounds()`: 曲線エッジ、自己ループ、パス型エッジのバウンディングボックスを正確に計算するように改善
- Z-order（描画順）がUndo時に復元されない問題を修正
  - DeleteShapeCommand: 削除した図形をUndoで復元する際、元の描画順を維持
  - DeleteNodeCommand: ノードと接続エッジの削除をUndoする際、元の描画順を維持
  - EditSvgCommand: SVG編集時に図形の描画順が最前面に移動する問題を修正
  - UngroupShapesCommand: グループ解除時に子要素が最前面に移動する問題を修正
- AddPathPointCommand: 複数サブパスを持つパスでZセグメントを分割する際、最初のMコマンドではなく直近のMコマンド（サブパス開始点）を参照するように修正
- Edge復元時の情報欠落を修正（ShapeFactory.ts）
  - コピー/ペースト時に `label`, `lineType`, `curveAmount`, `pathCommands`, `sourceConnectionAngle`, `targetConnectionAngle` が失われる問題を修正
- Line.ts の `applySkew()` で計算順序の誤りを修正
  - 元の座標を保存してからスキュー変換を適用するように修正
- Polygon.ts の `hitTest()` で塗りなし時に内部点がヒットする問題を修正
  - `fillNone` または `fill='none'` の場合は辺上のみをヒット対象に
- Path.ts の `getCommandStart()` が Arc コマンドを考慮していない問題を修正
  - `A` コマンドの終点座標を正しく取得するように修正
- Path.ts の `hitTest()` で Z 閉路判定が常に最初の M に戻る問題を修正
  - 複数サブパスを含む場合、直前の M コマンドに戻るように修正
- 各図形の座標丸め方式を `round3()` に統一
  - `Math.round()` を使用していた箇所を小数第3位丸めの `round3()` に変更
  - 対象: Path, Rectangle, Ellipse, Line, Polygon, Polyline, Node, TextTool
- SelectTool でキャンバス外にマウスが離脱した時の Undo 履歴問題を修正
  - ドラッグ中/リサイズ中にキャンバス外に出た場合、操作を確定して履歴に記録
- RotateTool でキャンバス外にマウスが離脱した時の Undo 履歴問題を修正
  - 回転中にキャンバス外に出た場合、操作を確定して履歴に記録
- EdgeTool の到達不能コード（クリックモード）を削除
  - ドラッグ操作のみをサポートする仕様に整理
- ZoomTool のコメントと実装の不一致を修正

### 追加
- パスのポイント追加・削除機能
  - ポイント追加ツール（+ボタン）
    - パスのセグメント上をクリックで直線ポイント（L）を挿入
    - Shift+クリックでベジェポイント（C）を挿入（滑らかな制御点付き）
    - ホバー時に挿入位置を青丸で表示
    - De Casteljau アルゴリズムによるベジェ曲線分割
  - ポイント削除ツール（-ボタン）
    - アンカーポイントをクリックで削除
    - ホバー時に削除対象を赤丸で表示
    - 開始点（M）は削除不可、最低2点は維持
  - 右クリックメニューからも操作可能
    - 「ポイントを追加」「ベジェポイントを追加」「このポイントを削除」
  - Undo/Redo 対応
  - **Edge（lineType='path'）にも対応**
    - エッジのLineTypeがPathのとき、同様に中間点の追加・削除が可能
    - ツールおよび右クリックメニューから操作可能
  - 新規ファイル:
    - `PathGeometry.ts` - セグメント検出とベジェ分割アルゴリズム
    - `AddPathPointTool.ts` / `DeletePathPointTool.ts` - ツール実装
    - `AddPathPointCommand.ts` / `DeletePathPointCommand.ts` - コマンド実装

- リサイズ時のアスペクト比固定機能
  - Ctrl キーを押しながらリサイズハンドルをドラッグすると、縦横比を維持したままリサイズ
  - 対応図形: 長方形、楕円、画像、ノード、グループ
  - 元の縦横比を基準に、より大きく変化した方向に合わせてもう一方を調整

- エッジ線種カスタマイズ機能
  - 3種類の線種を選択可能
    - `straight`: 2頂点間を直線で結ぶ（デフォルト）
    - `curve`: 2頂点間をカーブで描く（曲率調整可能）
    - `path`: SVGパスで描く（制御点編集可能）
  - カーブ量スライダー（-100〜100）で曲率を調整
  - 自己ループは `straight` 不可（自動的に `curve` または `path` のみ）
  - 並行辺は自動的に `curve` タイプで作成
  - Undo/Redo対応（`EdgeLineTypeChangeCommand`, `EdgeCurveAmountChangeCommand`）
  - SVGファイル保存/読み込み対応（`data-line-type`, `data-curve-amount` 属性）
  - `path` タイプの制御点編集（EdgeHandles）
    - アンカーポイント（四角ハンドル）とベジェ制御点（丸ハンドル）
    - 始点はソースノード境界上、終点はターゲットノード境界上に制約
    - 中間の制御点は自由に移動可能
    - 制御線（破線）でアンカーと制御点を接続表示
  - ノード移動時の `path` タイプエッジ端点自動再接続
    - ノード移動時に端点のみノード境界に再接続
    - 中間の制御点は固定位置を維持
  - **エッジ端点のドラッグ位置調整機能**
    - lineType='path' のエッジで、始点・終点をドラッグしてノード境界上の接続位置を変更可能
    - ドラッグした位置は接続角度として保存され、ノード移動時も維持される
    - SVGファイルに `data-source-connection-angle`, `data-target-connection-angle` 属性として保存
    - Undo/Redo 対応

- エッジ線種カスタマイズ機能のテスト（85テスト）
  - EdgeLineTypeChangeCommand テスト（14テスト）
    - 各線種間の切り替え動作
    - 自己ループでの straight 制限
    - Undo/Redo 動作
  - EdgeCurveAmountChangeCommand テスト（16テスト）
    - カーブ量の変更
    - 正/負の値の取り扱い
    - Undo/Redo 動作
  - Edge lineType 機能テスト（27テスト）
    - straight/curve/path 各タイプのレンダリング
    - pathCommands からのパス生成
    - ノード移動時の端点再接続
    - serialize/clone の正確性
  - EdgeHandles テスト（28テスト）
    - アンカー/制御点ハンドルの生成
    - ドラッグ制約（端点はノード境界上）
    - 制御線の描画

### 変更
- 矢印描画をSVG `<marker>` から自前描画パスに変更
  - SVG `<marker>` 要素の描画が不安定なため、自前でパス要素を描画
  - `ArrowGeometry.ts` で矢印の幾何学計算を実装
  - `MarkerManager.ts` を削除
  - マーカー付きLine/Pathは `<g>` グループとして保存
  - 再読み込み時に1つのオブジェクトとして認識
  - Arrow（>）は元の線+2本の線で描画
  - Triangle/Circle/Diamond は線を短くして矢印を描画
  - Circle はベジェ曲線で描画（Arc コマンドの代わり）
  - 旧形式（marker-start/marker-end属性）のファイルも後方互換で読み込み可能

### 追加
- SVGラウンドトリップテスト
  - Vitest + jsdom を使用したテストフレームワーク
  - 全12種類の図形タイプのラウンドトリップテスト
  - スタイル属性の完全な保持を検証
  - グラフテストの強化（ノード/エッジスタイル、複雑なグラフ構造、自己ループ、エッジケース）

- Undo/Redo機能の包括的なテスト
  - HistoryManager単体テスト（27テスト）
    - execute/undo/redo/canUndo/canRedo/clear機能
    - 履歴制限（100件）
    - history:changedイベント発火
  - コマンド単体テスト
    - AddShapeCommand（12テスト）
    - DeleteShapeCommand（10テスト）
    - MoveShapeCommand（13テスト）
    - ResizeShapeCommand（17テスト）
    - StyleChangeCommand（16テスト）
    - GroupShapesCommand（13テスト）
  - グラフコマンドテスト
    - AddNodeCommand（9テスト）
    - AddEdgeCommand（9テスト）
    - DeleteNodeCommand（14テスト）- 接続エッジの同時削除/復元を検証
  - 統合テスト（13テスト）
    - 複数コマンドの連続実行
    - undo/redoインターリーブ
    - redoスタッククリア
    - 履歴制限（100件超過時の動作）

### 修正
- strokeWidth=0 の場合、stroke="none" を出力するように修正
  - これにより、ストローク幅0がラウンドトリップで正しく保持される

- 矢印マーカー機能の拡張
  - 4種類の形状: Arrow（開いた矢印 >）、Triangle（塗りつぶし三角 ▶）、Circle（塗りつぶし丸 ●）、Diamond（塗りつぶしひし形 ◆）
  - 3サイズ: Small、Medium、Large
  - 合計12種類 + None = 13オプション
  - 直線（Line）とパス（Path）の両方でマーカーを使用可能
  - SVG保存/読み込み時にマーカーを保持
  - プロパティパネルでマーカー選択（始点/終点）
  - マーカー色は線の色（stroke）に連動
  - Undo/Redo対応

- グラフファイルインポート機能
  - Edge List形式とDIMACS形式のテキストファイルからグラフを読み込み可能
  - 「ファイル」メニュー > 「グラフファイルをインポート...」から使用
  - 無向グラフ/有向グラフの選択可能
  - 既存グラフに追加/新規グラフ作成の選択可能
  - 辺ラベル表示対応（Edge List形式の3列目）
  - DIMACS形式の孤立頂点対応（連番ラベルで生成）
  - 円形レイアウトで初期配置
  - Undo/Redo対応（単一操作で全体を元に戻せる）

- エッジラベル機能
  - エッジに任意のラベルテキストを表示可能
  - ラベルは辺の中点に白背景で表示
  - SVG保存/読み込み時にラベルを保持
  - プロパティパネルでエッジ選択時にラベル編集可能（Undo/Redo対応）

- 図形の整列・均等配置機能
  - 複数選択した図形を整列（左揃え、右揃え、上揃え、下揃え、水平方向中央揃え、垂直方向中央揃え）
  - 複数選択した図形を均等配置（水平方向、垂直方向）
  - 「配置」メニューから「整列」「均等配置」サブメニューで使用可能
  - キーボードショートカット: Ctrl+Shift+方向キー（左/右/上/下揃え）
  - 右クリックコンテキストメニューからも使用可能
  - Undo/Redo対応

- ズームツール
  - ツールバーに虫眼鏡ボタンを追加
  - クリックでズームイン（カーソル位置中心）
  - Shift+クリックでズームアウト
  - ドラッグで矩形選択し、その領域にズームイン
  - キーボードショートカット: Z
  - メニュー「ツール」>「ズーム」からも選択可能

- グラフ自動レイアウトの改善
  - レイアウト結果がキャンバス全体を使用するように修正
  - 余白（padding）を設定ダイアログで設定可能に（デフォルト: 50px）
  - 論理的なキャンバスサイズを使用するように修正（画面サイズではなく）

- グループの「位置のみスケール」モード
  - Altキーを押しながらグループをリサイズすると、子オブジェクトのサイズを変更せずに位置関係のみをスケール
  - ノードやグラフの配置を広げたい/縮めたい場合に便利

- スタイルクラス機能（SVG class属性対応）
  - CSSクラスベースのスタイル管理機能
  - 組み込みクラス: thick-line, dashed, dotted, no-stroke, semi-transparent
  - カスタムクラスの作成・保存（アプリ設定に永続化）
  - サイドバーにクラスセレクタを追加
  - クラス適用時、スタイルプロパティを一括変更
  - CSSカスケード: クラスが基本スタイル、インライン属性で上書き可能
  - SVG出力時に`<style>`ブロックでクラス定義を出力
  - クラスとの差分のみインライン属性として出力（ファイルサイズ最適化）
  - SVG読み込み時、`<style>`ブロックのクラス定義を解析・適用
  - Undo/Redo対応（ApplyClassCommand）

### 修正
- Undo/Redo後のハンドル更新問題を修正
  - 図形のリサイズ、移動、整列、回転などの操作後にUndoを実行した際、選択ハンドルの位置が正しく更新されるように修正
  - 回転ツール使用中のUndo/Redo後も回転ハンドルが正しい位置に表示されるように修正

### 変更
- テキストのデフォルトスタイル変更
  - 新規作成するテキストは fill: 黒（#000000）、strokeWidth: 0 がデフォルト
  - strokeWidth: 0 の図形は stroke 関連属性を出力/適用しない（stroke, stroke-width, stroke-dasharray, stroke-linecap）
  - SVG 読み込み時、stroke-width 属性を持たない text 要素は strokeWidth: 0 として読み込む

- SVG読み込み時のスタイル解釈をSVG仕様に準拠
  - fill 属性が未指定の場合、黒（#000000）をデフォルトに（SVG仕様準拠）
  - stroke 属性が未指定または "none" の場合、strokeWidth: 0 として読み込む
  - dominant-baseline 属性を保存・復元するよう対応（デフォルト: auto）
  - matrix() transform の水平反転を正しく解釈（scaleX=-1 を rotation=180° と誤解釈していた問題を修正）

### 追加
- 図形の回転機能
  - 専用の回転ツール（Oキーまたはツールバーボタン）
  - 図形の上部中央に回転ハンドルを表示
  - ドラッグで自由回転、Shift+ドラッグで45度単位スナップ
  - サイドバーで角度を数値入力可能（0〜360度）
  - SVG transform="rotate()" 属性で回転を保存
  - 回転を考慮した当たり判定とバウンディングボックス計算
  - Undo/Redo 対応
  - Edge（グラフエッジ）は回転対象外（接続ノードに追従）

- アプリケーションメニューの日本語化と機能追加
  - 全メニュー項目を日本語に変更
  - 「ツール」メニュー追加: 全描画ツールをメニューから選択可能
  - 「配置」メニュー追加: Z-Order 操作、自動レイアウト、有向エッジ切替
  - 「編集」メニュー: 削除、グループ化/解除を追加
  - 「表示」メニュー: グリッドスナップ切替を追加

- コンテキストメニュー（右クリック）機能
  - オブジェクト上で右クリックするとコンテキストメニューが開く
  - 「SVGタグを編集」: SVG 編集ダイアログを開く
  - 「グループ化」: 複数オブジェクト選択時に表示、選択オブジェクトをグループ化
  - 「グループ化の解除」: グループオブジェクト右クリック時に表示
  - 「最前面に移動」「最背面に移動」「1つ前面へ」「1つ背面へ」: Z-Order 操作

- SVG ソース直接編集機能
  - SVG タグ（outerHTML）を直接テキストエリアで編集可能
  - テキストエリアは右端で折り返し表示
  - 編集結果を OK ボタンで即座に反映
  - Undo/Redo 対応
  - 不正な SVG はエラーメッセージを表示

- 標準 SVG path 対応
  - 標準 SVG path 要素（`d` 属性）の読み込み・書き出し対応
  - 対応コマンド: M, L, C, Q, A, Z（相対コマンド m, l, c, q, a も絶対座標に変換）
  - H, V, S, T コマンドは対応コマンドに変換
  - A (Arc) コマンド完全対応
    - 楕円弧の正確な描画・当たり判定
    - SVG仕様に準拠した中心点パラメータ変換
    - 移動・スケール時の半径自動調整
  - PathParser ユーティリティを追加
  - PathTool で直線パスを描画（Bキー）
  - Shift+クリックで3次ベジェ曲線セグメントを追加
  - 選択時にアンカーポイント（四角）と制御点（丸）のハンドル表示
  - 外部 SVG ファイル（PowerPoint等）のパス要素をインポート可能
  - サイドバーで d 属性を直接編集可能（パス選択時に表示）

- SVG image 要素対応
  - `<image>` 要素の読み込み・書き出し対応
  - 埋め込み画像（Base64 data URI）対応
  - 外部URL画像リンク対応
  - SVG 2 の `href` 属性と SVG 1.1 の `xlink:href` 属性の両方に対応
  - `preserveAspectRatio` 属性の保持
  - 4隅リサイズハンドルで画像サイズ変更可能
  - 移動・コピー/ペースト対応
  - グループ内の画像もサポート

### 削除
- BezierPath 機能を廃止し、Path に統合
  - 旧形式（data-shape-type="bezierPath"）は読み込み不可

### 変更

- SVG transform 属性対応
  - SVGファイル読み込み時に全ての SVG transform を解析・適用
  - 対応変換: `translate`、`scale`、`rotate`、`skewX`、`skewY`、`matrix`
  - `rotate(angle)` および `rotate(angle, cx, cy)` 形式に対応
  - `matrix(a, b, c, d, e, f)` を translate、scale、rotation、skew に分解して適用
  - `skewX`/`skewY` は点ベースの図形（Line、Polygon、Polyline、Path、Group）に適用
  - Rectangle、Ellipse 等の軸平行図形は skew 未対応（警告ログ出力）
  - グループ内グループのネストしたtransform合成に対応
  - 変換後は絶対座標として保持（書き出し時はtransformを使用しない）
  - TransformParser ユーティリティを追加

- Fit to Content 機能
  - 「Export Fit to Content...」メニュー（File）: 全オブジェクトを含む最小サイズでSVGをエクスポート
  - 「Fit Canvas to Content」メニュー（View）: キャンバスサイズを全オブジェクトにフィット
  - 図形を原点(0,0)付近に移動して最小サイズを実現
  - 余白設定: デフォルト20px、設定画面で変更可能（0〜100px）
  - Fit Canvas to Content は Undo/Redo 対応

- ベジェパス（3次ベジェ曲線）描画機能
  - クリックでアンカーポイントを順次配置
  - 開始点付近クリックで閉じたパス、ダブルクリックで開いたパス
  - Escapeキーでキャンセル
  - 選択時にアンカーポイント（四角）と制御点（丸）のハンドル表示
  - 制御点は独立して移動可能（角を作れる）
  - 制御線（破線）でアンカーと制御点の関係を表示
  - ツールバーボタン追加（Bキー）
  - Undo/Redo対応
  - SVG path要素として保存/読み込み

- グループ化機能
  - 複数の図形を選択してグループ化（Ctrl+G）
  - グループの解除（Ctrl+Shift+G）
  - グループ単位での移動・リサイズ
  - ネストしたグループのサポート
  - Undo/Redo対応（GroupShapesCommand/UngroupShapesCommand）
  - SVGファイルへの保存/読み込み（`<g data-group-type="group">` 形式）
  - グループ選択時に破線の境界ボックスと4隅のリサイズハンドル表示

- テキスト機能拡張
  - テキスト配置（text-anchor）: 左揃え/中央揃え/右揃え
  - 斜体（font-style: italic）
  - 下線（text-decoration: underline）
  - 取り消し線（text-decoration: line-through）
  - 複数行テキスト（改行対応、tspan要素でSVG出力）
  - 行の高さ調整（Line Height: 1.0/1.2/1.5/2.0）
  - サイドバーにスタイルボタン追加（B I U S）
  - Content入力をtextareaに変更（複数行入力対応）
  - Undo/Redo対応
  - ファイル保存/読み込み対応（後方互換性あり）

- キャンバスサイズ設定機能
  - キャンバスサイズ（幅×高さ）を指定可能
  - キャンバス範囲外はグレー色で表示
  - 範囲外にもオブジェクトを配置可能
  - 右下隅をドラッグしてリサイズ（青い円ハンドル）
  - 左上隅は常に座標(0,0)固定
  - サイドバーで数値入力による編集
  - Undo/Redo対応（CanvasResizeCommand）
  - ファイル保存/読み込み時にサイズを保持
  - デフォルトサイズ: 800 x 600
  - 最小サイズ: 100 x 100

- グリッド間隔設定機能
  - 設定画面でグリッド間隔を変更可能（5〜100px）
  - デフォルト: 10px
  - 設定変更後すぐにキャンバスに反映

- グラフ機能 Phase 1: 型定義とGraphManager基盤
  - ToolType に node, edge, delete-node, delete-edge を追加
  - ShapeType に node, edge を追加
  - EdgeDirection 型（none, forward, backward）
  - NodeData, EdgeData インターフェース
  - GraphManager クラス（ノード-エッジ関係管理）

- グラフ機能 Phase 2: ノード実装
  - Node シェイプ（楕円＋中央ラベル）
  - NodeTool（クリックでノード配置、ラベル入力ダイアログ）
  - NodeHandles（4隅リサイズハンドル）
  - AddNodeCommand（Undo/Redo対応）
  - ツールバーにノードボタン追加（Nキー）

- グラフ機能 Phase 3: エッジ基本実装
  - Edge シェイプ（直線・曲線・自己ループ対応）
  - EdgeTool（クリック/ドラッグでエッジ作成）
  - AddEdgeCommand（Undo/Redo対応）
  - 有向/無向エッジ切り替えボタン
  - GraphManager にノード移動時のエッジ更新機能追加
  - ツールバーにエッジボタン追加（Wキー）

- グラフ機能 Phase 4: ノード移動とエッジ連動
  - SelectTool 修正: ノード移動時に接続エッジを自動更新
  - ノードリサイズ時もエッジ位置を自動更新

- グラフ機能 Phase 5: 削除機能
  - DeleteNodeTool（クリックでノードと接続エッジを削除）
  - DeleteEdgeTool（クリックでエッジを削除）
  - DeleteNodeCommand/DeleteEdgeCommand（Undo/Redo対応）
  - 削除ホバー時の赤ハイライト表示

- グラフ機能 Phase 7: プロパティ編集
  - ノード選択時: ラベル、フォントサイズ編集
  - エッジ選択時: 方向（有向/無向）変更
  - NodeLabelChangeCommand/EdgeDirectionChangeCommand（Undo/Redo対応）

- グラフ機能 Phase 8: ファイル永続化
  - FileManager にノード/エッジのシリアライズ機能追加
  - ノード: `<g data-graph-type="node">` 形式でSVG保存
  - エッジ: `<path data-graph-type="edge">` 形式でSVG保存
  - data-* 属性でグラフ構造を保持（source-id, target-id, direction等）
  - ファイル読み込み時にGraphManager関係を再構築
  - ShapeFactory にNode/Edge対応追加
  - Edge.fromElement() 静的メソッド追加

- グラフ機能 Phase 9: ドキュメント更新
  - CLAUDE.md にグラフ機能のドキュメント追加
  - プロジェクト構造にグラフ関連ファイルを追加
  - キーボードショートカット（N, W）を追加
  - イベント一覧にグラフ関連イベントを追加
  - SVG保存形式の説明を追加

- グラフ自動レイアウト機能
  - cytoscape.js を使用したグラフ自動レイアウト
  - LayoutManager: cose (Force-directed) レイアウトアルゴリズム
  - ApplyLayoutCommand: Undo/Redo 対応
  - ツールバーに「Auto Layout」ボタン追加
  - レイアウト結果をキャンバス中央に配置

- 設定ダイアログ機能
  - アプリケーションメニュー追加（File, Edit, View）
  - Edit > Settings... で設定ダイアログを開く
  - 設定項目: 「起動時にスナップをONにする」
  - electron-store による設定の永続化
  - ウィンドウ位置・サイズの記憶と復元

- 位置・サイズ数値入力機能
  - サイドバーで選択オブジェクトの位置・サイズを数値入力で編集可能
  - Line: X1, Y1, X2, Y2
  - Ellipse: CX, CY, RX, RY
  - Rectangle: X, Y, W, H
  - Text: X, Y
  - Node: CX, CY, RX, RY
  - Undo/Redo対応（ResizeShapeCommand使用）
  - ドラッグ移動・リサイズ時にサイドバーの値をリアルタイム同期

- ノード配置サイズ設定機能
  - ノードツール選択時にサイドバーで配置するノードのサイズ（RX, RY）を設定可能
  - デフォルトサイズ: 20 x 20
  - 最小サイズ: 5

- 多角形（Polygon）描画機能
  - クリックで頂点を追加
  - 開始点付近をクリックまたはダブルクリックで図形を閉じる
  - Escapeキーでキャンセル
  - ツールバーボタン追加（Pキー）
  - 頂点ごとにリサイズハンドルで編集可能
  - SVG polygon要素として保存/読み込み

- ポリライン（Polyline）描画機能
  - クリックで頂点を追加
  - ダブルクリックまたはEnterキーで完了
  - Escapeキーでキャンセル
  - ツールバーボタン追加（Yキー）
  - 頂点ごとにリサイズハンドルで編集可能
  - SVG polyline要素として保存/読み込み

- 別名で保存機能とタイトルバー表示
  - 「別名で保存」(Save As) 機能を追加
  - ツールバーに「Save As」ボタン追加
  - メニュー File > Save As... (Ctrl+Shift+S)
  - タイトルバーに現在のファイル名を表示
  - 未保存の変更がある場合は * マークを表示
  - 新規ファイルは「Untitled」と表示
  - 既存ファイルの上書き保存は直接ファイルに保存

- ステータスバー機能
  - 画面下部にステータスバーを追加
  - マウスカーソルのXY座標をリアルタイム表示
  - 現在選択中のツール名を表示

- 新規作成機能と保存確認ダイアログ
  - 「新規作成」(New) 機能を追加 (Ctrl+N)
  - ツールバーに「New」ボタン追加
  - メニュー File > New
  - 未保存の変更がある場合、新規作成・ファイルを開く前に確認ダイアログを表示
  - アプリ終了時に未保存の変更がある場合、確認ダイアログを表示
  - 確認ダイアログで「保存」「保存しない」「キャンセル」を選択可能

- アプリケーションアイコン
  - グラフノード＋エッジ＋グリッドのデザイン
  - 描画中のカーソルと破線で「ドローツール」を表現
  - SVG、PNG（複数サイズ）、ICO形式で生成
  - npm run generate-icons でアイコン再生成可能

---

## [1.0.0] - 2026-01-05

### 追加
- 基本図形描画（直線、楕円、長方形、テキスト）
- 選択・移動・リサイズ機能
- Undo/Redo機能
- ファイル保存/読み込み（SVG形式）
- コピー/ペースト機能
- Z-Order（重ね順）制御
- ズーム・パン機能
- パンツールボタン
- グリッドスナップ機能
- 直線への矢印マーカー機能
