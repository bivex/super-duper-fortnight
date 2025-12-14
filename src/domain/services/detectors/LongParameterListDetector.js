import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Long Parameter List code smell
 * Based on Z-specification: LongParameterList
 */
export class LongParameterListDetector extends CodeSmellDetector {
  getName() {
    return 'LongParameterList';
  }

  getDescription() {
    return 'Method takes too many parameters or has parameters that are always used together';
  }

  detect(context, thresholds = {}) {
    // Only detect on methods
    if (!context.method) return null;
    const method = context.method;

    // Default thresholds from Z-specification
    const maxParams = thresholds.maxParams || 4;
    const maxRelatedParams = thresholds.maxRelatedParams || 3;

    const paramCount = method.parameters.length;

    // Check for related parameters (simplified - parameters with similar names)
    const relatedGroups = this.findRelatedParameterGroups(method.parameters);

    // Detection logic from Z-specification
    const isDetected = paramCount > maxParams || relatedGroups.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation based on parameter count
      if (paramCount > 7) {
        severity = 'High';
      } else if (paramCount > 4) {
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
      parameterCount: paramCount,
      relatedGroupsCount: relatedGroups.length,
      relatedGroups: relatedGroups,
      parameters: method.parameters.map(p => p.getSignature()),
      thresholds: { maxParams, maxRelatedParams }
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
   * Find groups of related parameters (simplified implementation)
   * In a real implementation, this would analyze usage patterns
   */
  findRelatedParameterGroups(parameters) {
    const groups = [];
    const paramNames = parameters.map(p => p.name.toString().toLowerCase());

    // Simple heuristic: parameters with common prefixes
    const prefixes = {};

    for (const paramName of paramNames) {
      const prefix = paramName.split('_')[0];
      if (!prefixes[prefix]) {
        prefixes[prefix] = [];
      }
      prefixes[prefix].push(paramName);
    }

    for (const [prefix, group] of Object.entries(prefixes)) {
      if (group.length >= 3) { // More than 3 parameters with same prefix
        groups.push({
          prefix,
          parameters: group,
          count: group.length
        });
      }
    }

    return groups;
  }
}
