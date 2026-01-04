import './styles/main.css';
import './styles/toolbar.css';
import './styles/sidebar.css';
import './styles/canvas.css';

import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';

document.addEventListener('DOMContentLoaded', () => {
  console.log('DrawSVG initialized');

  // Get DOM elements
  const svgElement = document.getElementById('canvas') as unknown as SVGSVGElement;
  const canvasContainer = document.getElementById('canvas-container')!;

  // Initialize components
  const canvas = new Canvas(svgElement, canvasContainer);
  const toolbar = new Toolbar();
  const sidebar = new Sidebar();

  console.log('Components initialized:', { canvas, toolbar, sidebar });
});
