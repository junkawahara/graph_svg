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
