import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Speculative Generality code smell
 * Based on Z-specification: SpeculativeGenerality
 */
export class SpeculativeGeneralityDetector extends CodeSmellDetector {
  getName() {
    return 'SpeculativeGenerality';
  }

  getDescription() {
    return 'Code designed for future functionality that never materializes';
  }

  detect(context, thresholds = {}) {
    // Can detect on classes or projects
    const target = context.class || context.project;
    if (!target) return null;

    // Default thresholds from Z-specification
    const unusedMethods = thresholds.unusedMethods || 0;
    const unusedParameters = thresholds.unusedParameters || 0;

    const analysis = this.analyzeSpeculativeGenerality(target, context);

    // Detection logic from Z-specification
    const isDetected = analysis.unusedMethods.length > unusedMethods ||
                      analysis.unusedParameters.length > unusedParameters ||
                      analysis.abstractWithFewSubclasses;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.unusedMethods.length > 5) {
        severity = 'High';
      } else if (analysis.unusedMethods.length > 2 || analysis.unusedParameters.length > 3) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = context.class ?
      { class: context.class.name.toString(), file: context.filePath } :
      { project: context.project.name || 'Unknown Project' };

    const details = {
      unusedMethods: analysis.unusedMethods,
      unusedParameters: analysis.unusedParameters,
      abstractWithFewSubclasses: analysis.abstractWithFewSubclasses,
      inheritanceAnalysis: analysis.inheritanceAnalysis,
      thresholds: { unusedMethods, unusedParameters }
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
   * Analyze speculative generality patterns
   */
  analyzeSpeculativeGenerality(target, context) {
    if (context.class) {
      return this.analyzeClassSpeculativeGenerality(context.class, context.project);
    } else {
      return this.analyzeProjectSpeculativeGenerality(context.project);
    }
  }

  /**
   * Analyze speculative generality in a class
   */
  analyzeClassSpeculativeGenerality(class_, project) {
    const unusedMethods = [];
    const unusedParameters = [];

    // Find unused methods (simplified - methods not called by other methods)
    const calledMethods = new Set();
    for (const method of class_.methods) {
      for (const call of method.calls) {
        calledMethods.add(call);
      }
    }

    for (const method of class_.methods) {
      const methodKey = `${class_.name}.${method.name}`;
      if (!calledMethods.has(methodKey) && !this.isEntryPoint(method)) {
        unusedMethods.push({
          name: method.name.toString(),
          loc: method.loc,
          reason: 'Method is never called within the class'
        });
      }
    }

    // Find unused parameters
    for (const method of class_.methods) {
      for (const param of method.parameters) {
        if (this.isUnusedParameter(param, method)) {
          unusedParameters.push({
            method: method.name.toString(),
            parameter: param.name.toString(),
            type: param.type
          });
        }
      }
    }

    // Check for abstract classes with few subclasses
    const abstractWithFewSubclasses = this.checkAbstractWithFewSubclasses(class_, project);

    return {
      unusedMethods,
      unusedParameters,
      abstractWithFewSubclasses,
      inheritanceAnalysis: abstractWithFewSubclasses ? {
        class: class_.name.toString(),
        subclassCount: this.countSubclasses(class_, project),
        isAbstract: this.isAbstract(class_)
      } : null
    };
  }

  /**
   * Analyze speculative generality at project level
   */
  analyzeProjectSpeculativeGenerality(project) {
    let totalUnusedMethods = [];
    let totalUnusedParameters = [];
    let abstractWithFewSubclasses = false;

    for (const class_ of project.classes) {
      const classAnalysis = this.analyzeClassSpeculativeGenerality(class_, project);
      totalUnusedMethods.push(...classAnalysis.unusedMethods);
      totalUnusedParameters.push(...classAnalysis.unusedParameters);
      if (classAnalysis.abstractWithFewSubclasses) {
        abstractWithFewSubclasses = true;
      }
    }

    return {
      unusedMethods: totalUnusedMethods,
      unusedParameters: totalUnusedParameters,
      abstractWithFewSubclasses
    };
  }

  /**
   * Check if a method is an entry point (likely to be called externally)
   */
  isEntryPoint(method) {
    const methodName = method.name.toString().toLowerCase();
    // Common Godot entry points
    return ['_ready', '_process', '_physics_process', '_input', '_unhandled_input'].includes(methodName) ||
           methodName.startsWith('_on_') || // Signal handlers
           methodName.startsWith('public_'); // Explicitly public methods
  }

  /**
   * Check if a parameter is unused in its method
   */
  isUnusedParameter(parameter, method) {
    const paramName = parameter.name.toString();

    for (const line of method.lines) {
      // Simple check if parameter name appears in the method body
      if (line.content.includes(paramName)) {
        // Could be more sophisticated - check if it's actually used vs just mentioned
        return false;
      }
    }

    return true;
  }

  /**
   * Check if class is abstract (simplified check)
   */
  isAbstract(class_) {
    // In GDScript, abstract classes are not explicitly declared,
    // but may have methods that are meant to be overridden
    for (const method of class_.methods) {
      if (method.loc <= 2) { // Very short methods might be abstract placeholders
        const content = method.lines.map(l => l.content).join(' ').toLowerCase();
        if (content.includes('pass') || content.includes('placeholder') || content.trim() === '') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Count subclasses of a class
   */
  countSubclasses(class_, project) {
    let count = 0;
    for (const otherClass of project.classes) {
      if (otherClass.parent && otherClass.parent.equals(class_.name)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Check for abstract classes with few subclasses
   */
  checkAbstractWithFewSubclasses(class_, project) {
    return this.isAbstract(class_) && this.countSubclasses(class_, project) <= 1;
  }
}
