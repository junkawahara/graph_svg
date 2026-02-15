# DrawSVG

An SVG drawing editor built with TypeScript. Available as both an Electron desktop app and a web browser app.

**[Try it online](https://junkawahara.github.io/graph_svg/)** | **[日本語版 README はこちら](README_ja.md)**

## Features

### Drawing Tools

- **Line** - Straight lines with optional arrow markers
- **Ellipse** - Ellipses and circles
- **Rectangle** - Rectangles and squares
- **Polygon** - Regular and irregular polygons
- **Polyline** - Open poly-lines (connected line segments)
- **Path** - Bezier curves and complex paths (cubic/quadratic Bezier, arcs)
- **Text** - Text with rich text support (bold, italic, underline, strikethrough, superscript, subscript, color)
- **Image** - Embedded images (Electron only)

### Graph Drawing

- **Nodes** - Place graph vertices (ellipse + label)
- **Edges** - Connect nodes with directed/undirected edges
- Parallel edges with automatic curve offset
- Self-loops
- Import/export graph files (Edge List, DIMACS formats)
- Automatic layout (powered by Cytoscape.js)

### Arrow Markers

Available for lines and paths:

| Shape | Description |
|-------|-------------|
| Arrow | Open arrowhead (>) |
| Triangle | Filled triangle |
| Circle | Filled circle |
| Diamond | Filled diamond |

Each shape has 3 sizes (Small, Medium, Large). Marker color follows the stroke color.

### Editing

- **Select** - Click, Shift+click (add to selection), drag for box selection
- **Move** - Drag selected shapes
- **Resize** - Corner handles; Ctrl+drag to preserve aspect ratio
- **Rotate** - Rotate shapes around their center
- **Group/Ungroup** - Combine shapes; nested groups supported
- **Z-Order** - Bring forward, send backward, bring to front, send to back
- **Copy/Paste** - Clipboard operations for shapes
- **Undo/Redo** - Full history for all editing operations

### Style Properties

- Fill color (including none/transparent)
- Stroke color
- Stroke width
- Opacity
- Stroke dash pattern
- Stroke line cap

### Zoom and Pan

- Mouse wheel to zoom (centered on cursor)
- Space+drag or Pan tool to pan
- Zoom range: 10% - 1000%
- Reset to 100% with toolbar button or Ctrl+0

### Grid Snap

- Toggle grid snap with toolbar button or `G` key
- Snap interval: 10px
- Applies to shape creation, movement, and resizing

### Fit to Content

- **Export Fit to Content** - Export SVG cropped to content bounds (with configurable margin)
- **Fit Canvas to Content** - Resize the canvas to fit all shapes (undoable)

### File Operations

- New, Open, Save, Save As
- SVG file format with full round-trip support
- Import external SVG files (e.g. from PowerPoint, Illustrator)
- Import/Export graph files (Edge List, DIMACS)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)

### Install

```bash
git clone <repository-url>
cd drawsvg
npm install
```

### Run (Electron Desktop App)

```bash
npm start
```

### Run (Web Browser App)

```bash
npm run start:web
```

Then open the URL shown in the terminal (typically `http://localhost:3000`).

### Development Mode

```bash
# Electron (watch mode)
npm run dev

# Web (watch mode)
npm run dev:web
```

### Run Tests

```bash
npm test
```

## Platform Differences

| Feature | Electron | Web |
|---------|----------|-----|
| File save | Overwrite in place | Download only |
| File path | Full path shown in title bar | Filename only |
| Image import | Supported | Not supported |
| Close confirmation | Custom dialog | Browser native |
| Menu bar | Native OS menu | Web menu bar |
| Settings storage | electron-store | localStorage |

## Keyboard Shortcuts

### Tools

| Key | Tool |
|-----|------|
| `V` | Select |
| `L` | Line |
| `E` | Ellipse |
| `R` | Rectangle |
| `5` | Polygon |
| `Y` | Polyline |
| `P` | Path |
| `T` | Text |
| `N` | Node (graph) |
| `W` | Edge (graph) |
| `H` | Pan |
| `Z` | Zoom |
| `O` | Rotate |

### Editing

| Shortcut | Action |
|----------|--------|
| `Delete` / `Backspace` | Delete selected shapes |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Ctrl+G` | Group |
| `Ctrl+Shift+G` | Ungroup |
| `Ctrl+]` | Bring forward |
| `Ctrl+[` | Send backward |
| `Ctrl+Shift+]` | Bring to front |
| `Ctrl+Shift+[` | Send to back |

### File

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+O` | Open |

### Other

| Shortcut | Action |
|----------|--------|
| `G` | Toggle grid snap |
| `Ctrl+0` | Reset zoom to 100% |

## Mouse Operations

### Selection

| Action | Behavior |
|--------|----------|
| Click | Select a shape |
| Shift+Click | Add to selection |
| Drag (from empty area) | Box select (fully enclosed) |
| Alt+Drag | Box select (intersection mode) |
| Shift+Drag | Add to existing selection |

### Resize

| Action | Behavior |
|--------|----------|
| Drag corner handle | Free resize |
| Ctrl+Drag | Preserve aspect ratio |
| Alt+Drag (groups only) | Scale positions only (child sizes unchanged) |

### Path Drawing

| Action | Behavior |
|--------|----------|
| Click | Add straight line point |
| Shift+Click | Add cubic Bezier point |
| Click near start | Close path |
| Double-click / Enter | Finish open path |
| Escape | Cancel |

## SVG File Format

DrawSVG saves standard SVG files. Shapes with special features (arrow markers, graph nodes/edges, groups) use `data-*` attributes for metadata, ensuring compatibility with other SVG viewers while preserving DrawSVG-specific information on reload.

## License

MIT
