/**
 * Value Object representing a line of code
 * Immutable string with line number information
 */
export class CodeLine {
  constructor(content, lineNumber = null) {
    if (typeof content !== 'string') {
      throw new Error('CodeLine content must be a string');
    }
    this.content = content.trim();
    this.lineNumber = lineNumber;
    Object.freeze(this);
  }

  /**
   * Check if line contains a specific substring
   */
  contains(substring) {
    return this.content.includes(substring);
  }

  /**
   * Check if line is a comment
   */
  isComment() {
    return this.content.startsWith('#') || this.content.trim().startsWith('//');
  }

  /**
   * Check if line contains yield or await
   */
  hasYieldOrAwait() {
    return this.contains('yield') || this.contains('await');
  }

  /**
   * Get line length
   */
  get length() {
    return this.content.length;
  }

  toString() {
    return this.content;
  }

  equals(other) {
    return other instanceof CodeLine && this.content === other.content;
  }

  static from(content, lineNumber = null) {
    return new CodeLine(content, lineNumber);
  }
}
