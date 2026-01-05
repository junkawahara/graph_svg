# DrawSVG → PowerPoint EMF コピー＆ペースト機能 実装計画

## 概要

DrawSVGで選択したオブジェクトをEMF（Enhanced Metafile）形式でクリップボードにコピーし、PowerPointにベクター画像として貼り付けられるようにする。

**対象**: Windows限定

---

## アーキテクチャ

```
[Renderer]              [Main Process]           [Native Addon (C++)]
    |                        |                         |
    | Ctrl+C                 |                         |
    | shapes → EmfData       |                         |
    |----------------------->| IPC                     |
    |                        |------------------------>|
    |                        |   GDI API calls         |
    |                        |   SetClipboardData()    |
    |                        |<------------------------|
    |<-----------------------|                         |
```

---

## ファイル構成

### 新規作成

```
native/
  emf-clipboard/
    binding.gyp              # node-gyp ビルド設定
    package.json
    src/
      emf_clipboard.cpp      # メインアドオン
      emf_clipboard.h
      emf_writer.cpp         # EMF生成
      emf_writer.h
    index.d.ts               # TypeScript型定義
    index.js

src/renderer/core/
  EmfConverter.ts            # Shape → EMF変換
```

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/shared/types.ts` | EmfDrawCommand, EmfData型追加 |
| `src/preload/preload.ts` | EMF IPC メソッド追加 |
| `src/main/main.ts` | IPC ハンドラ、ネイティブモジュール読み込み |
| `src/renderer/core/ClipboardManager.ts` | EMFコピー機能追加 |
| `package.json` | ビルドスクリプト、依存関係追加 |

---

## 実装フェーズ

### Phase 1: ネイティブアドオン基盤

**binding.gyp**:
```python
{
  "targets": [{
    "target_name": "emf_clipboard",
    "sources": ["src/emf_clipboard.cpp", "src/emf_writer.cpp"],
    "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
    "conditions": [
      ["OS=='win'", {
        "libraries": ["gdi32.lib", "user32.lib"]
      }]
    ]
  }]
}
```

**主要Windows API**:
```cpp
CreateEnhMetaFile()    // EMF作成開始
CloseEnhMetaFile()     // EMF完了 → HENHMETAFILE
OpenClipboard()
SetClipboardData(CF_ENHMETAFILE, hemf)
CloseClipboard()
```

---

### Phase 2: SVG → GDI 変換マッピング

| DrawSVG Shape | GDI Function |
|---------------|--------------|
| Line | MoveToEx + LineTo |
| Rectangle | Rectangle() |
| Ellipse | Ellipse() |
| Polygon | Polygon() |
| Polyline | Polyline() |
| BezierPath | PolyBezier() |
| Text | TextOutW() + CreateFontW() |
| Group | 再帰処理 |

**スタイル変換**:
| SVG | GDI |
|-----|-----|
| fill | CreateSolidBrush(COLORREF) |
| fill="none" | NULL_BRUSH |
| stroke | CreatePen() |
| stroke-width | CreatePen() width |
| stroke-dasharray | PS_DASH, PS_DOT |

---

### Phase 3: TypeScript変換モジュール

```typescript
// src/renderer/core/EmfConverter.ts

export interface EmfDrawCommand {
  type: 'moveTo' | 'lineTo' | 'rectangle' | 'ellipse' |
        'polygon' | 'polyline' | 'bezier' | 'text' |
        'setPen' | 'setBrush' | 'setFont';
  points?: { x: number; y: number }[];
  text?: string;
  strokeColor?: number;  // COLORREF (BGR)
  fillColor?: number;
  strokeWidth?: number;
  // ...
}

export interface EmfData {
  width: number;
  height: number;
  commands: EmfDrawCommand[];
}

export class EmfConverter {
  private scale = 10;  // 精度用スケール

  convert(shapes: ShapeData[]): EmfData {
    // 全図形をEmfDrawCommand[]に変換
  }
}
```

---

### Phase 4: IPC統合

**preload.ts追加**:
```typescript
copyEmfToClipboard: (emfData: EmfData) =>
  ipcRenderer.invoke('clipboard:copyEmf', emfData),
isEmfSupported: () =>
  ipcRenderer.invoke('clipboard:isEmfSupported'),
```

**main.ts追加**:
```typescript
let emfClipboard = null;
if (process.platform === 'win32') {
  emfClipboard = require('emf-clipboard');
}

