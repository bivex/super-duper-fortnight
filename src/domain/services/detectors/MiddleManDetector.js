import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Middle Man code smell
 * Based on Z-specification: MiddleMan
 */
export class MiddleManDetector extends CodeSmellDetector {
  getName() {
    return 'MiddleMan';
  }

  getDescription() {
    return 'Class delegates most of its work to another class without adding value';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Default thresholds from Z-specification
    const maxDelegationRatio = thresholds.maxDelegationRatio || 0.5;

    const analysis = this.analyzeDelegation(class_);

    // Detection logic from Z-specification
    const isDetected = analysis.delegationRatio > maxDelegationRatio;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.delegationRatio > 0.8) {
        severity = 'High';
      } else if (analysis.delegationRatio > 0.5) {
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
      delegationRatio: Math.round(analysis.delegationRatio * 100) / 100,
      delegatingMethods: analysis.delegatingMethods,
      totalMethods: class_.methods.size,
      delegationTargets: analysis.delegationTargets,
      maxDelegationRatio
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
   * Analyze delegation patterns in a class
   */
  analyzeDelegation(class_) {
    const delegatingMethods = [];
    const delegationTargets = new Map();

    for (const method of class_.methods) {
      if (this.isDelegatingMethod(method, class_)) {
        delegatingMethods.push({
          name: method.name.toString(),
          loc: method.loc,
          target: this.getDelegationTarget(method)
        });

        const target = this.getDelegationTarget(method);
        if (target) {
          delegationTargets.set(target, (delegationTargets.get(target) || 0) + 1);
        }
      }
    }

    const delegationRatio = class_.methods.size > 0 ?
      delegatingMethods.length / class_.methods.size : 0;

    return {
      delegationRatio,
      delegatingMethods,
      delegationTargets: Array.from(delegationTargets.entries()).map(([target, count]) => ({
        target,
        count
      }))
    };
  }

  /**
   * Check if a method is primarily delegating
   */
  isDelegatingMethod(method, class_) {
    // Must be short (simple delegation)
    if (method.loc > 3) return false;

    // Must have exactly one method call
    const callCount = Array.from(method.calls).length;
    if (callCount !== 1) return false;

    // The call should be to a different class
    for (const call of method.calls) {
      const [caller, callee] = call;
      if (caller !== class_.name.toString()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the target class of delegation
   */
  getDelegationTarget(method) {
    for (const call of method.calls) {
      const [caller, callee] = call;
      // Extract class name from call (simplified)
      const parts = callee.split('.');
      if (parts.length >= 2) {
        return parts[0];
      }
    }
    return null;
  }
}
