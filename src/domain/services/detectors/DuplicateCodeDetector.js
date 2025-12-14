import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Duplicate Code smell
 * Based on Z-specification: DuplicateCode
 */
export class DuplicateCodeDetector extends CodeSmellDetector {
  getName() {
    return 'DuplicateCode';
  }

  getDescription() {
    return 'Identical or very similar code fragments are repeated in different locations';
  }

  detect(context, thresholds = {}) {
    // Only detect on projects
    if (!context.project) return null;
    const project = context.project;
    // Default thresholds from Z-specification
    const threshold = thresholds.similarityThreshold || 6; // minimum 6 identical lines
    const minLines = thresholds.minLines || 5; // minimum 5 lines for duplication
    const minSimilarity = thresholds.minSimilarity || 0.6; // 60% similarity

    const duplicates = this.findDuplicates(project, minLines, minSimilarity);

    // Detection logic from Z-specification
    const isDetected = duplicates.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation based on number of duplicates
      if (duplicates.length > 10) {
        severity = 'Critical';
      } else if (duplicates.length > 5) {
        severity = 'High';
      } else if (duplicates.length > 2) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = {
      project: project.name || 'Unknown Project'
    };

    const details = {
      duplicateCount: duplicates.length,
      duplicates: duplicates.slice(0, 10), // Limit for readability
      thresholds: { threshold, minLines, minSimilarity }
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
   * Find duplicate code blocks across the project
   * Based on Z-specification DuplicateCode.duplicates definition
   */
  findDuplicates(project, minLines, minSimilarity) {
    const duplicates = [];
    const codeBlocks = this.extractCodeBlocks(project);

    // Compare all pairs of code blocks
    for (let i = 0; i < codeBlocks.length; i++) {
      for (let j = i + 1; j < codeBlocks.length; j++) {
        const block1 = codeBlocks[i];
        const block2 = codeBlocks[j];

        if (block1.lines.length >= minLines && block2.lines.length >= minLines) {
          const similarity = this.calculateSimilarity(block1.lines, block2.lines);

          if (similarity >= minSimilarity && similarity > 0) {
            duplicates.push({
              block1: {
                location: block1.location,
                lines: block1.lines.length,
                content: block1.lines.slice(0, 3).join('\n') + (block1.lines.length > 3 ? '\n...' : '')
              },
              block2: {
                location: block2.location,
                lines: block2.lines.length,
                content: block2.lines.slice(0, 3).join('\n') + (block2.lines.length > 3 ? '\n...' : '')
              },
              similarity: Math.round(similarity * 100) / 100
            });
          }
        }
      }
    }

    return duplicates;
  }

  /**
   * Extract code blocks from all methods in the project
   */
  extractCodeBlocks(project) {
    const blocks = [];

    for (const class_ of project.classes) {
      for (const method of class_.methods) {
        blocks.push({
          location: {
            class: class_.name.toString(),
            method: method.name.toString(),
            file: method.filePath
          },
          lines: method.lines.map(line => line.content)
        });
      }
    }

    return blocks;
  }

  /**
   * Calculate similarity between two code blocks
   * Based on Z-specification Similarity function
   */
  calculateSimilarity(lines1, lines2) {
    if (lines1.length === 0 && lines2.length === 0) return 1.0;
    if (lines1.length === 0 || lines2.length === 0) return 0.0;

    const matchingLines = this.countMatchingLines(lines1, lines2);
    const maxLength = Math.max(lines1.length, lines2.length);

    return matchingLines / maxLength;
  }

  /**
   * Count matching lines between two code blocks
   */
  countMatchingLines(lines1, lines2) {
    const set1 = new Set(lines1.map(line => line.trim()));
    const set2 = new Set(lines2.map(line => line.trim()));

    let matches = 0;
    for (const line of set1) {
      if (set2.has(line)) {
        matches++;
      }
    }

    return matches;
  }
}
