import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Feature Envy code smell
 * Based on Z-specification: FeatureEnvy
 */
export class FeatureEnvyDetector extends CodeSmellDetector {
  getName() {
    return 'FeatureEnvy';
  }

  getDescription() {
    return 'Method accesses data from another class more than its own class';
  }

  detect(context, thresholds = {}) {
    // Only detect on methods
    if (!context.method) return null;
    const method = context.method;
    const ownerClass = context.ownerClass;

    // Default thresholds from Z-specification
    const envyRatio = thresholds.envyRatio || 2.0;

    if (!ownerClass) return null;

    // Analyze field access patterns
    const analysis = this.analyzeFieldAccess(method, ownerClass);

    // Detection logic from Z-specification
    const isDetected = analysis.envyRatio > envyRatio && analysis.foreignAccessCount > 3;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.envyRatio > 5.0) {
        severity = 'Critical';
      } else if (analysis.envyRatio > 3.5) {
        severity = 'High';
      } else if (analysis.envyRatio > 2.0) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      class: ownerClass.name.toString(),
      method: method.name.toString(),
      file: context.filePath
    };

    const details = {
      envyRatio: Math.round(analysis.envyRatio * 100) / 100,
      localAccessCount: analysis.localAccessCount,
      foreignAccessCount: analysis.foreignAccessCount,
      foreignClasses: analysis.foreignClasses,
      thresholds: { envyRatio }
    };

    return new CodeSmellResult(
      this.getName(),
      isDetected,
      severity,
      location,
      details
    );
  }

  /**
   * Analyze field access patterns in a method
   */
  analyzeFieldAccess(method, ownerClass) {
    const localAccess = new Set();
    const foreignAccess = new Map(); // class -> field count

    // Analyze accessed fields (simplified - in reality this would come from AST analysis)
    for (const [accessor, field] of method.accessedFields) {
      if (accessor === ownerClass.name.toString()) {
        localAccess.add(field);
      } else {
        if (!foreignAccess.has(accessor)) {
          foreignAccess.set(accessor, new Set());
        }
        foreignAccess.get(accessor).add(field);
      }
    }

    // Calculate envy ratio
    const localAccessCount = localAccess.size;
    const foreignAccessCount = Array.from(foreignAccess.values())
      .reduce((total, fields) => total + fields.size, 0);

    const envyRatio = foreignAccessCount / (localAccessCount + 1);

    // Get foreign classes
    const foreignClasses = Array.from(foreignAccess.entries()).map(([className, fields]) => ({
      class: className,
      fieldsAccessed: Array.from(fields),
      fieldCount: fields.size
    }));

    return {
      localAccessCount,
      foreignAccessCount,
      envyRatio,
      foreignClasses
    };
  }
}
