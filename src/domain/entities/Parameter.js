import { Identifier } from '../value_objects/Identifier.js';

/**
 * Entity representing a method parameter in GDScript
 * Based on Z-specification: Parameter
 */
export class Parameter {
  constructor(name, type = 'dynamic', defaultValue = null) {
    if (!(name instanceof Identifier)) {
      name = Identifier.from(name);
    }

    this.name = name;
    this.type = type; // Type ∪ {dynamic}
    this.defaultValue = defaultValue; // Value ∪ {none}

    // Validate parameter
    this.validate();

    Object.freeze(this);
  }

  validate() {
    if (!this.name || !(this.name instanceof Identifier)) {
      throw new Error('Parameter must have a valid name');
    }
  }

  /**
   * Check if parameter has a default value
   */
  hasDefaultValue() {
    return this.defaultValue !== null;
  }

  /**
   * Check if parameter is typed
   */
  isTyped() {
    return this.type !== 'dynamic';
  }

  /**
   * Get parameter signature
   */
  getSignature() {
    const typePart = this.isTyped() ? `: ${this.type}` : '';
    const defaultPart = this.hasDefaultValue() ? ` = ${this.defaultValue}` : '';
    return `${this.name}${typePart}${defaultPart}`;
  }

  toString() {
    return this.getSignature();
  }

  equals(other) {
    return other instanceof Parameter &&
           this.name.equals(other.name) &&
           this.type === other.type;
  }

  static from(name, type = 'dynamic', defaultValue = null) {
    return new Parameter(name, type, defaultValue);
  }
}
