import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Data Clumps code smell
 * Based on Z-specification: DataClumps
 */
export class DataClumpsDetector extends CodeSmellDetector {
  getName() {
    return 'DataClumps';
  }

  getDescription() {
    return 'Group of variables that are always used together but not organized into a structure';
  }

  detect(context, thresholds = {}) {
    // Only detect on projects
    if (!context.project) return null;
    const project = context.project;

    // Default thresholds from Z-specification
    const minClumpSize = thresholds.minClumpSize || 3;
    const minOccurrences = thresholds.minOccurrences || 3;

    // Find data clumps across the project
    const clumps = this.findDataClumps(project, minClumpSize, minOccurrences);

    // Detection logic from Z-specification
    const isDetected = clumps.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      const maxClumpSize = Math.max(...clumps.map(c => c.variables.length));
      if (maxClumpSize >= 5) {
        severity = 'High';
      } else if (clumps.length > 3) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      project: project.name || 'Unknown Project'
    };

    const details = {
      clumpsCount: clumps.length,
      clumps: clumps,
      minClumpSize,
      minOccurrences,
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
   * Find data clumps in the project
   */
  findDataClumps(project, minClumpSize, minOccurrences) {
    const clumps = [];
    const classes = Array.from(project.classes);

    // Analyze parameter patterns across methods
    const parameterGroups = this.analyzeParameterGroups(classes);

    // Find groups that appear together frequently
    for (const [groupKey, occurrences] of Object.entries(parameterGroups)) {
      if (occurrences.length >= minOccurrences) {
        const variables = groupKey.split(',').map(v => v.trim());
        if (variables.length >= minClumpSize) {
          clumps.push({
            variables,
            occurrences: occurrences.length,
            methods: occurrences,
            description: `${variables.length} variables used together in ${occurrences.length} methods`
          });
        }
      }
    }

    // Analyze field access patterns
    const fieldGroups = this.analyzeFieldGroups(classes);
    for (const [groupKey, occurrences] of Object.entries(fieldGroups)) {
      if (occurrences.length >= minOccurrences) {
        const variables = groupKey.split(',').map(v => v.trim());
        if (variables.length >= minClumpSize) {
          clumps.push({
            variables,
            occurrences: occurrences.length,
            methods: occurrences,
            type: 'field_access',
            description: `${variables.length} fields accessed together in ${occurrences.length} methods`
          });
        }
      }
    }

    return clumps;
  }

  /**
   * Analyze parameter groups across methods
   */
  analyzeParameterGroups(classes) {
    const parameterGroups = {};

    for (const class_ of classes) {
      for (const method of class_.methods) {
        const paramNames = method.parameters.map(p => p.name.toString());

        if (paramNames.length >= 3) {
          // Create combinations of parameters
          for (let i = 0; i < paramNames.length - 2; i++) {
            for (let j = i + 1; j < paramNames.length - 1; j++) {
              for (let k = j + 1; k < paramNames.length; k++) {
                const group = [paramNames[i], paramNames[j], paramNames[k]].sort();
                const groupKey = group.join(',');

                if (!parameterGroups[groupKey]) {
                  parameterGroups[groupKey] = [];
                }

                parameterGroups[groupKey].push(`${class_.name}.${method.name}`);
              }
            }
          }
        }
      }
    }

    return parameterGroups;
  }

  /**
   * Analyze field access groups
   */
  analyzeFieldGroups(classes) {
    const fieldGroups = {};

    for (const class_ of classes) {
      for (const method of class_.methods) {
        const accessedFields = Array.from(method.accessedFields)
          .filter(([className]) => className === class_.name.toString())
          .map(([, field]) => field);

        if (accessedFields.length >= 3) {
          // Create combinations of accessed fields
          for (let i = 0; i < accessedFields.length - 2; i++) {
            for (let j = i + 1; j < accessedFields.length - 1; j++) {
              for (let k = j + 1; k < accessedFields.length; k++) {
                const group = [accessedFields[i], accessedFields[j], accessedFields[k]].sort();
                const groupKey = group.join(',');

                if (!fieldGroups[groupKey]) {
                  fieldGroups[groupKey] = [];
                }

                fieldGroups[groupKey].push(`${class_.name}.${method.name}`);
              }
            }
          }
        }
      }
    }

    return fieldGroups;
  }
}
