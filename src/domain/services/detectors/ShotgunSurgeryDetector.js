import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Shotgun Surgery code smell
 * Based on Z-specification: ShotgunSurgery
 */
export class ShotgunSurgeryDetector extends CodeSmellDetector {
  getName() {
    return 'ShotgunSurgery';
  }

  getDescription() {
    return 'Single change requires modifications across many different classes';
  }

  detect(context, thresholds = {}) {
    // Only detect on projects
    if (!context.project) return null;
    const project = context.project;

    // Default thresholds from Z-specification
    const maxClasses = thresholds.maxClasses || 3;

    // Analyze potential shotgun surgery patterns
    const shotgunSurgeries = this.analyzeShotgunSurgery(project);

    // Detection logic from Z-specification
    const isDetected = shotgunSurgeries.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      const maxAffectedClasses = Math.max(...shotgunSurgeries.map(s => s.affectedClasses.length));
      if (maxAffectedClasses > 8) {
        severity = 'Critical';
      } else if (maxAffectedClasses > 5) {
        severity = 'High';
      } else if (maxAffectedClasses > 3) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      project: project.name || 'Unknown Project'
    };

    const details = {
      shotgunSurgeriesCount: shotgunSurgeries.length,
      shotgunSurgeries: shotgunSurgeries,
      maxClasses,
      totalClasses: project.classes.size
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
   * Analyze potential shotgun surgery patterns in the project
   */
  analyzeShotgunSurgery(project) {
    const surgeries = [];
    const classes = Array.from(project.classes);

    // Look for classes that reference many other classes
    for (const class_ of classes) {
      const references = this.findClassReferences(class_, project);

      if (references.length > 3) { // More than 3 class references
        surgeries.push({
          affectedClass: class_.name.toString(),
          affectedClasses: references,
          referenceCount: references.length,
          description: `Class ${class_.name} references ${references.length} other classes`
        });
      }
    }

    // Look for methods that are called from many different classes
    const methodCallers = this.analyzeMethodCallers(project);

    for (const [methodKey, callers] of Object.entries(methodCallers)) {
      if (callers.length > 4) { // Method called from more than 4 different classes
        surgeries.push({
          method: methodKey,
          affectedClasses: callers,
          callerCount: callers.length,
          description: `Method ${methodKey} is called from ${callers.length} different classes`
        });
      }
    }

    return surgeries;
  }

  /**
   * Find classes referenced by a given class
   */
  findClassReferences(class_, project) {
    const references = new Set();

    for (const method of class_.methods) {
      // Check method calls for references to other classes
      for (const call of method.calls) {
        // This is a simplified check - in reality we'd need to analyze the AST
        const callStr = Array.from(call).join('.');
        for (const otherClass of project.classes) {
          if (otherClass !== class_ && callStr.includes(otherClass.name.toString())) {
            references.add(otherClass.name.toString());
          }
        }
      }
    }

    return Array.from(references);
  }

  /**
   * Analyze which classes call which methods
   */
  analyzeMethodCallers(project) {
    const methodCallers = {};

    for (const class_ of project.classes) {
      for (const method of class_.methods) {
        for (const call of method.calls) {
          const callStr = Array.from(call).join('.');
          const methodKey = `${class_.name}.${method.name}`;

          if (!methodCallers[methodKey]) {
            methodCallers[methodKey] = [];
          }

          // Find which classes this method might be called from
          for (const otherClass of project.classes) {
            if (otherClass !== class_) {
              for (const otherMethod of otherClass.methods) {
                // Simplified check for method calls
                const hasCall = otherMethod.calls.has(call);
                if (hasCall && !methodCallers[methodKey].includes(otherClass.name.toString())) {
                  methodCallers[methodKey].push(otherClass.name.toString());
                }
              }
            }
          }
        }
      }
    }

    return methodCallers;
  }
}
