import { describe, it, expect, beforeEach } from 'vitest';
import {
  MarkerManager,
  initMarkerManager,
  getMarkerManager,
  getAllMarkerTypes,
  getMarkerDefinition
} from '../../../src/renderer/core/MarkerManager';
import { MarkerType } from '../../../src/shared/types';

describe('MarkerManager', () => {
  let svg: SVGSVGElement;
  let manager: MarkerManager;

  beforeEach(() => {
    // Create a fresh SVG element for each test
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    manager = new MarkerManager(svg);
  });

  describe('constructor', () => {
    it('should create defs element in SVG', () => {
      const defs = svg.querySelector('defs');
      expect(defs).not.toBeNull();
    });

    it('should use existing defs element if present', () => {
      const existingDefs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      existingDefs.id = 'existing-defs';
      const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg2.appendChild(existingDefs);

      new MarkerManager(svg2);

      const allDefs = svg2.querySelectorAll('defs');
      expect(allDefs.length).toBe(1);
      expect(allDefs[0].id).toBe('existing-defs');
    });

    it('should insert defs as first child', () => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg2.appendChild(rect);

      new MarkerManager(svg2);

      expect(svg2.firstChild?.nodeName.toLowerCase()).toBe('defs');
    });
  });

  describe('getMarkerId', () => {
    it('should return empty string for none type', () => {
      expect(manager.getMarkerId('none', 'start')).toBe('');
      expect(manager.getMarkerId('none', 'end')).toBe('');
    });

    it('should generate id without color', () => {
      expect(manager.getMarkerId('arrow-medium', 'start')).toBe('marker-arrow-medium-start');
      expect(manager.getMarkerId('triangle-large', 'end')).toBe('marker-triangle-large-end');
    });

    it('should generate id with color', () => {
      expect(manager.getMarkerId('arrow-medium', 'start', '#ff0000')).toBe('marker-arrow-medium-ff0000-start');
      expect(manager.getMarkerId('circle-small', 'end', '#00ff00')).toBe('marker-circle-small-00ff00-end');
    });

    it('should normalize color (remove # and lowercase)', () => {
      expect(manager.getMarkerId('arrow-medium', 'start', '#FF00AA')).toBe('marker-arrow-medium-ff00aa-start');
      expect(manager.getMarkerId('arrow-medium', 'start', 'ABCDEF')).toBe('marker-arrow-medium-abcdef-start');
    });
  });

  describe('getMarkerUrl', () => {
    it('should return empty string for none type', () => {
      expect(manager.getMarkerUrl('none', 'start', '#000000')).toBe('');
      expect(manager.getMarkerUrl('none', 'end', '#000000')).toBe('');
    });

    it('should return url reference for valid marker', () => {
      const url = manager.getMarkerUrl('arrow-medium', 'end', '#ff0000');
      expect(url).toBe('url(#marker-arrow-medium-ff0000-end)');
    });

    it('should create marker when getting URL', () => {
      manager.getMarkerUrl('triangle-small', 'start', '#0000ff');

      const marker = svg.querySelector('#marker-triangle-small-0000ff-start');
      expect(marker).not.toBeNull();
    });
  });

  describe('ensureMarker', () => {
    it('should do nothing for none type', () => {
      manager.ensureMarker('none', 'start', '#000000');
      const markers = svg.querySelectorAll('marker');
      expect(markers.length).toBe(0);
    });

    it('should create marker element', () => {
      manager.ensureMarker('arrow-medium', 'end', '#000000');

      const marker = svg.querySelector('#marker-arrow-medium-000000-end');
      expect(marker).not.toBeNull();
    });

    it('should not create duplicate markers', () => {
      manager.ensureMarker('arrow-medium', 'end', '#000000');
      manager.ensureMarker('arrow-medium', 'end', '#000000');
      manager.ensureMarker('arrow-medium', 'end', '#000000');

      const markers = svg.querySelectorAll('[id^="marker-arrow-medium-000000-end"]');
      expect(markers.length).toBe(1);
    });

    it('should create separate markers for different colors', () => {
      manager.ensureMarker('arrow-medium', 'end', '#ff0000');
      manager.ensureMarker('arrow-medium', 'end', '#00ff00');
      manager.ensureMarker('arrow-medium', 'end', '#0000ff');

      const markers = svg.querySelectorAll('marker');
      expect(markers.length).toBe(3);
    });

    it('should create separate markers for start and end', () => {
      manager.ensureMarker('arrow-medium', 'start', '#000000');
      manager.ensureMarker('arrow-medium', 'end', '#000000');

      const startMarker = svg.querySelector('#marker-arrow-medium-000000-start');
      const endMarker = svg.querySelector('#marker-arrow-medium-000000-end');
      expect(startMarker).not.toBeNull();
      expect(endMarker).not.toBeNull();
    });

    it('should set correct viewBox', () => {
      manager.ensureMarker('arrow-medium', 'end', '#000000');

      const marker = svg.querySelector('#marker-arrow-medium-000000-end');
      expect(marker?.getAttribute('viewBox')).toBe('0 0 9 10');
    });

    it('should set orient to auto-start-reverse for start markers', () => {
      manager.ensureMarker('arrow-medium', 'start', '#000000');

      const marker = svg.querySelector('#marker-arrow-medium-000000-start');
      expect(marker?.getAttribute('orient')).toBe('auto-start-reverse');
    });

    it('should set orient to auto for end markers', () => {
      manager.ensureMarker('arrow-medium', 'end', '#000000');

      const marker = svg.querySelector('#marker-arrow-medium-000000-end');
      expect(marker?.getAttribute('orient')).toBe('auto');
    });

    it('should set markerUnits to strokeWidth', () => {
      manager.ensureMarker('arrow-medium', 'end', '#000000');

      const marker = svg.querySelector('#marker-arrow-medium-000000-end');
      expect(marker?.getAttribute('markerUnits')).toBe('strokeWidth');
    });

    describe('arrow markers (unfilled)', () => {
      it('should create unfilled arrow with stroke', () => {
        manager.ensureMarker('arrow-medium', 'end', '#ff0000');

        const marker = svg.querySelector('#marker-arrow-medium-ff0000-end');
        const path = marker?.querySelector('path');

        expect(path?.getAttribute('fill')).toBe('none');
        expect(path?.getAttribute('stroke')).toBe('#ff0000');
      });

      it('should set stroke-width on arrow', () => {
        manager.ensureMarker('arrow-medium', 'end', '#000000');

        const marker = svg.querySelector('#marker-arrow-medium-000000-end');
        const path = marker?.querySelector('path');

        expect(path?.getAttribute('stroke-width')).toBe('1.5');
      });

      it('should set stroke-linecap and stroke-linejoin', () => {
        manager.ensureMarker('arrow-medium', 'end', '#000000');

        const marker = svg.querySelector('#marker-arrow-medium-000000-end');
        const path = marker?.querySelector('path');

        expect(path?.getAttribute('stroke-linecap')).toBe('round');
        expect(path?.getAttribute('stroke-linejoin')).toBe('round');
      });
    });

    describe('filled markers (triangle, circle, diamond)', () => {
      it('should create filled triangle', () => {
        manager.ensureMarker('triangle-medium', 'end', '#ff0000');

        const marker = svg.querySelector('#marker-triangle-medium-ff0000-end');
        const path = marker?.querySelector('path');

        expect(path?.getAttribute('fill')).toBe('#ff0000');
        expect(path?.getAttribute('stroke')).toBe('none');
      });

      it('should create filled circle', () => {
        manager.ensureMarker('circle-small', 'end', '#00ff00');

        const marker = svg.querySelector('#marker-circle-small-00ff00-end');
        const path = marker?.querySelector('path');

        expect(path?.getAttribute('fill')).toBe('#00ff00');
      });

      it('should create filled diamond', () => {
        manager.ensureMarker('diamond-large', 'start', '#0000ff');

        const marker = svg.querySelector('#marker-diamond-large-0000ff-start');
        const path = marker?.querySelector('path');

        expect(path?.getAttribute('fill')).toBe('#0000ff');
      });
    });

    describe('marker sizes', () => {
      it('should use double sizes for arrow markers', () => {
        manager.ensureMarker('arrow-small', 'end', '#000');
        manager.ensureMarker('arrow-medium', 'end', '#000');
        manager.ensureMarker('arrow-large', 'end', '#000');

        const small = svg.querySelector('#marker-arrow-small-000-end');
        const medium = svg.querySelector('#marker-arrow-medium-000-end');
        const large = svg.querySelector('#marker-arrow-large-000-end');

        expect(small?.getAttribute('markerWidth')).toBe('6');
        expect(medium?.getAttribute('markerWidth')).toBe('8');
        expect(large?.getAttribute('markerWidth')).toBe('12');
      });

      it('should use standard sizes for other markers', () => {
        manager.ensureMarker('triangle-small', 'end', '#000');
        manager.ensureMarker('triangle-medium', 'end', '#000');
        manager.ensureMarker('triangle-large', 'end', '#000');

        const small = svg.querySelector('#marker-triangle-small-000-end');
        const medium = svg.querySelector('#marker-triangle-medium-000-end');
        const large = svg.querySelector('#marker-triangle-large-000-end');

        expect(small?.getAttribute('markerWidth')).toBe('3');
        expect(medium?.getAttribute('markerWidth')).toBe('4');
        expect(large?.getAttribute('markerWidth')).toBe('6');
      });
    });
  });

  describe('getDefsElement', () => {
    it('should return the defs element', () => {
      const defs = manager.getDefsElement();
      expect(defs).toBe(svg.querySelector('defs'));
    });
  });

  describe('all marker types', () => {
    const allTypes: Exclude<MarkerType, 'none'>[] = [
      'arrow-small', 'arrow-medium', 'arrow-large',
      'triangle-small', 'triangle-medium', 'triangle-large',
      'circle-small', 'circle-medium', 'circle-large',
      'diamond-small', 'diamond-medium', 'diamond-large'
    ];

    it('should create all marker types', () => {
      for (const type of allTypes) {
        manager.ensureMarker(type, 'end', '#000000');
        const marker = svg.querySelector(`#marker-${type}-000000-end`);
        expect(marker, `Marker ${type} should exist`).not.toBeNull();
      }
    });
  });
});

