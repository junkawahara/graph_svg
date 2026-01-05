# Changelog

このプロジェクトの変更履歴を記録します。

## [Unreleased]

### 追加
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
