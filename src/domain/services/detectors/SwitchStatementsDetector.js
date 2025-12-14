import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Switch Statements code smell
 * Based on Z-specification: SwitchStatements
 */
export class SwitchStatementsDetector extends CodeSmellDetector {
  getName() {
    return 'SwitchStatements';
  }

  getDescription() {
    return 'Excessive use of conditional statements that could be replaced with polymorphism';
  }

  detect(context, thresholds = {}) {
    // Only detect on methods
    if (!context.method) return null;
    const method = context.method;

    // Default thresholds from Z-specification
    const maxSwitches = thresholds.maxSwitches || 2;
    const maxCases = thresholds.maxCases || 5;

    // Analyze switch/match constructs
    const analysis = this.analyzeSwitchStatements(method);

    // Detection logic from Z-specification
    const isDetected = analysis.switchCount > maxSwitches ||
                      analysis.avgCases > maxCases ||
                      analysis.duplicatedSwitches > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.duplicatedSwitches > 3) {
        severity = 'Critical';
      } else if (analysis.avgCases > 10 || analysis.duplicatedSwitches > 0) {
        severity = 'High';
      } else if (analysis.switchCount > 2) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      class: context.ownerClass?.name?.toString(),
      method: method.name.toString(),
      file: context.filePath
    };

    const details = {
      switchCount: analysis.switchCount,
      avgCases: analysis.avgCases,
      duplicatedSwitches: analysis.duplicatedSwitches,
      switches: analysis.switches,
      thresholds: { maxSwitches, maxCases }
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
   * Analyze switch/match statements in a method
   */
  analyzeSwitchStatements(method) {
    const switches = [];
    let duplicatedSwitches = 0;

    for (const line of method.lines) {
      const content = line.content.trim();

      // Detect match statements (GDScript's switch equivalent)
      if (content.startsWith('match ')) {
        const matchAnalysis = this.analyzeMatchStatement(method.lines, method.lines.indexOf(line));
        switches.push(matchAnalysis);

        // Check for duplicated match variables
        const duplicateCount = switches.filter(s =>
          s.variable === matchAnalysis.variable
        ).length - 1;

        if (duplicateCount > 0) {
          duplicatedSwitches += duplicateCount;
        }
      }

      // Detect long if-elif chains (alternative to switch)
      if (content.startsWith('if ') && this.isLongIfChain(method.lines, method.lines.indexOf(line))) {
        switches.push({
          type: 'if_chain',
          cases: this.countIfChainCases(method.lines, method.lines.indexOf(line)),
          line: method.lines.indexOf(line) + 1
        });
      }
    }

    const switchCount = switches.length;
    const totalCases = switches.reduce((sum, s) => sum + (s.cases || 0), 0);
    const avgCases = switchCount > 0 ? totalCases / switchCount : 0;

    return {
      switchCount,
      avgCases,
      duplicatedSwitches,
      switches
    };
  }

  /**
   * Analyze a match statement
   */
  analyzeMatchStatement(lines, startIndex) {
    let caseCount = 0;
    let variable = '';

    // Extract variable being matched
    const matchLine = lines[startIndex].content;
    const match = matchLine.match(/match\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (match) {
      variable = match[1];
    }

    // Count cases by looking for case patterns
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].content.trim();

      // GDScript match cases
      if (line.includes('->') || line.match(/^\s*\d+:/) || line.match(/^\s*"[^{"]+":/)) {
        caseCount++;
      }

      // End of match statement
      if (!line.startsWith(' ') && !line.startsWith('\t') && i > startIndex + 1) {
        break;
      }
    }

    return {
      type: 'match',
      variable,
      cases: caseCount,
      line: startIndex + 1
    };
  }

  /**
   * Check if this is the start of a long if-elif chain
   */
  isLongIfChain(lines, startIndex) {
    let elifCount = 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].content.trim();

      if (line.startsWith('elif ')) {
        elifCount++;
      } else if (!line.startsWith(' ') && !line.startsWith('\t') && i > startIndex) {
        break; // End of the chain
      }
    }

    return elifCount >= 2; // Consider 2+ elif as a "long" chain
  }

  /**
   * Count cases in an if-elif chain
   */
  countIfChainCases(lines, startIndex) {
    let caseCount = 1; // The initial if

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i].content.trim();

      if (line.startsWith('elif ')) {
        caseCount++;
      } else if (line.startsWith('else:') || line.startsWith('else ')) {
        caseCount++; // else counts as a case
        break;
      } else if (!line.startsWith(' ') && !line.startsWith('\t') && i > startIndex) {
        break; // End of the chain
      }
    }

    return caseCount;
  }
}
