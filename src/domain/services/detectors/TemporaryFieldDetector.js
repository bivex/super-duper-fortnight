import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Temporary Field code smell
 * Based on Z-specification: TemporaryField
 */
export class TemporaryFieldDetector extends CodeSmellDetector {
  getName() {
    return 'TemporaryField';
  }

  getDescription() {
    return 'Field is used only under certain conditions and often null otherwise';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Default thresholds from Z-specification
    const conditionalUsage = thresholds.conditionalUsage || false;
    const nullChecks = thresholds.nullChecks || 0;

    // Analyze temporary field patterns
    const temporaryFields = this.findTemporaryFields(class_);

    // Detection logic from Z-specification
    const isDetected = temporaryFields.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      const maxNullChecks = Math.max(...temporaryFields.map(f => f.nullChecks));
      if (maxNullChecks > 5) {
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
      temporaryFieldsCount: temporaryFields.length,
      temporaryFields: temporaryFields,
      thresholds: { conditionalUsage, nullChecks }
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
   * Find temporary fields in a class
   */
  findTemporaryFields(class_) {
    const temporaryFields = [];

    for (const field of class_.fields) {
      const fieldAnalysis = this.analyzeFieldUsage(field, class_);

      if (fieldAnalysis.isTemporary) {
        temporaryFields.push({
          field: field.toString(),
          conditionalUsage: fieldAnalysis.conditionalUsage,
          nullChecks: fieldAnalysis.nullChecks,
          usageMethods: fieldAnalysis.usageMethods,
          reason: fieldAnalysis.reason
        });
      }
    }

    return temporaryFields;
  }

  /**
   * Analyze how a field is used in the class
   */
  analyzeFieldUsage(field, class_) {
    const fieldName = field.toString();
    const usageMethods = [];
    let conditionalUsage = false;
    let nullChecks = 0;

    for (const method of class_.methods) {
      let methodUsesField = false;
      let methodNullChecks = 0;
      let methodConditionalUsage = false;

      for (const line of method.lines) {
        const content = line.content;

        // Check if field is used in this line
        if (content.includes(fieldName)) {
          methodUsesField = true;

          // Check for null checks
          if (content.includes('null') || content.includes('== null') ||
              content.includes('!= null') || content.includes('is null')) {
            methodNullChecks++;
          }

          // Check if usage is inside conditional blocks
          if (this.isInsideConditionalBlock(method.lines, method.lines.indexOf(line))) {
            methodConditionalUsage = true;
          }
        }
      }

      if (methodUsesField) {
        usageMethods.push(method.name.toString());
        nullChecks += methodNullChecks;
        if (methodConditionalUsage) {
          conditionalUsage = true;
        }
      }
    }

    // Determine if field is temporary
    const isTemporary = conditionalUsage && nullChecks > 2;

    let reason = '';
    if (isTemporary) {
      if (conditionalUsage && nullChecks > 2) {
        reason = 'Field is used conditionally and has frequent null checks';
      } else if (usageMethods.length === 1) {
        reason = 'Field is used in only one method';
      }
    }

    return {
      isTemporary,
      conditionalUsage,
      nullChecks,
      usageMethods,
      reason
    };
  }

  /**
   * Check if a line is inside a conditional block (simplified)
   */
  isInsideConditionalBlock(lines, lineIndex) {
    let indentLevel = this.getIndentLevel(lines[lineIndex].content);
    let conditionalDepth = 0;

    // Look backwards for conditional statements
    for (let i = lineIndex - 1; i >= 0; i--) {
      const line = lines[i].content;
      const lineIndent = this.getIndentLevel(line);

      // If we find a less indented line, we've exited all conditionals
      if (lineIndent < indentLevel) {
        break;
      }

      // Check for conditional keywords
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith('if ') || trimmed.startsWith('elif ') ||
          trimmed.startsWith('else:') || trimmed.startsWith('match ')) {
        conditionalDepth++;
      }
    }

    return conditionalDepth > 0;
  }

  /**
   * Get indentation level of a line
   */
  getIndentLevel(line) {
    let indent = 0;
    for (const char of line) {
      if (char === ' ') {
        indent++;
      } else if (char === '\t') {
        indent += 4; // Assume 4 spaces per tab
      } else {
        break;
      }
    }
    return indent;
  }
}
