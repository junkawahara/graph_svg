import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_STYLE, ShapeStyle, StyleClass } from '../../../src/shared/types';
import { DEFAULT_STYLE_CLASSES } from '../../../src/shared/settings';

// We need to test the StyleClassManager class methods
// Create a fresh instance for testing to avoid singleton issues

class TestableStyleClassManager {
  private classes: Map<string, StyleClass> = new Map();
  private initialized: boolean = false;
  private mockSettings: { styleClasses: StyleClass[] } = { styleClasses: [] };

  setMockSettings(settings: { styleClasses: StyleClass[] }): void {
    this.mockSettings = settings;
  }

  async loadFromSettings(): Promise<void> {
    this.classes.clear();

    // Add built-in classes first
    for (const builtinClass of DEFAULT_STYLE_CLASSES) {
      this.classes.set(builtinClass.name, { ...builtinClass });
    }

    // Add custom classes from mock settings
    if (this.mockSettings.styleClasses) {
      for (const styleClass of this.mockSettings.styleClasses) {
        if (!styleClass.isBuiltin) {
          this.classes.set(styleClass.name, { ...styleClass });
        }
      }
    }

    this.initialized = true;
  }

  getAllClasses(): StyleClass[] {
    return Array.from(this.classes.values());
  }

  getAllClassesSync(): StyleClass[] {
    return Array.from(this.classes.values());
  }

  getClass(name: string): StyleClass | undefined {
    return this.classes.get(name);
  }

  async addClass(name: string, style: ShapeStyle): Promise<StyleClass> {
    if (!this.initialized) {
      await this.loadFromSettings();
    }

    if (this.classes.has(name)) {
      throw new Error(`Style class "${name}" already exists`);
    }

    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error('Invalid class name. Use letters, numbers, hyphens, and underscores. Must start with a letter.');
    }

    const newClass: StyleClass = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      style: { ...style },
      isBuiltin: false
    };

    this.classes.set(name, newClass);
    return newClass;
  }

  async updateClass(id: string, updates: Partial<Omit<StyleClass, 'id' | 'isBuiltin'>>): Promise<boolean> {
    if (!this.initialized) {
      await this.loadFromSettings();
    }

    let foundClass: StyleClass | undefined;
    for (const cls of this.classes.values()) {
      if (cls.id === id) {
        foundClass = cls;
        break;
      }
    }

    if (!foundClass) {
      return false;
    }

    if (foundClass.isBuiltin) {
      return false;
    }

    if (updates.name && updates.name !== foundClass.name) {
      if (this.classes.has(updates.name)) {
        throw new Error(`Style class "${updates.name}" already exists`);
      }
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(updates.name)) {
        throw new Error('Invalid class name');
      }
      this.classes.delete(foundClass.name);
      foundClass.name = updates.name;
      this.classes.set(updates.name, foundClass);
    }

    if (updates.style) {
      foundClass.style = { ...updates.style };
    }

    return true;
  }

  async deleteClass(id: string): Promise<boolean> {
    if (!this.initialized) {
      await this.loadFromSettings();
    }

    let foundClass: StyleClass | undefined;
    for (const cls of this.classes.values()) {
      if (cls.id === id) {
        foundClass = cls;
        break;
      }
    }

    if (!foundClass) {
      return false;
    }

    if (foundClass.isBuiltin) {
      return false;
    }

    this.classes.delete(foundClass.name);
    return true;
  }

  computeStyleDiff(className: string, actualStyle: ShapeStyle): Partial<ShapeStyle> {
    const styleClass = this.classes.get(className);
    if (!styleClass) {
      return { ...actualStyle };
    }

    const classStyle = styleClass.style;
    const diff: Partial<ShapeStyle> = {};

    if (actualStyle.fill !== classStyle.fill) {
      diff.fill = actualStyle.fill;
    }
    if (actualStyle.fillNone !== classStyle.fillNone) {
      diff.fillNone = actualStyle.fillNone;
    }
    if (actualStyle.stroke !== classStyle.stroke) {
      diff.stroke = actualStyle.stroke;
    }
    if (actualStyle.strokeWidth !== classStyle.strokeWidth) {
      diff.strokeWidth = actualStyle.strokeWidth;
    }
    if (actualStyle.opacity !== classStyle.opacity) {
      diff.opacity = actualStyle.opacity;
    }
    if (actualStyle.strokeDasharray !== classStyle.strokeDasharray) {
      diff.strokeDasharray = actualStyle.strokeDasharray;
    }
    if (actualStyle.strokeLinecap !== classStyle.strokeLinecap) {
      diff.strokeLinecap = actualStyle.strokeLinecap;
    }

    return diff;
  }

  hasStyleOverrides(className: string, actualStyle: ShapeStyle): boolean {
    const diff = this.computeStyleDiff(className, actualStyle);
    return Object.keys(diff).length > 0;
  }

  registerTemporaryClasses(classes: StyleClass[]): void {
    for (const cls of classes) {
      if (!this.classes.has(cls.name)) {
        this.classes.set(cls.name, {
          ...cls,
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isBuiltin: false
        });
      }
    }
  }

  async clearTemporaryClasses(): Promise<void> {
    await this.loadFromSettings();
  }
}

