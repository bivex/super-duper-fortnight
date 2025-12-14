import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Lazy Class code smell
 * Based on Z-specification: LazyClass
 */
export class LazyClassDetector extends CodeSmellDetector {
  getName() {
    return 'LazyClass';
  }

  getDescription() {
    return 'Class does too little to justify its existence';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Default thresholds from Z-specification
    const minLOC = thresholds.minLOC || 20;
    const minMethods = thresholds.minMethods || 2;
    const minResponsibilities = thresholds.minResponsibilities || 1;

    const totalLOC = class_.getTotalLOC();
    const trivialMethods = this.countTrivialMethods(class_);
    const realMethods = class_.methods.size - trivialMethods;

    // Detection logic from Z-specification
    const isDetected = totalLOC < minLOC && realMethods < minMethods;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (totalLOC < 10) {
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
      totalLOC,
      methodCount: class_.methods.size,
      realMethods,
      trivialMethods,
      responsibilities: this.analyzeResponsibilities(class_),
      minLOC,
      minMethods
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
   * Count trivial methods (getters/setters)
   */
  countTrivialMethods(class_) {
    let trivialCount = 0;

    for (const method of class_.methods) {
      if (this.isTrivialMethod(method)) {
        trivialCount++;
      }
    }

    return trivialCount;
  }

  /**
   * Check if a method is trivial (getter/setter or very simple)
   */
  isTrivialMethod(method) {
    // Check if it's a getter/setter by name
    const methodName = method.name.toString().toLowerCase();
    if (methodName.startsWith('get_') || methodName.startsWith('set_') ||
        methodName.startsWith('is_') || methodName.startsWith('has_')) {
      return method.loc <= 3; // Very short methods are likely trivial
    }

    // Check if method is very short and simple
    if (method.loc <= 2) {
      const content = method.lines.map(l => l.content).join(' ').toLowerCase();
      // Simple return or assignment
      if (content.includes('return ') || content.includes(' = ')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze class responsibilities
   */
  analyzeResponsibilities(class_) {
    const responsibilities = [];

    // Check for data management responsibility
    if (class_.fields.size > 0) {
      responsibilities.push('data_management');
    }

    // Check for behavior responsibilities based on method names
    const methodNames = Array.from(class_.methods).map(m => m.name.toString().toLowerCase());

    if (methodNames.some(name => name.includes('process') || name.includes('handle'))) {
      responsibilities.push('processing');
    }

    if (methodNames.some(name => name.includes('manage') || name.includes('control'))) {
      responsibilities.push('management');
    }

    if (methodNames.some(name => name.includes('calculate') || name.includes('compute'))) {
      responsibilities.push('computation');
    }

    if (methodNames.some(name => name.includes('draw') || name.includes('render'))) {
      responsibilities.push('rendering');
    }

    if (methodNames.some(name => name.includes('save') || name.includes('load'))) {
      responsibilities.push('persistence');
    }

    return responsibilities;
  }
}
