import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Data Class code smell
 * Based on Z-specification: DataClass
 */
export class DataClassDetector extends CodeSmellDetector {
  getName() {
    return 'DataClass';
  }

  getDescription() {
    return 'Class contains only data fields and simple access methods without business logic';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Default thresholds from Z-specification
    const behaviorMethods = thresholds.behaviorMethods || 0;
    const publicFields = thresholds.publicFields || 0;

    const analysis = this.analyzeDataClass(class_);

    // Detection logic from Z-specification
    const isDetected = analysis.behaviorMethods.length === behaviorMethods &&
                      (analysis.publicFields.length > publicFields || class_.fields.size > 3);

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.publicFields.length > 5) {
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
      behaviorMethods: analysis.behaviorMethods,
      publicFields: analysis.publicFields,
      totalFields: class_.fields.size,
      totalMethods: class_.methods.size,
      fieldRatio: class_.fields.size / (class_.methods.size + class_.fields.size),
      analysis
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
   * Analyze if a class is a data class
   */
  analyzeDataClass(class_) {
    const behaviorMethods = [];
    const publicFields = [];

    // Analyze fields
    for (const field of class_.fields) {
      // In GDScript, fields are typically public unless prefixed with _
      // For this analysis, assume all fields are public
      publicFields.push(field.toString());
    }

    // Analyze methods
    for (const method of class_.methods) {
      if (!this.isAccessorMethod(method)) {
        behaviorMethods.push({
          name: method.name.toString(),
          loc: method.loc,
          complexity: method.cyclomaticComplexity
        });
      }
    }

    return {
      behaviorMethods,
      publicFields,
      isDataClass: behaviorMethods.length === 0 && (publicFields.length > 0 || class_.fields.size > 3)
    };
  }

  /**
   * Check if a method is an accessor (getter/setter)
   */
  isAccessorMethod(method) {
    const methodName = method.name.toString().toLowerCase();

    // Check naming patterns
    if (methodName.startsWith('get_') || methodName.startsWith('set_') ||
        methodName.startsWith('is_') || methodName.startsWith('has_')) {
      return true;
    }

    // Check if method is very simple (likely an accessor)
    if (method.loc <= 3) {
      const content = method.lines.map(l => l.content).join(' ').toLowerCase();
      // Simple return or assignment
      if (content.includes('return ') && !content.includes('calculate') && !content.includes('process')) {
        return true;
      }
    }

    return false;
  }
}
