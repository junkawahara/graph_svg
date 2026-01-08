import { StyleClass, ShapeStyle, DEFAULT_STYLE } from '../../shared/types';
import { DEFAULT_STYLE_CLASSES } from '../../shared/settings';

/**
 * Manages style classes for CSS-based styling
 */
class StyleClassManager {
  private classes: Map<string, StyleClass> = new Map();
  private initialized: boolean = false;

  /**
   * Load style classes from app settings
   */
  async loadFromSettings(): Promise<void> {
    try {
      const settings = await window.electronAPI.readSettings();
      this.classes.clear();

      // Add built-in classes first (ensure they're always available)
      for (const builtinClass of DEFAULT_STYLE_CLASSES) {
        this.classes.set(builtinClass.name, { ...builtinClass });
      }

      // Add custom classes from settings (may override builtins if same name)
      if (settings.styleClasses) {
        for (const styleClass of settings.styleClasses) {
          // Skip built-in classes (already added)
          if (!styleClass.isBuiltin) {
            this.classes.set(styleClass.name, { ...styleClass });
          }
        }
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to load style classes from settings:', error);
      // Fall back to built-in classes only
      this.classes.clear();
      for (const builtinClass of DEFAULT_STYLE_CLASSES) {
        this.classes.set(builtinClass.name, { ...builtinClass });
      }
      this.initialized = true;
    }
  }

  /**
   * Save style classes to app settings
   */
  async saveToSettings(): Promise<void> {
    try {
      const allClasses = this.getAllClasses();
      await window.electronAPI.writeSettings({ styleClasses: allClasses });
    } catch (error) {
      console.error('Failed to save style classes to settings:', error);
    }
  }

  /**
   * Ensure the manager is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.loadFromSettings();
    }
  }

  /**
   * Get all style classes
   */
  getAllClasses(): StyleClass[] {
    return Array.from(this.classes.values());
  }

  /**
   * Get all classes synchronously (for UI, may return empty before init)
   */
  getAllClassesSync(): StyleClass[] {
    return Array.from(this.classes.values());
  }

  /**
   * Get a style class by name
   */
  getClass(name: string): StyleClass | undefined {
    return this.classes.get(name);
  }

  /**
   * Add a new custom style class
   */
  async addClass(name: string, style: ShapeStyle): Promise<StyleClass> {
    await this.ensureInitialized();

    // Check for duplicate name
    if (this.classes.has(name)) {
      throw new Error(`Style class "${name}" already exists`);
    }

    // Validate CSS class name (alphanumeric, hyphen, underscore)
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
    await this.saveToSettings();

    return newClass;
  }

  /**
   * Update an existing style class
   */
  async updateClass(id: string, updates: Partial<Omit<StyleClass, 'id' | 'isBuiltin'>>): Promise<boolean> {
    await this.ensureInitialized();

    // Find the class by ID
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

    // Cannot modify built-in classes (except by overriding with custom)
    if (foundClass.isBuiltin) {
      console.warn('Cannot modify built-in style class');
      return false;
    }

    // If name is changing, check for duplicates
    if (updates.name && updates.name !== foundClass.name) {
      if (this.classes.has(updates.name)) {
        throw new Error(`Style class "${updates.name}" already exists`);
      }
      // Validate new name
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(updates.name)) {
        throw new Error('Invalid class name');
      }
      // Remove old entry and add with new name
      this.classes.delete(foundClass.name);
      foundClass.name = updates.name;
      this.classes.set(updates.name, foundClass);
    }

    // Update style if provided
    if (updates.style) {
      foundClass.style = { ...updates.style };
    }

    await this.saveToSettings();
    return true;
  }

  /**
   * Delete a style class
   */
  async deleteClass(id: string): Promise<boolean> {
    await this.ensureInitialized();

    // Find the class by ID
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

    // Cannot delete built-in classes
    if (foundClass.isBuiltin) {
      console.warn('Cannot delete built-in style class');
      return false;
    }

    this.classes.delete(foundClass.name);
    await this.saveToSettings();
    return true;
  }

  /**
   * Compute style difference between class style and actual shape style
   * Returns only the properties that differ from the class
   * Used for SVG output to minimize inline attributes
   */
  computeStyleDiff(className: string, actualStyle: ShapeStyle): Partial<ShapeStyle> {
    const styleClass = this.classes.get(className);
    if (!styleClass) {
      // Class not found, return all style properties
      return { ...actualStyle };
    }

    const classStyle = styleClass.style;
    const diff: Partial<ShapeStyle> = {};

    // Compare each style property
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

  /**
   * Check if a style differs from its class
   * Returns true if any property has been overridden
   */
  hasStyleOverrides(className: string, actualStyle: ShapeStyle): boolean {
    const diff = this.computeStyleDiff(className, actualStyle);
    return Object.keys(diff).length > 0;
  }

  /**
   * Register temporary classes from SVG file (session only)
   * These are not saved to app settings
   */
  registerTemporaryClasses(classes: StyleClass[]): void {
    for (const cls of classes) {
      // Only add if not already exists
      if (!this.classes.has(cls.name)) {
        this.classes.set(cls.name, {
          ...cls,
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isBuiltin: false // Temporary classes are treated as non-builtin
        });
      }
    }
    // Note: Do not save to settings - temporary classes are session only
  }

  /**
   * Clear temporary classes (e.g., when creating new file)
   */
  clearTemporaryClasses(): void {
    // Remove all non-builtin, non-custom classes (temporary ones)
    // For simplicity, reload from settings to reset to saved state
    this.loadFromSettings();
  }
}

// Singleton instance
export const styleClassManager = new StyleClassManager();

// Initialize on module load
styleClassManager.loadFromSettings().catch(console.error);
