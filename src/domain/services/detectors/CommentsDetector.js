import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Comments code smell
 * Based on Z-specification: CommentsSmell
 */
export class CommentsDetector extends CodeSmellDetector {
  getName() {
    return 'Comments';
  }

  getDescription() {
    return 'Excessive comments that mask poor code structure and naming';
  }

  detect(context, thresholds = {}) {
    // Can detect on methods or classes
    const target = context.method || context.class;
    if (!target) return null;

    // Default thresholds from Z-specification
    const maxCommentDensity = thresholds.maxCommentDensity || 0.5;

    const analysis = this.analyzeComments(target);

    // Detection logic from Z-specification
    const isDetected = analysis.commentDensity > maxCommentDensity && analysis.codeLines > 10;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      if (analysis.commentDensity > 0.7) {
        severity = 'Medium';
      } else {
        severity = 'Low';
      }
    }

    const location = context.method ?
      {
        class: context.ownerClass?.name?.toString(),
        method: context.method.name.toString(),
        file: context.filePath
      } :
      {
        class: context.class.name.toString(),
        file: context.filePath
      };

    const details = {
      commentDensity: Math.round(analysis.commentDensity * 100) / 100,
      commentLines: analysis.commentLines,
      codeLines: analysis.codeLines,
      totalLines: analysis.totalLines,
      commentRatio: analysis.commentRatio,
      maxCommentDensity
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
   * Analyze comment patterns in the target
   */
  analyzeComments(target) {
    if (target.lines) {
      // Method analysis
      return this.analyzeMethodComments(target);
    } else {
      // Class analysis
      return this.analyzeClassComments(target);
    }
  }

  /**
   * Analyze comments in a method
   */
  analyzeMethodComments(method) {
    let commentLines = 0;
    let codeLines = 0;

    for (const line of method.lines) {
      const content = line.content.trim();

      if (content === '') continue; // Skip empty lines

      if (this.isCommentLine(content)) {
        commentLines++;
      } else {
        codeLines++;
      }
    }

    const totalLines = commentLines + codeLines;
    const commentDensity = totalLines > 0 ? commentLines / totalLines : 0;
    const commentRatio = codeLines > 0 ? commentLines / codeLines : 0;

    return {
      commentLines,
      codeLines,
      totalLines,
      commentDensity,
      commentRatio
    };
  }

  /**
   * Analyze comments in a class
   */
  analyzeClassComments(class_) {
    let totalCommentLines = 0;
    let totalCodeLines = 0;

    for (const method of class_.methods) {
      const methodAnalysis = this.analyzeMethodComments(method);
      totalCommentLines += methodAnalysis.commentLines;
      totalCodeLines += methodAnalysis.codeLines;
    }

    const totalLines = totalCommentLines + totalCodeLines;
    const commentDensity = totalLines > 0 ? totalCommentLines / totalLines : 0;
    const commentRatio = totalCodeLines > 0 ? totalCommentLines / totalCodeLines : 0;

    return {
      commentLines: totalCommentLines,
      codeLines: totalCodeLines,
      totalLines,
      commentDensity,
      commentRatio
    };
  }

  /**
   * Check if a line is a comment
   */
  isCommentLine(content) {
    // GDScript comments start with #
    return content.startsWith('#');
  }
}
