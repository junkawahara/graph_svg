# tools レビュー

## 指摘事項（重要度順）
1. **高** `src/renderer/tools/SelectTool.ts:234`  
   ドラッグ中/リサイズ中にキャンバス外へ出た場合、`resetState()` で状態を破棄するだけで、既に適用済みの移動/リサイズをコマンド化していません。結果として Undo 履歴に残らない移動が発生します。

2. **中** `src/renderer/tools/RotateTool.ts:147`  
   回転中にマウスが離脱した場合、現在の回転が適用されたまま履歴に残らず、Undo が効かない状態になります。`onMouseUp` 相当の確定処理か、元に戻す処理が必要です。

3. **中** `src/renderer/tools/EdgeTool.ts:32`  
   `onMouseDown` で常に `isDragging = true` になるため、`onMouseUp` の「クリックで始点→終点を選ぶ」分岐が実質到達不能です。その結果、単クリックで自己ループを生成しやすく、想定したクリックモードが機能しません。

4. **低** `src/renderer/tools/ZoomTool.ts:97`  
   コメントでは「Shift+ドラッグで矩形を使ったズームアウト」とありますが、実装は `zoomOutAt` の単発呼び出しのみで、矩形サイズが反映されません。挙動と説明が一致していません。

5. **低** `src/renderer/tools/TextTool.ts:45`  
   テキスト配置が `Math.round` で整数に丸められるため、他の操作での小数第3位丸め方針と不整合です。

## 質問・前提
- Select/Rotate の「マウス離脱時の確定/取消」は現状仕様ですか？Undo可能にする方針で良いでしょうか。
- EdgeTool は「ドラッグのみで作成」仕様ですか？クリック2回で作成する仕様ならロジック調整が必要です。

## 変更サマリ（参考）
- レビュー対象は `src/renderer/tools/*` 全ファイルです。
