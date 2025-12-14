import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Long Method code smell
 * Based on Z-specification: LongMethod
 */
export class LongMethodDetector extends CodeSmellDetector {
  getName() {
    return 'LongMethod';
  }

  getDescription() {
    return 'Method contains too many lines of code or has high cyclomatic complexity';
  }

  detect(context, thresholds = {}) {
    // Only detect on methods
    if (!context.method) return null;
    const method = context.method;
    // Default thresholds from Z-specification
    const maxLines = thresholds.maxLines || 50;
    const maxComplexity = thresholds.maxComplexity || 10;
    const maxYields = thresholds.maxYields || 7;

    const loc = method.loc;
    const complexity = method.cyclomaticComplexity;
    const yieldCount = method.getYieldCount();

    // Detection logic from Z-specification
    const isDetected = loc > maxLines ||
                      complexity > maxComplexity ||
                      yieldCount > maxYields;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (loc > 200 || complexity > 30) {
        severity = 'Critical';
      } else if (loc > 100 || complexity > 20) {
        severity = 'High';
      } else if (loc > 50 || complexity > 10) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      class: context.ownerClass?.name?.toString(),
      method: method.name.toString(),
      file: context.filePath
    };

    const details = {
      linesOfCode: loc,
      cyclomaticComplexity: complexity,
      yieldCount: yieldCount,
      thresholds: { maxLines, maxComplexity, maxYields }
    };

    return new CodeSmellResult(
      this.getName(),
      isDetected,
      severity,
      location,
      details
    );
  }
}