describe('Module functions', () => {
  describe('getAllMarkerTypes', () => {
    it('should return all 12 marker types', () => {
      const types = getAllMarkerTypes();
      expect(types).toHaveLength(12);
    });

    it('should not include none', () => {
      const types = getAllMarkerTypes();
      expect(types).not.toContain('none');
    });

    it('should include all shapes and sizes', () => {
      const types = getAllMarkerTypes();
      const shapes = ['arrow', 'triangle', 'circle', 'diamond'];
      const sizes = ['small', 'medium', 'large'];

      for (const shape of shapes) {
        for (const size of sizes) {
          expect(types).toContain(`${shape}-${size}`);
        }
      }
    });
  });

  describe('getMarkerDefinition', () => {
    it('should return definition for arrow markers', () => {
      const def = getMarkerDefinition('arrow-medium');
      expect(def.viewBox).toBe('0 0 9 10');
      expect(def.filled).toBe(false);
      expect(def.strokeWidth).toBe(1.5);
    });

    it('should return definition for triangle markers', () => {
      const def = getMarkerDefinition('triangle-small');
      expect(def.viewBox).toBe('0 0 10 10');
      expect(def.filled).toBe(true);
    });

    it('should return definition for circle markers', () => {
      const def = getMarkerDefinition('circle-large');
      expect(def.viewBox).toBe('0 0 10 10');
      expect(def.filled).toBe(true);
      expect(def.refX).toBe(5);
      expect(def.refY).toBe(5);
    });

    it('should return definition for diamond markers', () => {
      const def = getMarkerDefinition('diamond-medium');
      expect(def.filled).toBe(true);
    });

    it('should have correct marker sizes', () => {
      // Arrow uses 2x sizes
      expect(getMarkerDefinition('arrow-small').markerSize).toBe(6);
      expect(getMarkerDefinition('arrow-medium').markerSize).toBe(8);
      expect(getMarkerDefinition('arrow-large').markerSize).toBe(12);

      // Others use standard sizes
      expect(getMarkerDefinition('triangle-small').markerSize).toBe(3);
      expect(getMarkerDefinition('triangle-medium').markerSize).toBe(4);
      expect(getMarkerDefinition('triangle-large').markerSize).toBe(6);
    });
  });

  describe('initMarkerManager / getMarkerManager', () => {
    it('should initialize and return marker manager', () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const manager = initMarkerManager(svg);

      expect(manager).toBeInstanceOf(MarkerManager);
      expect(getMarkerManager()).toBe(manager);
    });

    it('should replace existing manager on re-init', () => {
      const svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

      const manager1 = initMarkerManager(svg1);
      const manager2 = initMarkerManager(svg2);

      expect(manager2).not.toBe(manager1);
      expect(getMarkerManager()).toBe(manager2);
    });
  });
});
