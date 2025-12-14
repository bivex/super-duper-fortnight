import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Divergent Change code smell
 * Based on Z-specification: DivergentChange
 */
export class DivergentChangeDetector extends CodeSmellDetector {
  getName() {
    return 'DivergentChange';
  }

  getDescription() {
    return 'Class requires changes for different reasons, indicating low cohesion';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Default thresholds from Z-specification
    const maxReasons = thresholds.maxReasons || 3;

    // Analyze change reasons by grouping methods by semantic purpose
    const changeReasons = this.analyzeChangeReasons(class_);

    // Detection logic from Z-specification
    const isDetected = changeReasons.length > maxReasons;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (changeReasons.length > 7) {
        severity = 'Critical';
      } else if (changeReasons.length > 5) {
        severity = 'High';
      } else if (changeReasons.length > 3) {
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
      changeReasonsCount: changeReasons.length,
      changeReasons: changeReasons,
      maxReasons,
      methodsCount: class_.methods.size,
      fieldsCount: class_.fields.size
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
   * Analyze change reasons by grouping methods semantically
   */
  analyzeChangeReasons(class_) {
    const reasons = [];
    const methods = Array.from(class_.methods);

    // Group methods by naming patterns (simplified heuristic)
    const groups = {
      getters: [],
      setters: [],
      processors: [],
      handlers: [],
      utilities: [],
      managers: []
    };

    for (const method of methods) {
      const methodName = method.name.toString().toLowerCase();

      if (methodName.startsWith('get_') || methodName.startsWith('is_') || methodName.startsWith('has_')) {
        groups.getters.push(method);
      } else if (methodName.startsWith('set_')) {
        groups.setters.push(method);
      } else if (methodName.includes('process') || methodName.includes('update') || methodName.includes('calculate')) {
        groups.processors.push(method);
      } else if (methodName.includes('handle') || methodName.includes('on_') || methodName.includes('callback')) {
        groups.handlers.push(method);
      } else if (methodName.includes('util') || methodName.includes('helper') || methodName.includes('tool')) {
        groups.utilities.push(method);
      } else if (methodName.includes('manage') || methodName.includes('control') || methodName.includes('direct')) {
        groups.managers.push(method);
      }
    }

    // Create change reasons for groups with multiple methods
    for (const [reason, methodGroup] of Object.entries(groups)) {
      if (methodGroup.length >= 2) {
        reasons.push({
          description: `${reason} functionality`,
          affectedMethods: methodGroup.map(m => m.name.toString()),
          affectedFields: this.findRelatedFields(class_, methodGroup),
          methodCount: methodGroup.length
        });
      }
    }

    // If no clear grouping, consider it as divergent
    if (reasons.length === 0 && methods.length > 5) {
      reasons.push({
        description: 'Unorganized functionality',
        affectedMethods: methods.map(m => m.name.toString()),
        affectedFields: Array.from(class_.fields),
        methodCount: methods.length
      });
    }

    return reasons;
  }

  /**
   * Find fields related to a group of methods
   */
  findRelatedFields(class_, methods) {
    const relatedFields = new Set();
    const methodNames = methods.map(m => m.name.toString().toLowerCase());

    for (const field of class_.fields) {
      const fieldName = field.toString().toLowerCase();

      // Check if field name appears in method names or vice versa
      for (const methodName of methodNames) {
        if (methodName.includes(fieldName) || fieldName.includes(methodName.split('_')[0])) {
          relatedFields.add(field.toString());
          break;
        }
      }
    }

    return Array.from(relatedFields);
  }
}
