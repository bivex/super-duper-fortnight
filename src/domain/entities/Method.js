import { Identifier } from '../value_objects/Identifier.js';
import { CodeLine } from '../value_objects/CodeLine.js';
import { Parameter } from './Parameter.js';

/**
 * Entity representing a method in GDScript
 * Based on Z-specification: Method
 */
export class Method {
  constructor(name, parameters = [], lines = [], calls = new Set(), accessedFields = new Set()) {
    if (!(name instanceof Identifier)) {
      name = Identifier.from(name);
    }

    this.name = name;
    this.parameters = [...parameters]; // seq Parameter
    this.lines = [...lines]; // seq CodeLine
    this.calls = new Set(calls); // ℙ(Identifier × Identifier) - (caller, callee) pairs
    this.accessedFields = new Set(accessedFields); // ℙ(Identifier × Identifier) - (class, field) pairs

    // Derived properties are accessed via getters

    // Validate method
    this.validate();

    Object.freeze(this);
  }

  validate() {
    if (!this.name || !(this.name instanceof Identifier)) {
      throw new Error('Method must have a valid name');
    }

    if (!Array.isArray(this.parameters)) {
      throw new Error('Method parameters must be an array');
    }

    if (!Array.isArray(this.lines)) {
      throw new Error('Method lines must be an array');
    }
  }

  /**
   * Calculate cyclomatic complexity based on Z-specification
   * CC = 1 + number of decision points (if, elif, while, for, match, and, or)
   */
  calculateCyclomaticComplexity() {
    let complexity = 1; // Base complexity

    const decisionKeywords = ['if', 'elif', 'while', 'for', 'match', 'and', 'or'];

    for (const line of this.lines) {
      for (const keyword of decisionKeywords) {
        if (line.contains(keyword)) {
          complexity++;
          break; // Count each decision line only once
        }
      }
    }

    return complexity;
  }

  /**
   * Count yield/await statements
   */
  getYieldCount() {
    return this.lines.filter(line => line.hasYieldOrAwait()).length;
  }

  /**
   * Get lines of code (LOC)
   */
  get loc() {
    return this.lines.length;
  }

  /**
   * Get cyclomatic complexity
   */
  get cyclomaticComplexity() {
    return this.calculateCyclomaticComplexity();
  }

  /**
   * Check if method is a getter or setter
   */
  isGetterOrSetter() {
    const content = this.lines.map(l => l.content).join(' ');
    return this.loc <= 3 &&
           (content.includes('return ') || content.includes('= ')) &&
           (this.name.toString().startsWith('get_') || this.name.toString().startsWith('set_'));
  }

  /**
   * Get method signature
   */
  getSignature() {
    const params = this.parameters.map(p => p.getSignature()).join(', ');
    return `${this.name}(${params})`;
  }

  /**
   * Check if method calls another method
   */
  callsMethod(calleeName) {
    return Array.from(this.calls).some(([caller, callee]) => callee === calleeName);
  }

  /**
   * Check if method accesses a field
   */
  accessesField(className, fieldName) {
    return this.accessedFields.has(`${className}.${fieldName}`);
  }

  toString() {
    return `Method: ${this.getSignature()} (LOC: ${this.loc}, CC: ${this.cyclomaticComplexity})`;
  }

  static from(name, parameters = [], lines = [], calls = [], accessedFields = []) {
    return new Method(name, parameters, lines, calls, accessedFields);
  }
}