ipcMain.handle('clipboard:copyEmf', async (_event, emfData) => {
  if (!emfClipboard) return false;
  return emfClipboard.copyToClipboard(emfData);
});
```

---

### Phase 5: ClipboardManager拡張

```typescript
// ClipboardManager.ts

async copyToSystemClipboard(shapes: Shape[]): Promise<boolean> {
  if (await window.electronAPI.isEmfSupported()) {
    const emfData = this.emfConverter.convert(
      shapes.map(s => s.serialize())
    );
    return window.electronAPI.copyEmfToClipboard(emfData);
  }
  return false;
}
```

---

## 色変換

```typescript
// SVG #RRGGBB → GDI COLORREF (0x00BBGGRR)
function svgToColorRef(color: string): number {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (b << 16) | (g << 8) | r;
}
```

---

## 制限事項

1. **Windows限定** - macOS/Linuxでは動作しない
2. **透明度** - EMFはアルファブレンディングが限定的
3. **フォント** - GDIフォントメトリクスがSVGと若干異なる
4. **円弧** - SVGの円弧はベジェ曲線で近似

---

## ビルド設定

**package.json追加**:
```json
{
  "scripts": {
    "build:native": "cd native/emf-clipboard && node-gyp rebuild",
    "rebuild": "electron-rebuild -f -w emf-clipboard"
  },
  "optionalDependencies": {
    "emf-clipboard": "file:native/emf-clipboard"
  }
}
```

---

## 実装順序

1. ネイティブアドオン基盤構築（binding.gyp, 基本C++）
2. EMF Writer実装（GDI描画コマンド）
3. EmfConverter.ts実装（Shape→Command変換）
4. IPC統合（preload, main）
5. ClipboardManager拡張
6. テスト・調整

---

# 逆方向: PowerPoint → DrawSVG への貼り付け

## 技術的可能性

**結論: 技術的には可能だが、さらに複雑**

### PowerPointがクリップボードに出力する形式

| 形式 | 内容 |
|------|------|
| CF_ENHMETAFILE | EMF（ベクター） |
| CF_METAFILEPICT | WMF（旧形式） |
| CF_DIB / CF_BITMAP | ビットマップ |
| HTML Format | HTML（SVG埋め込みの場合あり） |
| PNG | PNG画像 |

### 実装方式

#### 方式A: EMFパース（ベクター維持）

EMFファイルをパースしてDrawSVGの図形に変換する。

**必要なライブラリ:**
- [libemf2svg](https://github.com/kakwa/libemf2svg) - C言語ライブラリ
- ネイティブアドオンでラップが必要

**課題:**
- GDI描画コマンド → SVG/Shape変換が複雑
- フォントマッピング
- 座標変換
- 全てのGDIコマンドをサポートするのは困難

**実装難易度: ★★★★ 非常に高**

#### 方式B: PNG/ビットマップ読み込み

ビットマップとして読み込み、画像として配置。

**課題:**
- 現在DrawSVGに「画像」図形タイプがない
- 新たにImage shapeを追加する必要がある
- ベクター品質は失われる

**実装難易度: ★★☆ 中**

#### 方式C: SVGパース（限定的）

Office 365以降、一部のコピーでSVGがクリップボードに含まれる場合がある。

**課題:**
- 常にSVGが含まれるわけではない
- SVGパーサーの実装が必要
- 一般的なSVG → DrawSVG Shape変換は複雑

**実装難易度: ★★★ 高**

---

## 比較: 双方向実装

| 方向 | 難易度 | ベクター維持 | 推奨 |
|------|--------|-------------|------|
| DrawSVG → PowerPoint (EMF書き込み) | ★★★ 高 | ◎ | 実装可能 |
| PowerPoint → DrawSVG (EMF読み込み) | ★★★★ 非常に高 | ○ | 困難 |
| PowerPoint → DrawSVG (PNG読み込み) | ★★☆ 中 | × | 可能（要Image shape追加） |

---

## 推奨

1. **まずDrawSVG → PowerPoint（EMF書き込み）を実装**
2. **PNG読み込み機能を追加**（Image shape追加が必要）
3. **EMF読み込みは将来検討**（libemf2svg統合）

---

## 参考資料

- [libemf2svg - EMF to SVG Library](https://github.com/kakwa/libemf2svg)
- [Emf2SvgConverter - Cross-platform wrapper](https://github.com/VasiliyLu/Emf2SvgConverter)
