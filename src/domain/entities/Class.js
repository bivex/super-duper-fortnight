import { Identifier } from '../value_objects/Identifier.js';
import { Method } from './Method.js';

/**
 * Entity representing a class in GDScript
 * Based on Z-specification: Class
 */
export class Class {
  constructor(name, fields = new Set(), methods = new Set(), parent = null, exportedVars = new Set(), autoload = false, filePath = null) {
    if (!(name instanceof Identifier)) {
      name = Identifier.from(name);
    }

    this.name = name;
    this.fields = new Set(fields); // ℙ Identifier
    this.methods = new Set(methods); // ℙ Method
    this.parent = parent; // Identifier ∪ {null}
    this.children = new Set(); // ℙ Identifier - calculated later
    this.autoload = autoload; // 𝔹
    this.exportedVars = new Set(exportedVars); // ℙ Identifier
    this.filePath = filePath; // String - path to the source file

    // Validate class
    this.validate();

    Object.freeze(this);
  }

  validate() {
    if (!this.name || !(this.name instanceof Identifier)) {
      throw new Error('Class must have a valid name');
    }

    if (!(this.fields instanceof Set)) {
      throw new Error('Class fields must be a Set');
    }

    if (!(this.methods instanceof Set)) {
      throw new Error('Class methods must be a Set');
    }
  }

  /**
   * Get total lines of code in class
   */
  getTotalLOC() {
    return Array.from(this.methods).reduce((total, method) => total + method.loc, 0);
  }

  /**
   * Get all method names
   */
  getMethodNames() {
    return Array.from(this.methods).map(method => method.name.toString());
  }

  /**
   * Check if class has a specific method
   */
  hasMethod(methodName) {
    return this.getMethodNames().includes(methodName);
  }

  /**
   * Get method by name
   */
  getMethod(methodName) {
    return Array.from(this.methods).find(method => method.name.toString() === methodName);
  }

  /**
   * Check if class is a parent of another class
   */
  isParentOf(childClass) {
    return childClass.parent && childClass.parent.equals(this.name);
  }

  /**
   * Check if class has exported variables
   */
  hasExportedVars() {
    return this.exportedVars.size > 0;
  }

  /**
   * Calculate Coupling Between Objects (CBO) metric
   */
  calculateCBO(projectClasses) {
    const otherClasses = Array.from(projectClasses).filter(c => !c.name.equals(this.name));
    let coupling = 0;

    for (const otherClass of otherClasses) {
      // Check if this class uses otherClass
      const usesOtherClass = Array.from(this.methods).some(method =>
        method.calls.has(`${this.name}.${otherClass.name}`) ||
        method.accessedFields.has(`${otherClass.name}`)
      );

      // Check if otherClass uses this class
      const usedByOtherClass = Array.from(otherClass.methods).some(method =>
        method.calls.has(`${otherClass.name}.${this.name}`) ||
        method.accessedFields.has(`${this.name}`)
      );

      if (usesOtherClass || usedByOtherClass) {
        coupling++;
      }
    }

    return coupling;
  }

  /**
   * Calculate Lack of Cohesion of Methods (LCOM) metric
   */
  calculateLCOM() {
    if (this.methods.size <= 1) return 0;

    const methodsArray = Array.from(this.methods);
    let sharedFieldPairs = 0;
    let totalPairs = 0;

    // Calculate pairs of methods
    for (let i = 0; i < methodsArray.length; i++) {
      for (let j = i + 1; j < methodsArray.length; j++) {
        totalPairs++;

        const method1 = methodsArray[i];
        const method2 = methodsArray[j];

        // Check if methods share field access
        const sharedFields = new Set();
        for (const field of this.fields) {
          const fieldName = field.toString();
          if (method1.accessesField(this.name.toString(), fieldName) &&
              method2.accessesField(this.name.toString(), fieldName)) {
            sharedFields.add(fieldName);
          }
        }

        if (sharedFields.size > 0) {
          sharedFieldPairs++;
        }
      }
    }

    // LCOM = |P - Q| where P is pairs without shared fields, Q is pairs with shared fields
    const P = totalPairs - sharedFieldPairs;
    const Q = sharedFieldPairs;

    return Math.max(P - Q, 0);
  }

  toString() {
    return `Class: ${this.name} (fields: ${this.fields.size}, methods: ${this.methods.size}, LOC: ${this.getTotalLOC()})`;
  }

  static from(name, fields = [], methods = [], parent = null, exportedVars = [], autoload = false) {
    return new Class(
      name,
      new Set(fields),
      new Set(methods),
      parent,
      new Set(exportedVars),
      autoload
    );
  }
}
