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