describe('StyleClassManager', () => {
  let manager: TestableStyleClassManager;

  beforeEach(async () => {
    manager = new TestableStyleClassManager();
    await manager.loadFromSettings();
  });

  describe('loadFromSettings', () => {
    it('should load built-in classes', async () => {
      const classes = manager.getAllClasses();
      expect(classes.length).toBeGreaterThanOrEqual(DEFAULT_STYLE_CLASSES.length);

      for (const builtin of DEFAULT_STYLE_CLASSES) {
        const found = manager.getClass(builtin.name);
        expect(found).toBeDefined();
        expect(found?.isBuiltin).toBe(true);
      }
    });

    it('should include thick-line class', () => {
      const thickLine = manager.getClass('thick-line');
      expect(thickLine).toBeDefined();
      expect(thickLine?.style.strokeWidth).toBe(4);
    });

    it('should include dashed class', () => {
      const dashed = manager.getClass('dashed');
      expect(dashed).toBeDefined();
      expect(dashed?.style.strokeDasharray).toBe('5,5');
    });

    it('should include dotted class', () => {
      const dotted = manager.getClass('dotted');
      expect(dotted).toBeDefined();
      expect(dotted?.style.strokeDasharray).toBe('2,2');
    });

    it('should include no-stroke class', () => {
      const noStroke = manager.getClass('no-stroke');
      expect(noStroke).toBeDefined();
      expect(noStroke?.style.strokeWidth).toBe(0);
    });

    it('should include semi-transparent class', () => {
      const semiTransparent = manager.getClass('semi-transparent');
      expect(semiTransparent).toBeDefined();
      expect(semiTransparent?.style.opacity).toBe(0.5);
    });

    it('should load custom classes from settings', async () => {
      const customClass: StyleClass = {
        id: 'custom-123',
        name: 'my-custom-class',
        style: { ...DEFAULT_STYLE, fill: '#ff0000' },
        isBuiltin: false
      };

      manager.setMockSettings({ styleClasses: [...DEFAULT_STYLE_CLASSES, customClass] });
      await manager.loadFromSettings();

      const found = manager.getClass('my-custom-class');
      expect(found).toBeDefined();
      expect(found?.style.fill).toBe('#ff0000');
    });
  });

  describe('getAllClasses', () => {
    it('should return all classes', () => {
      const classes = manager.getAllClasses();
      expect(classes.length).toBe(DEFAULT_STYLE_CLASSES.length);
    });

    it('should return array not map', () => {
      const classes = manager.getAllClasses();
      expect(Array.isArray(classes)).toBe(true);
    });
  });

  describe('getAllClassesSync', () => {
    it('should return same result as getAllClasses', () => {
      const asyncClasses = manager.getAllClasses();
      const syncClasses = manager.getAllClassesSync();
      expect(syncClasses).toEqual(asyncClasses);
    });
  });

  describe('getClass', () => {
    it('should return class by name', () => {
      const thickLine = manager.getClass('thick-line');
      expect(thickLine?.name).toBe('thick-line');
    });

    it('should return undefined for non-existent class', () => {
      const result = manager.getClass('non-existent-class');
      expect(result).toBeUndefined();
    });
  });

  describe('addClass', () => {
    it('should add new custom class', async () => {
      const style: ShapeStyle = {
        ...DEFAULT_STYLE,
        fill: '#00ff00'
      };

      const newClass = await manager.addClass('my-green', style);

      expect(newClass.name).toBe('my-green');
      expect(newClass.style.fill).toBe('#00ff00');
      expect(newClass.isBuiltin).toBe(false);
    });

    it('should make class retrievable after adding', async () => {
      await manager.addClass('test-class', DEFAULT_STYLE);

      const found = manager.getClass('test-class');
      expect(found).toBeDefined();
    });

    it('should throw error for duplicate name', async () => {
      await manager.addClass('unique-name', DEFAULT_STYLE);

      await expect(manager.addClass('unique-name', DEFAULT_STYLE))
        .rejects.toThrow('Style class "unique-name" already exists');
    });

    it('should throw error for built-in class name', async () => {
      await expect(manager.addClass('thick-line', DEFAULT_STYLE))
        .rejects.toThrow('Style class "thick-line" already exists');
    });

    it('should throw error for invalid class name starting with number', async () => {
      await expect(manager.addClass('123invalid', DEFAULT_STYLE))
        .rejects.toThrow('Invalid class name');
    });

    it('should throw error for class name with spaces', async () => {
      await expect(manager.addClass('has spaces', DEFAULT_STYLE))
        .rejects.toThrow('Invalid class name');
    });

    it('should throw error for class name with special characters', async () => {
      await expect(manager.addClass('has@special', DEFAULT_STYLE))
        .rejects.toThrow('Invalid class name');
    });

    it('should allow class name with hyphens', async () => {
      const newClass = await manager.addClass('my-hyphen-class', DEFAULT_STYLE);
      expect(newClass.name).toBe('my-hyphen-class');
    });

    it('should allow class name with underscores', async () => {
      const newClass = await manager.addClass('my_underscore_class', DEFAULT_STYLE);
      expect(newClass.name).toBe('my_underscore_class');
    });

    it('should allow class name with numbers after first letter', async () => {
      const newClass = await manager.addClass('class123', DEFAULT_STYLE);
      expect(newClass.name).toBe('class123');
    });

    it('should generate unique ID', async () => {
      const class1 = await manager.addClass('class-a', DEFAULT_STYLE);
      const class2 = await manager.addClass('class-b', DEFAULT_STYLE);
      expect(class1.id).not.toBe(class2.id);
    });
  });

  describe('updateClass', () => {
    it('should update custom class style', async () => {
      const newClass = await manager.addClass('updateable', DEFAULT_STYLE);

      const newStyle: ShapeStyle = {
        ...DEFAULT_STYLE,
        fill: '#ff00ff'
      };

      const result = await manager.updateClass(newClass.id, { style: newStyle });

      expect(result).toBe(true);
      expect(manager.getClass('updateable')?.style.fill).toBe('#ff00ff');
    });

    it('should update custom class name', async () => {
      const newClass = await manager.addClass('old-name', DEFAULT_STYLE);

      const result = await manager.updateClass(newClass.id, { name: 'new-name' });

      expect(result).toBe(true);
      expect(manager.getClass('old-name')).toBeUndefined();
      expect(manager.getClass('new-name')).toBeDefined();
    });

    it('should return false for non-existent class', async () => {
      const result = await manager.updateClass('non-existent-id', { style: DEFAULT_STYLE });
      expect(result).toBe(false);
    });

    it('should return false for built-in class', async () => {
      const thickLine = manager.getClass('thick-line');
      const result = await manager.updateClass(thickLine!.id, { style: DEFAULT_STYLE });
      expect(result).toBe(false);
    });

    it('should throw error when renaming to existing name', async () => {
      const class1 = await manager.addClass('class-one', DEFAULT_STYLE);
      await manager.addClass('class-two', DEFAULT_STYLE);

      await expect(manager.updateClass(class1.id, { name: 'class-two' }))
        .rejects.toThrow('Style class "class-two" already exists');
    });

    it('should throw error for invalid new name', async () => {
      const newClass = await manager.addClass('valid-name', DEFAULT_STYLE);

      await expect(manager.updateClass(newClass.id, { name: '123invalid' }))
        .rejects.toThrow('Invalid class name');
    });
  });

  describe('deleteClass', () => {
    it('should delete custom class', async () => {
      const newClass = await manager.addClass('deletable', DEFAULT_STYLE);

      const result = await manager.deleteClass(newClass.id);

      expect(result).toBe(true);
      expect(manager.getClass('deletable')).toBeUndefined();
    });

    it('should return false for non-existent class', async () => {
      const result = await manager.deleteClass('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return false for built-in class', async () => {
      const thickLine = manager.getClass('thick-line');
      const result = await manager.deleteClass(thickLine!.id);
      expect(result).toBe(false);
    });
  });

  describe('computeStyleDiff', () => {
    it('should return empty object when styles match', () => {
      const thickLine = manager.getClass('thick-line')!;
      const diff = manager.computeStyleDiff('thick-line', thickLine.style);
      expect(Object.keys(diff).length).toBe(0);
    });

    it('should return all properties for non-existent class', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, fill: '#abc123' };
      const diff = manager.computeStyleDiff('non-existent', style);
      expect(diff).toEqual(style);
    });

    it('should detect fill difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeWidth: 4, fill: '#ff0000' };
      const diff = manager.computeStyleDiff('thick-line', style);
      expect(diff.fill).toBe('#ff0000');
      expect(diff.strokeWidth).toBeUndefined(); // matches class
    });

    it('should detect stroke difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeWidth: 4, stroke: '#00ff00' };
      const diff = manager.computeStyleDiff('thick-line', style);
      expect(diff.stroke).toBe('#00ff00');
    });

    it('should detect strokeWidth difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeWidth: 10 };
      const diff = manager.computeStyleDiff('thick-line', style);
      expect(diff.strokeWidth).toBe(10);
    });

    it('should detect opacity difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, opacity: 0.3 };
      const diff = manager.computeStyleDiff('semi-transparent', style);
      expect(diff.opacity).toBe(0.3);
    });

    it('should detect strokeDasharray difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeDasharray: '10,10' };
      const diff = manager.computeStyleDiff('dashed', style);
      expect(diff.strokeDasharray).toBe('10,10');
    });

    it('should detect fillNone difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeWidth: 4, fillNone: true };
      const diff = manager.computeStyleDiff('thick-line', style);
      expect(diff.fillNone).toBe(true);
    });

    it('should detect strokeLinecap difference', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeWidth: 4, strokeLinecap: 'round' };
      const diff = manager.computeStyleDiff('thick-line', style);
      expect(diff.strokeLinecap).toBe('round');
    });
  });

  describe('hasStyleOverrides', () => {
    it('should return false when styles match', () => {
      const thickLine = manager.getClass('thick-line')!;
      expect(manager.hasStyleOverrides('thick-line', thickLine.style)).toBe(false);
    });

    it('should return true when styles differ', () => {
      const style: ShapeStyle = { ...DEFAULT_STYLE, strokeWidth: 4, fill: '#ff0000' };
      expect(manager.hasStyleOverrides('thick-line', style)).toBe(true);
    });

    it('should return true for non-existent class', () => {
      expect(manager.hasStyleOverrides('non-existent', DEFAULT_STYLE)).toBe(true);
    });
  });

  describe('registerTemporaryClasses', () => {
    it('should add temporary classes', () => {
      const tempClasses: StyleClass[] = [
        {
          id: 'temp-1',
          name: 'temp-class-1',
          style: { ...DEFAULT_STYLE, fill: '#111111' },
          isBuiltin: false
        },
        {
          id: 'temp-2',
          name: 'temp-class-2',
          style: { ...DEFAULT_STYLE, fill: '#222222' },
          isBuiltin: false
        }
      ];

      manager.registerTemporaryClasses(tempClasses);

      expect(manager.getClass('temp-class-1')).toBeDefined();
      expect(manager.getClass('temp-class-2')).toBeDefined();
    });

    it('should not overwrite existing classes', () => {
      const existingClass = manager.getClass('thick-line')!;
      const originalStrokeWidth = existingClass.style.strokeWidth;

      const tempClasses: StyleClass[] = [
        {
          id: 'override-attempt',
          name: 'thick-line', // same name as built-in
          style: { ...DEFAULT_STYLE, strokeWidth: 99 },
          isBuiltin: false
        }
      ];

      manager.registerTemporaryClasses(tempClasses);

      // Should not have overwritten
      expect(manager.getClass('thick-line')?.style.strokeWidth).toBe(originalStrokeWidth);
    });

    it('should assign new IDs to temporary classes', () => {
      const tempClasses: StyleClass[] = [
        {
          id: 'original-id',
          name: 'temp-with-id',
          style: DEFAULT_STYLE,
          isBuiltin: false
        }
      ];

      manager.registerTemporaryClasses(tempClasses);

      const added = manager.getClass('temp-with-id');
      expect(added?.id).not.toBe('original-id');
      expect(added?.id.startsWith('temp-')).toBe(true);
    });
  });

  describe('clearTemporaryClasses', () => {
    it('should reset to settings state', async () => {
      // Add a temporary class
      manager.registerTemporaryClasses([
        {
          id: 'temp-1',
          name: 'temp-to-clear',
          style: DEFAULT_STYLE,
          isBuiltin: false
        }
      ]);

      expect(manager.getClass('temp-to-clear')).toBeDefined();

      await manager.clearTemporaryClasses();

      expect(manager.getClass('temp-to-clear')).toBeUndefined();
    });

    it('should preserve built-in classes after clear', async () => {
      manager.registerTemporaryClasses([
        {
          id: 'temp-1',
          name: 'temp-class',
          style: DEFAULT_STYLE,
          isBuiltin: false
        }
      ]);

      await manager.clearTemporaryClasses();

      // Built-in classes should still exist
      expect(manager.getClass('thick-line')).toBeDefined();
      expect(manager.getClass('dashed')).toBeDefined();
    });
  });
});
