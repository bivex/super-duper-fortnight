import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Large Class / God Object code smell
 * Based on Z-specification: LargeClass
 */
export class LargeClassDetector extends CodeSmellDetector {
  getName() {
    return 'LargeClass';
  }

  getDescription() {
    return 'Class has too many fields, methods or lines of code, violating single responsibility principle';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;
    // Default thresholds from Z-specification
    const maxFields = thresholds.maxFields || 15;
    const maxMethods = thresholds.maxMethods || 20;
    const maxLOC = thresholds.maxLOC || 400;
    const maxExports = thresholds.maxExports || 10;

    const fieldCount = class_.fields.size;
    const methodCount = class_.methods.size;
    const totalLOC = class_.getTotalLOC();
    const exportCount = class_.exportedVars.size;

    // Detection logic from Z-specification
    const isDetected = fieldCount > maxFields ||
                      methodCount > maxMethods ||
                      totalLOC > maxLOC ||
                      exportCount > maxExports;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (totalLOC > 1000 || methodCount > 50) {
        severity = 'Critical';
      } else if (totalLOC > 600 || methodCount > 30) {
        severity = 'High';
      } else if (totalLOC > 400 || methodCount > 20) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      class: class_.name.toString(),
      file: context.filePath
    };

    const details = {
      fieldCount,
      methodCount,
      totalLOC,
      exportCount,
      thresholds: { maxFields, maxMethods, maxLOC, maxExports }
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
