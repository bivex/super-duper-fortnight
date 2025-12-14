import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Primitive Obsession code smell
 * Based on Z-specification: PrimitiveObsession
 */
export class PrimitiveObsessionDetector extends CodeSmellDetector {
  getName() {
    return 'PrimitiveObsession';
  }

  getDescription() {
    return 'Overuse of primitive types instead of specialized classes or excessive magic numbers/strings';
  }

  detect(context, thresholds = {}) {
    // Only detect on classes
    if (!context.class) return null;
    const class_ = context.class;

    // Default thresholds from Z-specification
    const maxMagicNumbers = thresholds.maxMagicNumbers || 5;
    const maxMagicStrings = thresholds.maxMagicStrings || 5;
    const maxStringGetNodes = thresholds.maxStringGetNodes || 3;
    const maxUntypedVars = thresholds.maxUntypedVars || 3;

    // Analyze primitive obsession patterns
    const analysis = this.analyzePrimitiveObsession(class_);

    // Detection logic from Z-specification
    const isDetected = analysis.magicNumbers > maxMagicNumbers ||
                      analysis.magicStrings > maxMagicStrings ||
                      analysis.stringGetNodes > maxStringGetNodes ||
                      analysis.untypedVars > maxUntypedVars;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.magicNumbers > 15 || analysis.untypedVars > 10) {
        severity = 'High';
      } else if (analysis.magicNumbers > 5 || analysis.stringGetNodes > 3) {
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
      magicNumbers: analysis.magicNumbers,
      magicStrings: analysis.magicStrings,
      stringGetNodes: analysis.stringGetNodes,
      untypedVars: analysis.untypedVars,
      examples: analysis.examples,
      thresholds: { maxMagicNumbers, maxMagicStrings, maxStringGetNodes, maxUntypedVars }
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
   * Analyze primitive obsession patterns in a class
   */
  analyzePrimitiveObsession(class_) {
    let magicNumbers = 0;
    let magicStrings = 0;
    let stringGetNodes = 0;
    let untypedVars = 0;
    const examples = [];

    // Analyze methods for magic numbers and strings
    for (const method of class_.methods) {
      for (const line of method.lines) {
        const content = line.content;

        // Count magic numbers (numeric literals)
        const numberMatches = content.match(/\b\d+\.?\d*\b/g);
        if (numberMatches) {
          for (const match of numberMatches) {
            const num = parseFloat(match);
            // Consider numbers > 1 as potentially magic (exclude 0, 1, -1, etc.)
            if (Math.abs(num) > 1 && !Number.isInteger(num) || num > 10) {
              magicNumbers++;
              examples.push({ type: 'magic_number', value: match, line: content });
            }
          }
        }

        // Count magic strings (string literals that look like they should be constants)
        const stringMatches = content.match(/["']([^"']{3,})["']/g);
        if (stringMatches) {
          for (const match of stringMatches) {
            const str = match.slice(1, -1);
            // Consider strings longer than 3 chars as potentially magic
            if (str.length > 3 && !this.isLikelyNotMagic(str)) {
              magicStrings++;
              examples.push({ type: 'magic_string', value: str, line: content });
            }
          }
        }

        // Count get_node calls with string literals
        if (content.includes('get_node(') && content.match(/get_node\s*\(\s*["'][^"']+["']\s*\)/)) {
          stringGetNodes++;
          examples.push({ type: 'string_get_node', line: content });
        }
      }
    }

    // Count untyped variables (variables without explicit types)
    for (const field of class_.fields) {
      // This is a simplified check - in reality we'd need to check the AST
      // For now, assume all fields are potentially untyped
      untypedVars++;
    }

    return {
      magicNumbers,
      magicStrings,
      stringGetNodes,
      untypedVars,
      examples: examples.slice(0, 10) // Limit examples
    };
  }

  /**
   * Check if a string is likely not a magic string
   */
  isLikelyNotMagic(str) {
    const nonMagicPatterns = [
      /^https?:\/\//,  // URLs
      /\.(png|jpg|jpeg|gif|tscn|gd)$/i,  // File extensions
      /^[A-Z_]+$/,     // Constants (already uppercase)
      /^[a-z_]+$/,     // Lowercase identifiers
      /^\d+$/,         // Numbers as strings
      /^on_/,          // Signal names
      /_path$/,        // Path variables
      /_name$/         // Name variables
    ];

    return nonMagicPatterns.some(pattern => pattern.test(str));
  }
}
