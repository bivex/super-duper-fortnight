import fs from 'fs/promises';
import path from 'path';

/**
 * Repository for saving analysis reports
 * Handles different output formats and file operations
 */
export class ReportRepository {
  /**
   * Save analysis result to file
   * @param {AnalysisResult} result - Analysis result to save
   * @param {string} outputDirectory - Directory to save the report
   * @param {string} format - Output format ('json', 'txt', 'html')
   */
  async saveResult(result, outputDirectory = './analysis-results', format = 'json') {
    // Generate timestamp for this analysis run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampDir = path.join(outputDirectory, timestamp);

    // Ensure timestamp directory exists
    await this.ensureDirectoryExists(timestampDir);

    // Save in requested format
    switch (format.toLowerCase()) {
      case 'json':
        return await this.saveAsJSONByFile(result, timestampDir, timestamp);
      case 'txt':
        return await this.saveAsText(result, timestampDir, `analysis-${timestamp}`);
      case 'html':
        return await this.saveAsHTML(result, timestampDir, `analysis-${timestamp}`);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Save result as JSON organized by file
   */
  async saveAsJSONByFile(result, timestampDir, timestamp) {
    // Group detected smells by file
    const smellsByFile = new Map();

    for (const smell of result.results) {
      if (smell.isDetected() && smell.location && smell.location.file) {
        const filePath = smell.location.file;
        if (!smellsByFile.has(filePath)) {
          smellsByFile.set(filePath, []);
        }
        smellsByFile.get(filePath).push({
          smellName: smell.smellName,
          severity: smell.severity,
          location: smell.location,
          details: smell.details
        });
      }
    }

    // Save individual file reports
    const savedFiles = [];
    for (const [filePath, smells] of smellsByFile) {
      const fileName = path.basename(filePath, '.gd');
      const outputFileName = `${fileName}.json`;
      const outputPath = path.join(timestampDir, outputFileName);

      const fileResult = {
        file: filePath,
        fileName: fileName,
        analysisTimestamp: result.metadata.timestamp,
        summary: {
          totalSmells: smells.length,
          bySeverity: this.countBySeverity(smells),
          byType: this.countByType(smells)
        },
        smells: smells.map(smell => ({
          smellName: smell.smellName,
          severity: smell.severity,
          location: smell.location,
          details: smell.details
        }))
      };

      const jsonContent = JSON.stringify(fileResult, null, 2);
      await fs.writeFile(outputPath, jsonContent, 'utf-8');
      savedFiles.push(outputPath);
    }

    // Save overall summary
    const summaryPath = path.join(timestampDir, 'summary.json');
    const summaryResult = {
      analysisTimestamp: result.metadata.timestamp,
      duration: result.metadata.duration,
      project: {
        name: result.project.name,
        statistics: result.project.getStatistics()
      },
      overallSummary: result.getSummary(),
      filesAnalyzed: result.metadata.totalFiles,
      filesWithSmells: smellsByFile.size,
      filesSaved: savedFiles,
      totalResults: result.results.length,
      detectedSmells: result.getDetectedSmells().length
    };

    const summaryContent = JSON.stringify(summaryResult, null, 2);
    await fs.writeFile(summaryPath, summaryContent, 'utf-8');

    return summaryPath; // Return the summary file path
  }

  /**
   * Count smells by severity
   */
  countBySeverity(smells) {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    for (const smell of smells) {
      if (counts.hasOwnProperty(smell.severity)) {
        counts[smell.severity]++;
      }
    }
    return counts;
  }

  /**
   * Count smells by type
   */
  countByType(smells) {
    const counts = {};
    for (const smell of smells) {
      counts[smell.smellName] = (counts[smell.smellName] || 0) + 1;
    }
    return counts;
  }

  /**
   * Save result as JSON (legacy method)
   */
  async saveAsJSON(result, outputDirectory, baseFilename) {
    const filename = `${baseFilename}.json`;
    const filePath = path.join(outputDirectory, filename);

    const jsonContent = JSON.stringify(result.toJSON(), null, 2);
    await fs.writeFile(filePath, jsonContent, 'utf-8');

    return filePath;
  }

  /**
   * Save result as human-readable text
   */
  async saveAsText(result, timestampDir, baseFilename) {
    const filename = `${baseFilename}.txt`;
    const filePath = path.join(timestampDir, filename);

    const textContent = result.toText();
    await fs.writeFile(filePath, textContent, 'utf-8');

    return filePath;
  }

  /**
   * Save result as HTML report
   */
  async saveAsHTML(result, timestampDir, baseFilename) {
    const filename = `${baseFilename}.html`;
    const filePath = path.join(timestampDir, filename);

    const htmlContent = this.generateHTML(result);
    await fs.writeFile(filePath, htmlContent, 'utf-8');

    return filePath;
  }

  /**
   * Generate HTML report content
   */
  generateHTML(result) {
    const summary = result.getSummary();
    const detectedSmells = result.getDetectedSmells();

    // Sort smells by severity
    const sortedSmells = detectedSmells.sort((a, b) =>
      b.getSeverityLevel() - a.getSeverityLevel()
    );

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GDScript Code Smell Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .summary-item { background: #e8f4f8; padding: 15px; border-radius: 5px; flex: 1; text-align: center; }
        .severity-critical { background: #ffebee; border-left: 4px solid #f44336; }
        .severity-high { background: #fff3e0; border-left: 4px solid #ff9800; }
        .severity-medium { background: #fffde7; border-left: 4px solid #ffeb3b; }
        .severity-low { background: #f1f8e9; border-left: 4px solid #4caf50; }
        .smell-item { margin-bottom: 10px; padding: 10px; border-radius: 3px; }
        .details { background: #f9f9f9; padding: 10px; margin-top: 5px; font-size: 0.9em; }
        pre { background: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>GDScript Code Smell Analysis Report</h1>
        <p><strong>Project:</strong> ${result.project.name}</p>
        <p><strong>Analysis Date:</strong> ${new Date(result.metadata.timestamp).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${result.metadata.duration}ms</p>
    </div>

    <div class="summary">
        <div class="summary-item">
            <h3>Project Stats</h3>
            <p>Classes: ${summary.projectStats.totalClasses}</p>
            <p>Scenes: ${summary.projectStats.totalScenes}</p>
            <p>Autoloads: ${summary.projectStats.autoloads}</p>
            <p>Total LOC: ${summary.projectStats.totalLOC}</p>
        </div>
        <div class="summary-item">
            <h3>Smell Summary</h3>
            <p>Total: ${summary.totalSmells}</p>
            <p>Critical: ${summary.bySeverity.Critical}</p>
            <p>High: ${summary.bySeverity.High}</p>
            <p>Medium: ${summary.bySeverity.Medium}</p>
            <p>Low: ${summary.bySeverity.Low}</p>
        </div>
    </div>

    ${summary.totalSmells > 0 ? `
    <h2>Detected Code Smells</h2>
    ${sortedSmells.map(smell => `
        <div class="smell-item severity-${smell.severity.toLowerCase()}">
            <h3>[${smell.severity}] ${smell.smellName}</h3>
            <p><strong>Location:</strong> ${smell.location.class || 'Unknown'}${smell.location.method ? `::${smell.location.method}` : ''}</p>
            ${smell.details && Object.keys(smell.details).length > 0 ? `
                <div class="details">
                    <h4>Details:</h4>
                    <pre>${JSON.stringify(smell.details, null, 2)}</pre>
                </div>
            ` : ''}
        </div>
    `).join('')}
    ` : `
    <div style="text-align: center; padding: 50px; background: #e8f5e8; border-radius: 5px;">
        <h2 style="color: #2e7d32;">✅ No Code Smells Detected!</h2>
        <p>Your codebase looks clean!</p>
    </div>
    `}
</body>
</html>`;
  }

  /**
   * Ensure directory exists, create if necessary
   */
  async ensureDirectoryExists(directoryPath) {
    try {
      await fs.access(directoryPath);
    } catch {
      await fs.mkdir(directoryPath, { recursive: true });
    }
  }

  /**
   * Generate summary report across multiple analyses
   * @param {AnalysisResult[]} results - Multiple analysis results
   * @param {string} outputDirectory - Output directory
   */
  async generateSummaryReport(results, outputDirectory = './analysis-results') {
    // Use current timestamp for the summary directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const summaryDir = path.join(outputDirectory, timestamp);
    await this.ensureDirectoryExists(summaryDir);

    const summary = {
      totalAnalyses: results.length,
      timestamp: new Date().toISOString(),
      generatedAt: timestamp,
      projects: results.map(result => ({
        name: result.project.name,
        summary: result.getSummary()
      }))
    };

    const filename = `multi-analysis-summary.json`;
    const filePath = path.join(summaryDir, filename);

    await fs.writeFile(filePath, JSON.stringify(summary, null, 2), 'utf-8');

    return filePath;
  }
}
