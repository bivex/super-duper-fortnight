import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Global State code smell
 * Based on Z-specification: GlobalState
 */
export class GlobalStateDetector extends CodeSmellDetector {
  getName() {
    return 'GlobalState';
  }

  getDescription() {
    return 'Excessive use of global state through autoloads/singletons';
  }

  detect(context, thresholds = {}) {
    // Only detect on projects
    if (!context.project) return null;
    const project = context.project;

    // Default thresholds from Z-specification
    const maxAutoloads = thresholds.maxAutoloads || 5;
    const maxGlobalVars = thresholds.maxGlobalVars || 20;

    const analysis = this.analyzeGlobalState(project);

    // Detection logic from Z-specification
    const isDetected = project.autoloads.size > maxAutoloads ||
                      analysis.totalGlobalVars > maxGlobalVars ||
                      analysis.godAutoloads.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.godAutoloads.length > 0) {
        severity = 'Critical';
      } else if (project.autoloads.size > 8 || analysis.totalGlobalVars > 40) {
        severity = 'High';
      } else if (project.autoloads.size > 5 || analysis.totalGlobalVars > 20) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      project: project.name || 'Unknown Project'
    };

    const details = {
      autoloadCount: project.autoloads.size,
      totalGlobalVars: analysis.totalGlobalVars,
      godAutoloads: analysis.godAutoloads,
      autoloadDetails: analysis.autoloadDetails,
      maxAutoloads,
      maxGlobalVars
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
   * Analyze global state usage in the project
   */
  analyzeGlobalState(project) {
    const autoloadDetails = [];
    const godAutoloads = [];

    // Analyze each autoload
    for (const autoload of project.autoloads) {
      const fieldCount = autoload.fields.size;
      const methodCount = autoload.methods.size;
      const totalLOC = autoload.getTotalLOC();

      autoloadDetails.push({
        name: autoload.name.toString(),
        fieldCount,
        methodCount,
        totalLOC
      });

      // Check for "God autoload" - single autoload with too many responsibilities
      if (totalLOC > 400 || methodCount > 20) {
        godAutoloads.push({
          name: autoload.name.toString(),
          totalLOC,
          methodCount,
          reason: totalLOC > 400 ? 'Too many lines of code' : 'Too many methods'
        });
      }
    }

    const totalGlobalVars = autoloadDetails.reduce((sum, a) => sum + a.fieldCount, 0);

    return {
      totalGlobalVars,
      godAutoloads,
      autoloadDetails
    };
  }
}
