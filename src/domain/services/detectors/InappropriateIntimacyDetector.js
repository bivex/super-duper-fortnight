import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Inappropriate Intimacy code smell
 * Based on Z-specification: InappropriateIntimacy
 */
export class InappropriateIntimacyDetector extends CodeSmellDetector {
  getName() {
    return 'InappropriateIntimacy';
  }

  getDescription() {
    return 'Two classes are too tightly coupled and share private implementation details';
  }

  detect(context, thresholds = {}) {
    // Can detect on classes or projects
    const target = context.class || context.project;
    if (!target) return null;

    // Default thresholds from Z-specification
    const bidirectionalDependency = thresholds.bidirectionalDependency || false;
    const sharedIntimacy = thresholds.sharedIntimacy || 0;

    const intimacies = this.findInappropriateIntimacies(target, context);

    // Detection logic from Z-specification
    const isDetected = intimacies.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      const maxSharedIntimacy = Math.max(...intimacies.map(i => i.sharedIntimacy));
      if (maxSharedIntimacy > 8) {
        severity = 'High';
      } else if (maxSharedIntimacy > 3) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = context.class ?
      { class: context.class.name.toString(), file: context.filePath } :
      { project: context.project.name || 'Unknown Project' };

    const details = {
      intimaciesCount: intimacies.length,
      intimacies: intimacies,
      thresholds: { bidirectionalDependency, sharedIntimacy }
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
   * Find inappropriate intimacies
   */
  findInappropriateIntimacies(target, context) {
    if (context.class) {
      return this.findClassIntimacies(context.class, context.project);
    } else {
      return this.findProjectIntimacies(context.project);
    }
  }

  /**
   * Find inappropriate intimacies for a single class
   */
  findClassIntimacies(class_, project) {
    const intimacies = [];

    for (const otherClass of project.classes) {
      if (otherClass === class_) continue;

      const intimacy = this.analyzeClassPairIntimacy(class_, otherClass);

      if (intimacy.bidirectionalDependency && intimacy.sharedIntimacy > 3) {
        intimacies.push({
          class1: class_.name.toString(),
          class2: otherClass.name.toString(),
          bidirectionalDependency: intimacy.bidirectionalDependency,
          sharedIntimacy: intimacy.sharedIntimacy,
          intimacyDetails: intimacy.details
        });
      }
    }

    return intimacies;
  }

  /**
   * Find all inappropriate intimacies in a project
   */
  findProjectIntimacies(project) {
    const intimacies = [];
    const classes = Array.from(project.classes);

    for (let i = 0; i < classes.length; i++) {
      for (let j = i + 1; j < classes.length; j++) {
        const intimacy = this.analyzeClassPairIntimacy(classes[i], classes[j]);

        if (intimacy.bidirectionalDependency && intimacy.sharedIntimacy > 3) {
          intimacies.push({
            class1: classes[i].name.toString(),
            class2: classes[j].name.toString(),
            bidirectionalDependency: intimacy.bidirectionalDependency,
            sharedIntimacy: intimacy.sharedIntimacy,
            intimacyDetails: intimacy.details
          });
        }
      }
    }

    return intimacies;
  }

  /**
   * Analyze intimacy between two classes
   */
  analyzeClassPairIntimacy(class1, class2) {
    let sharedIntimacy = 0;
    const details = [];

    // Check bidirectional dependency
    const depends1to2 = this.classDependsOn(class1, class2);
    const depends2to1 = this.classDependsOn(class2, class1);
    const bidirectionalDependency = depends1to2 && depends2to1;

    // Count shared private access
    for (const method1 of class1.methods) {
      for (const method2 of class2.methods) {
        const intimacy = this.methodsShareIntimacy(method1, method2, class1, class2);
        if (intimacy > 0) {
          sharedIntimacy += intimacy;
          details.push({
            method1: method1.name.toString(),
            method2: method2.name.toString(),
            intimacyType: 'private_access',
            intimacyCount: intimacy
          });
        }
      }
    }

    return {
      bidirectionalDependency,
      sharedIntimacy,
      details
    };
  }

  /**
   * Check if class1 depends on class2
   */
  classDependsOn(class1, class2) {
    for (const method of class1.methods) {
      // Check method calls
      for (const call of method.calls) {
        const [caller, callee] = call;
        if (callee.includes(class2.name.toString())) {
          return true;
        }
      }

      // Check field access
      for (const [accessor, field] of method.accessedFields) {
        if (accessor === class2.name.toString()) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if two methods share inappropriate intimacy
   */
  methodsShareIntimacy(method1, method2, class1, class2) {
    let intimacy = 0;

    // Check if method1 accesses private members of class2
    for (const [accessor, field] of method1.accessedFields) {
      if (accessor === class2.name.toString()) {
        // Assume fields starting with _ are private
        if (field.startsWith('_')) {
          intimacy++;
        }
      }
    }

    // Check if method2 accesses private members of class1
    for (const [accessor, field] of method2.accessedFields) {
      if (accessor === class1.name.toString()) {
        if (field.startsWith('_')) {
          intimacy++;
        }
      }
    }

    return intimacy;
  }
}
