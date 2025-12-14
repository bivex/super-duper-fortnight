/**
 * Value Object representing an identifier in GDScript
 * Immutable string wrapper for type safety
 */
export class Identifier {
  constructor(value) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('Identifier must be a non-empty string');
    }
    this.value = value;
    Object.freeze(this);
  }

  toString() {
    return this.value;
  }

  equals(other) {
    return other instanceof Identifier && this.value === other.value;
  }

  static from(value) {
    return new Identifier(value);
  }
}
