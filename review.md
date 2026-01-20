# Path.ts レビュー

## 指摘事項（重要度順）
1. **中** `src/renderer/shapes/Path.ts:377`  
   `Z` の閉路判定で `this.commands.find(c => c.type === 'M')` を使って最初の `M` に戻しているため、複数サブパスを含むパスでは誤った閉路線分になります。結果として hitTest の当たり判定がズレる可能性があります。

2. **中** `src/renderer/shapes/Path.ts:851`  
   `getCommandStart()` が直前コマンドとして `A`（Arc）を考慮していません。前のコマンドが `A` の場合に始点が誤り、アンカー編集やポイント追加で不正な位置計算になるリスクがあります。

3. **低** `src/renderer/shapes/Path.ts:54`  
   `fromPoints()` で座標を `Math.round` しており、小数第3位までの丸め方針と不整合です。ズームや細かな編集時に精度が落ち、描画ツールの挙動が他の操作と一貫しない可能性があります。

## 質問・前提
- `Z` の hitTest は「最初の `M` に閉じる」仕様で問題ない前提でしょうか？複数サブパスを許容する場合は修正が必要です。
- `getCommandStart()` の呼び出し側は `A` を含むパス編集を想定していますか？

## 変更サマリ（参考）
- レビュー対象は `src/renderer/shapes/Path.ts` のみです。

## 追加レビュー: src/renderer/shapes

### 指摘事項（重要度順）
1. **高** `src/renderer/shapes/ShapeFactory.ts:106`  
   `edge` の復元時に `label`、`lineType`、`curveAmount`、`pathCommands`、`sourceConnectionAngle`、`targetConnectionAngle` を渡していないため、コピー/貼り付けや復元後にエッジの表示・編集情報が失われます。

2. **中** `src/renderer/shapes/Edge.ts:1048`  
   `getBounds()` が開始点と終了点だけで矩形を返すため、曲線・自己ループ・パス型のエッジや矢印/ラベルがバウンディングボックス外に出ます。選択枠や Fit to Content の範囲が過小になります。

3. **中** `src/renderer/shapes/Line.ts:439`  
   `applySkew()` が `x1` を更新した後にその値で `y1` を計算しており、元座標からのスキューになっていません。同様に `x2/y2` も更新順の影響を受け、変換誤差が出ます。

4. **中** `src/renderer/shapes/Polygon.ts:102`  
   `hitTest()` が `fillNone` の場合でも内部点をヒットとして扱うため、塗りなしポリゴンの内部クリックでも選択されます。

5. **低** `src/renderer/shapes/Rectangle.ts:29`  
   `fromBoundingBox()` が `Math.round` を使っており、小数第3位丸めの方針と不整合です。同様の丸めが他の形状生成にも散在しています（例: `src/renderer/shapes/Ellipse.ts:29`, `src/renderer/shapes/Line.ts:42`, `src/renderer/shapes/Polygon.ts:26`, `src/renderer/shapes/Polyline.ts:26`, `src/renderer/shapes/Node.ts:35`）。

### ファイル別メモ
- `src/renderer/shapes/Shape.ts`: 主要な問題は見当たりませんでした。
- `src/renderer/shapes/Edge.ts`: バウンディング計算の過小（上記参照）。
- `src/renderer/shapes/Line.ts`: スキュー計算の順序依存（上記参照）。
- `src/renderer/shapes/Rectangle.ts`: 丸め方針の不整合（上記参照）。
- `src/renderer/shapes/Ellipse.ts`: 丸め方針の不整合（上記参照）。
- `src/renderer/shapes/Polygon.ts`: 塗り無し時の hitTest 判定（上記参照）。
- `src/renderer/shapes/Polyline.ts`: 丸め方針の不整合（上記参照）。
- `src/renderer/shapes/Path.ts`: 既存レビューの指摘を参照してください。
- `src/renderer/shapes/Text.ts`: 主要な問題は見当たりませんでした。
- `src/renderer/shapes/Image.ts`: 主要な問題は見当たりませんでした。
- `src/renderer/shapes/Group.ts`: 主要な問題は見当たりませんでした。
- `src/renderer/shapes/Node.ts`: 丸め方針の不整合（上記参照）。
- `src/renderer/shapes/ShapeFactory.ts`: Edge 復元時の情報欠落（上記参照）。
