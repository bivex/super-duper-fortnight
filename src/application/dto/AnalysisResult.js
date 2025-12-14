import { CodeSmellResult } from '../../domain/services/CodeSmellDetector.js';

/**
 * Data Transfer Object for analysis results
 * Contains all detected code smells with metadata
 */
export class AnalysisResult {
  constructor(project, results = [], config = null, metadata = {}) {
    this.project = project; // GDScriptProject
    this.results = [...results]; // Array<CodeSmellResult>
    this.config = config; // AnalysisConfig
    this.metadata = {
      timestamp: new Date().toISOString(),
      duration: metadata.duration || 0,
      totalFiles: metadata.totalFiles || 0,
      totalClasses: metadata.totalClasses || 0,
      totalMethods: metadata.totalMethods || 0,
      ...metadata
    };

    Object.freeze(this);
  }

  /**
   * Get all detected smells
   */
  getDetectedSmells() {
    return this.results.filter(result => result.isDetected());
  }

  /**
   * Get smells by severity
   */
  getSmellsBySeverity(severity) {
    return this.results.filter(result => result.severity === severity);
  }

  /**
   * Get smells grouped by type
   */
  getSmellsByType() {
    const grouped = {};

    for (const result of this.results) {
      if (!grouped[result.smellName]) {
        grouped[result.smellName] = [];
      }
      grouped[result.smellName].push(result);
    }

    return grouped;
  }

  /**
   * Get summary statistics
   */
  getSummary() {
    const detected = this.getDetectedSmells();
    const bySeverity = {
      Critical: this.getSmellsBySeverity('Critical').length,
      High: this.getSmellsBySeverity('High').length,
      Medium: this.getSmellsBySeverity('Medium').length,
      Low: this.getSmellsBySeverity('Low').length
    };

    return {
      totalSmells: detected.length,
      bySeverity,
      byType: Object.fromEntries(
        Object.entries(this.getSmellsByType()).map(([type, results]) => [
          type,
          results.filter(r => r.isDetected()).length
        ])
      ),
      projectStats: this.project.getStatistics(),
      analysisMetadata: this.metadata
    };
  }

  /**
   * Export to JSON format
   */
  toJSON() {
    return {
      project: {
        name: this.project.name,
        statistics: this.project.getStatistics()
      },
      summary: this.getSummary(),
      results: this.results.map(result => ({
        smellName: result.smellName,
        detected: result.detected,
        severity: result.severity,
        location: result.location,
        details: this.config?.output?.includeDetails ? result.details : undefined
      })),
      metadata: this.metadata,
      config: this.config ? {
        enabledDetectors: this.config.enabledDetectors,
        thresholds: this.config.thresholds
      } : undefined
    };
  }

  /**
   * Export to human-readable text format
   */
  toText() {
    const summary = this.getSummary();
    let output = '';

    output += `=== GDScript Code Smell Analysis Report ===\n\n`;
    output += `Project: ${this.project.name}\n`;
    output += `Analysis Date: ${new Date(this.metadata.timestamp).toLocaleString()}\n`;
    output += `Duration: ${this.metadata.duration}ms\n\n`;

    output += `=== Project Statistics ===\n`;
    output += `Total Classes: ${summary.projectStats.totalClasses}\n`;
    output += `Total Scenes: ${summary.projectStats.totalScenes}\n`;
    output += `Autoloads: ${summary.projectStats.autoloads}\n`;
    output += `Total LOC: ${summary.projectStats.totalLOC}\n\n`;

    output += `=== Code Smell Summary ===\n`;
    output += `Total Detected Smells: ${summary.totalSmells}\n`;
    output += `Critical: ${summary.bySeverity.Critical}\n`;
    output += `High: ${summary.bySeverity.High}\n`;
    output += `Medium: ${summary.bySeverity.Medium}\n`;
    output += `Low: ${summary.bySeverity.Low}\n\n`;

    if (summary.totalSmells > 0) {
      output += `=== Detected Smells ===\n`;

      // Sort by severity (Critical first)
      const sortedResults = this.getDetectedSmells().sort((a, b) =>
        b.getSeverityLevel() - a.getSeverityLevel()
      );

      for (const result of sortedResults) {
        output += `\n[${result.severity}] ${result.smellName}\n`;
        output += `Location: ${result.location.class || 'Unknown'}`;
        if (result.location.method) {
          output += `::${result.location.method}`;
        }
        output += `\n`;

        if (result.details && Object.keys(result.details).length > 0) {
          output += `Details: ${JSON.stringify(result.details, null, 2)}\n`;
        }
      }
    } else {
      output += `✅ No code smells detected!\n`;
    }

    return output;
  }

  static from(project, results = [], config = null, metadata = {}) {
    return new AnalysisResult(project, results, config, metadata);
  }
}
