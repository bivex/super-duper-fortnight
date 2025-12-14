import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Refused Bequest code smell
 * Based on Z-specification: RefusedBequest
 */
export class RefusedBequestDetector extends CodeSmellDetector {
  getName() {
    return 'RefusedBequest';
  }

  getDescription() {
    return 'Subclass does not use most of the functionality inherited from its parent class';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Skip if class has no parent
    if (!class_.parent) return null;

    // Default thresholds from Z-specification
    const usageRatio = thresholds.usageRatio || 0.3;
    const overriddenEmpty = thresholds.overriddenEmpty || 0;

    const analysis = this.analyzeInheritanceUsage(class_, context.project);

    // Detection logic from Z-specification
    const isDetected = analysis.usageRatio < usageRatio || analysis.overriddenEmpty.length > overriddenEmpty;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.usageRatio < 0.2 || analysis.overriddenEmpty.length > 5) {
        severity = 'High';
      } else if (analysis.usageRatio < 0.3 || analysis.overriddenEmpty.length > 3) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      class: class_.name.toString(),
      parent: class_.parent.toString(),
      file: context.filePath
    };

    const details = {
      usageRatio: Math.round(analysis.usageRatio * 100) / 100,
      usedMethods: analysis.usedMethods,
      totalParentMethods: analysis.totalParentMethods,
      overriddenEmpty: analysis.overriddenEmpty,
      inheritanceAnalysis: analysis,
      thresholds: { usageRatio, overriddenEmpty }
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
   * Analyze how a subclass uses its parent class
   */
  analyzeInheritanceUsage(subclass, project) {
    // Find parent class
    const parentClass = Array.from(project.classes).find(c => c.name.equals(subclass.parent));
    if (!parentClass) {
      return {
        usageRatio: 1.0,
        usedMethods: [],
        totalParentMethods: 0,
        overriddenEmpty: []
      };
    }

    const usedMethods = [];
    const overriddenEmpty = [];

    // Check which parent methods are used by subclass
    for (const parentMethod of parentClass.methods) {
      const isUsed = this.isMethodUsedBySubclass(parentMethod, subclass);
      const isOverridden = this.isMethodOverridden(parentMethod, subclass);

      if (isUsed) {
        usedMethods.push(parentMethod.name.toString());
      }

      if (isOverridden) {
        const overriddenMethod = subclass.getMethod(parentMethod.name.toString());
        if (overriddenMethod && this.isEmptyOverride(overriddenMethod)) {
          overriddenEmpty.push({
            method: parentMethod.name.toString(),
            loc: overriddenMethod.loc
          });
        }
      }
    }

    const usageRatio = parentClass.methods.size > 0 ?
      usedMethods.length / parentClass.methods.size : 0;

    return {
      usageRatio,
      usedMethods,
      totalParentMethods: parentClass.methods.size,
      overriddenEmpty
    };
  }

  /**
   * Check if a parent method is used by the subclass
   */
  isMethodUsedBySubclass(parentMethod, subclass) {
    for (const method of subclass.methods) {
      // Check if method calls the parent method
      for (const call of method.calls) {
        const [caller, callee] = call;
        if (callee === `${subclass.parent}.${parentMethod.name}` ||
            callee === `super.${parentMethod.name}` ||
            callee === parentMethod.name.toString()) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if a parent method is overridden by the subclass
   */
  isMethodOverridden(parentMethod, subclass) {
    return subclass.getMethod(parentMethod.name.toString()) !== undefined;
  }

  /**
   * Check if an overridden method is empty (just calls super or does nothing)
   */
  isEmptyOverride(method) {
    if (method.loc <= 2) {
      const content = method.lines.map(l => l.content).join(' ').toLowerCase().trim();

      // Empty or just calls super/parent
      return content === '' ||
             content === 'pass' ||
             content.includes('super.') ||
             content.includes('super(') ||
             content.includes('.call(');
    }

    return false;
  }
}
