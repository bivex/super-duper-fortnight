/**
 * Interface for code smell detectors
 * Defines the contract for all smell detection algorithms
 */
export class CodeSmellDetector {
  /**
   * Detect code smells in the given target
   * @param {Method|Class|GDScriptProject} target - The code element to analyze
   * @param {Object} thresholds - Configuration thresholds
   * @returns {CodeSmellResult} Detection result
   */
  detect(target, thresholds = {}) {
    throw new Error('CodeSmellDetector.detect() must be implemented by subclass');
  }

  /**
   * Get the name of this detector
   */
  getName() {
    throw new Error('CodeSmellDetector.getName() must be implemented by subclass');
  }

  /**
   * Get the description of what this detector checks
   */
  getDescription() {
    throw new Error('CodeSmellDetector.getDescription() must be implemented by subclass');
  }
}

/**
 * Result of a code smell detection
 */
export class CodeSmellResult {
  constructor(smellName, detected, severity = null, location = null, details = {}) {
    this.smellName = smellName;
    this.detected = detected; // 𝔹 - whether smell was detected
    this.severity = severity; // {Low, Medium, High, Critical} ∪ {null}
    this.location = location; // Location info (file, line, class, method)
    this.details = details; // Additional detection details
    Object.freeze(this);
  }

  /**
   * Check if this is a positive detection
   */
  isDetected() {
    return this.detected;
  }

  /**
   * Get severity level as number for sorting
   */
  getSeverityLevel() {
    const levels = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
    return levels[this.severity] || 0;
  }

  toString() {
    if (!this.detected) {
      return `${this.smellName}: Not detected`;
    }

    return `${this.smellName} (${this.severity}): ${this.location || 'Unknown location'}`;
  }
}
