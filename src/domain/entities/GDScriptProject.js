import { Class } from './Class.js';
import { Scene } from './Scene.js';

/**
 * Entity representing a complete GDScript project
 * Based on Z-specification: GDScriptProject
 */
export class GDScriptProject {
  constructor(classes = new Set(), scenes = new Set(), autoloads = new Set(), signals = new Set()) {
    this.classes = new Set(classes); // ℙ Class
    this.scenes = new Set(scenes); // ℙ Scene
    this.autoloads = new Set(autoloads); // ℙ Class
    this.signals = new Set(signals); // ℙ Signal

    // Validate project
    this.validate();

    // Build class hierarchy relationships
    this.buildClassHierarchy();

    Object.freeze(this);
  }

  validate() {
    // Invariant from Z-specification:
    // ∀ c : autoloads • c ∈ classes ∧ c.autoload = true
    for (const autoload of this.autoloads) {
      if (!this.classes.has(autoload) || !autoload.autoload) {
        throw new Error(`Autoload class ${autoload.name} must be in classes and have autoload=true`);
      }
    }
  }

  /**
   * Build class hierarchy by setting parent-child relationships
   */
  buildClassHierarchy() {
    const classesArray = Array.from(this.classes);

    for (const childClass of classesArray) {
      if (childClass.parent) {
        const parentClass = classesArray.find(c => c.name.equals(childClass.parent));
        if (parentClass) {
          // Note: In a real implementation, we'd need to make this mutable
          // For now, we'll skip this as the entities are frozen
        }
      }
    }
  }

  /**
   * Get all classes except autoloads
   */
  getRegularClasses() {
    return new Set(Array.from(this.classes).filter(c => !this.autoloads.has(c)));
  }

  /**
   * Find class by name
   */
  findClass(name) {
    return Array.from(this.classes).find(c => c.name.toString() === name);
  }

  /**
   * Get total lines of code in project
   */
  getTotalLOC() {
    return Array.from(this.classes).reduce((total, class_) => total + class_.getTotalLOC(), 0);
  }

  /**
   * Get project statistics
   */
  getStatistics() {
    return {
      totalClasses: this.classes.size,
      totalScenes: this.scenes.size,
      autoloads: this.autoloads.size,
      totalLOC: this.getTotalLOC(),
      averageLOCPeerClass: this.classes.size > 0 ? this.getTotalLOC() / this.classes.size : 0
    };
  }

  toString() {
    const stats = this.getStatistics();
    return `GDScriptProject: ${stats.totalClasses} classes, ${stats.totalScenes} scenes, ${stats.autoloads} autoloads, ${stats.totalLOC} LOC`;
  }

  static from(classes = [], scenes = [], autoloads = [], signals = []) {
    return new GDScriptProject(
      new Set(classes),
      new Set(scenes),
      new Set(autoloads),
      new Set(signals)
    );
  }
}
