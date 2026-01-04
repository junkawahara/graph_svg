import './styles/main.css';
import './styles/toolbar.css';
import './styles/sidebar.css';
import './styles/canvas.css';

import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { editorState } from './core/EditorState';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DrawSVG initialized');

  // Get DOM elements
  const svgElement = document.getElementById('canvas') as unknown as SVGSVGElement;
  const canvasContainer = document.getElementById('canvas-container')!;

  // Initialize components
  const canvas = new Canvas(svgElement, canvasContainer);
  const toolbar = new Toolbar();

  // Opacity slider display
  const opacitySlider = document.getElementById('prop-opacity') as HTMLInputElement;
  const opacityValue = document.getElementById('prop-opacity-value') as HTMLSpanElement;
  opacitySlider.addEventListener('input', () => {
    opacityValue.textContent = `${opacitySlider.value}%`;
    editorState.updateStyle({ opacity: parseInt(opacitySlider.value) / 100 });
  });

  // Style property inputs (basic wiring for now)
  const fillColor = document.getElementById('prop-fill') as HTMLInputElement;
  const fillNone = document.getElementById('prop-fill-none') as HTMLInputElement;
  const strokeColor = document.getElementById('prop-stroke') as HTMLInputElement;
  const strokeWidth = document.getElementById('prop-stroke-width') as HTMLInputElement;
  const strokeDasharray = document.getElementById('prop-stroke-dasharray') as HTMLSelectElement;
  const strokeLinecap = document.getElementById('prop-stroke-linecap') as HTMLSelectElement;

  fillColor.addEventListener('input', () => {
    editorState.updateStyle({ fill: fillColor.value });
  });

  fillNone.addEventListener('change', () => {
    editorState.updateStyle({ fillNone: fillNone.checked });
  });

  strokeColor.addEventListener('input', () => {
    editorState.updateStyle({ stroke: strokeColor.value });
  });

  strokeWidth.addEventListener('input', () => {
    editorState.updateStyle({ strokeWidth: parseFloat(strokeWidth.value) || 1 });
  });

  strokeDasharray.addEventListener('change', () => {
    editorState.updateStyle({ strokeDasharray: strokeDasharray.value });
  });

  strokeLinecap.addEventListener('change', () => {
    editorState.updateStyle({
      strokeLinecap: strokeLinecap.value as 'butt' | 'round' | 'square'
    });
  });

  console.log('Components initialized:', { canvas, toolbar });
});
