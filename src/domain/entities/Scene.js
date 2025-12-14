import { Identifier } from '../value_objects/Identifier.js';

/**
 * Entity representing a Godot scene
 * Based on Z-specification references to scenes
 */
export class Scene {
  constructor(name, rootNode = null, childNodes = new Set(), scriptPath = null) {
    if (!(name instanceof Identifier)) {
      name = Identifier.from(name);
    }

    this.name = name;
    this.rootNode = rootNode; // Identifier ∪ {null}
    this.childNodes = new Set(childNodes); // ℙ Identifier
    this.scriptPath = scriptPath; // String ∪ {null}

    // Validate scene
    this.validate();

    Object.freeze(this);
  }

  validate() {
    if (!this.name || !(this.name instanceof Identifier)) {
      throw new Error('Scene must have a valid name');
    }
  }

  /**
   * Check if scene has a script attached
   */
  hasScript() {
    return this.scriptPath !== null;
  }

  /**
   * Get total number of nodes in scene
   */
  getTotalNodes() {
    return this.childNodes.size + (this.rootNode ? 1 : 0);
  }

  toString() {
    return `Scene: ${this.name} (nodes: ${this.getTotalNodes()}, script: ${this.hasScript() ? 'yes' : 'no'})`;
  }

  static from(name, rootNode = null, childNodes = [], scriptPath = null) {
    return new Scene(name, rootNode, new Set(childNodes), scriptPath);
  }
}
