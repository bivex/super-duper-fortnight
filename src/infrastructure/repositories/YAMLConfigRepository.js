import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { AnalysisConfig } from '../../application/dto/AnalysisConfig.js';

/**
 * Repository for loading analysis configuration from YAML files
 * Infrastructure layer adapter for configuration persistence
 */
export class YAMLConfigRepository {
  /**
   * Load configuration from YAML file
   * @param {string} configPath - Path to the YAML configuration file
   * @returns {Promise<AnalysisConfig>} Loaded configuration
   */
  async loadFromFile(configPath) {
    try {
      const absolutePath = path.resolve(configPath);
      const yamlContent = await fs.readFile(absolutePath, 'utf-8');
      const configData = yaml.load(yamlContent);

      return AnalysisConfig.fromYAML(configData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Get default configuration
   * @returns {AnalysisConfig} Default configuration
   */
  getDefaultConfig() {
    return AnalysisConfig.getDefaultConfig();
  }

  /**
   * Save configuration to YAML file
   * @param {AnalysisConfig} config - Configuration to save
   * @param {string} configPath - Path where to save the configuration
   */
  async saveToFile(config, configPath) {
    try {
      const absolutePath = path.resolve(configPath);
      const yamlContent = yaml.dump({
        thresholds: config.thresholds,
        enabledDetectors: config.enabledDetectors,
        output: config.output
      });

      await fs.writeFile(absolutePath, yamlContent, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  /**
   * Generate sample configuration file
   * @param {string} outputPath - Where to save the sample config
   */
  async generateSampleConfig(outputPath) {
    const sampleConfig = {
      // Thresholds based on Z-specification defaults
      maxLines: 50,
      maxComplexity: 10,
      maxYields: 7,
      maxFields: 15,
      maxMethods: 20,
      maxLOC: 400,
      maxExports: 10,
      similarityThreshold: 6,
      minLines: 5,
      minSimilarity: 0.6,

      // Enabled detectors
      enabledDetectors: [
        'LongMethod',
        'LargeClass',
        'DuplicateCode'
      ],

      // Output settings
      output: {
        format: 'json',
        directory: './analysis-results',
        includeDetails: true,
        groupBySeverity: false
      }
    };

    await this.saveToFile(new AnalysisConfig(sampleConfig), outputPath);
  }
}
