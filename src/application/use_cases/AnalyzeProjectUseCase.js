import { AnalysisResult } from '../dto/AnalysisResult.js';
import { LongMethodDetector } from '../../domain/services/detectors/LongMethodDetector.js';
import { LargeClassDetector } from '../../domain/services/detectors/LargeClassDetector.js';
import { DuplicateCodeDetector } from '../../domain/services/detectors/DuplicateCodeDetector.js';
import { LongParameterListDetector } from '../../domain/services/detectors/LongParameterListDetector.js';
import { DivergentChangeDetector } from '../../domain/services/detectors/DivergentChangeDetector.js';
import { ShotgunSurgeryDetector } from '../../domain/services/detectors/ShotgunSurgeryDetector.js';
import { FeatureEnvyDetector } from '../../domain/services/detectors/FeatureEnvyDetector.js';
import { DataClumpsDetector } from '../../domain/services/detectors/DataClumpsDetector.js';
import { PrimitiveObsessionDetector } from '../../domain/services/detectors/PrimitiveObsessionDetector.js';
import { SwitchStatementsDetector } from '../../domain/services/detectors/SwitchStatementsDetector.js';
import { LazyClassDetector } from '../../domain/services/detectors/LazyClassDetector.js';
import { SpeculativeGeneralityDetector } from '../../domain/services/detectors/SpeculativeGeneralityDetector.js';
import { TemporaryFieldDetector } from '../../domain/services/detectors/TemporaryFieldDetector.js';
import { MessageChainsDetector } from '../../domain/services/detectors/MessageChainsDetector.js';
import { MiddleManDetector } from '../../domain/services/detectors/MiddleManDetector.js';
import { InappropriateIntimacyDetector } from '../../domain/services/detectors/InappropriateIntimacyDetector.js';
import { DataClassDetector } from '../../domain/services/detectors/DataClassDetector.js';
import { RefusedBequestDetector } from '../../domain/services/detectors/RefusedBequestDetector.js';
import { CommentsDetector } from '../../domain/services/detectors/CommentsDetector.js';
import { GlobalStateDetector } from '../../domain/services/detectors/GlobalStateDetector.js';

/**
 * Use case for analyzing a GDScript project for code smells
 * Orchestrates the analysis process using domain services
 */
export class AnalyzeProjectUseCase {
  constructor(projectRepository, configRepository) {
    this.projectRepository = projectRepository;
    this.configRepository = configRepository;
    this.detectors = this.initializeDetectors();
  }

  /**
   * Initialize all available code smell detectors
   */
  initializeDetectors() {
    return [
      new LongMethodDetector(),
      new LargeClassDetector(),
      new DuplicateCodeDetector(),
      new LongParameterListDetector(),
      new DivergentChangeDetector(),
      new ShotgunSurgeryDetector(),
      new FeatureEnvyDetector(),
      new DataClumpsDetector(),
      new PrimitiveObsessionDetector(),
      new SwitchStatementsDetector(),
      new LazyClassDetector(),
      new SpeculativeGeneralityDetector(),
      new TemporaryFieldDetector(),
      new MessageChainsDetector(),
      new MiddleManDetector(),
      new InappropriateIntimacyDetector(),
      new DataClassDetector(),
      new RefusedBequestDetector(),
      new CommentsDetector(),
      new GlobalStateDetector()
    ];
  }

  /**
   * Execute the analysis use case
   * @param {string} projectPath - Path to the project directory
   * @param {string} configPath - Path to the configuration YAML file (optional)
   * @returns {Promise<AnalysisResult>} Analysis results
   */
  async execute(projectPath, configPath = null) {
    const startTime = Date.now();

    try {
      // Load configuration
      const config = configPath
        ? await this.configRepository.loadFromFile(configPath)
        : this.configRepository.getDefaultConfig();

      // Load and parse project
      const project = await this.projectRepository.loadFromDirectory(projectPath);

      // Run analysis
      const results = await this.analyzeProject(project, config);

      // Create result object
      const metadata = {
        duration: Date.now() - startTime,
        totalFiles: this.countFiles(project),
        totalClasses: project.classes.size,
        totalMethods: this.countMethods(project)
      };

      return AnalysisResult.from(project, results, config, metadata);

    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze the project using all enabled detectors
   */
  async analyzeProject(project, config) {
    const results = [];

    try {
      // Analyze methods
      for (const class_ of project.classes) {
        for (const method of class_.methods) {
          // Create context object for detectors
          const methodContext = {
            method,
            ownerClass: class_,
            filePath: class_.filePath
          };

          for (const detector of this.detectors) {
            if (config.isDetectorEnabled(detector.getName())) {
            try {
              const thresholds = config.getDetectorThresholds(detector.getName());
              const result = detector.detect(methodContext, thresholds);
              if (result !== null) {
                results.push(result);
              }
            } catch (error) {
                console.error(`Error in ${detector.getName()} for method ${method.name}:`, error.message);
              }
            }
          }
        }
      }

      // Analyze classes
      for (const class_ of project.classes) {
        // Create context object for detectors
        const classContext = {
          class: class_,
          project: project,
          filePath: class_.filePath
        };

        for (const detector of this.detectors) {
          if (config.isDetectorEnabled(detector.getName())) {
            try {
              const thresholds = config.getDetectorThresholds(detector.getName());
              const result = detector.detect(classContext, thresholds);
              if (result !== null) {
                results.push(result);
              }
            } catch (error) {
              console.error(`Error in ${detector.getName()} for class ${class_.name}:`, error.message);
            }
          }
        }
      }

      // Analyze project-level smells
      for (const detector of this.detectors) {
        if (config.isDetectorEnabled(detector.getName())) {
          try {
            const thresholds = config.getDetectorThresholds(detector.getName());
            const projectContext = {
              project: project
            };
            const result = detector.detect(projectContext, thresholds);
            if (result !== null) {
              results.push(result);
            }
          } catch (error) {
            console.error(`Error in ${detector.getName()} for project:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error in analyzeProject:', error.message);
      throw error;
    }

    return results;
  }

  /**
   * Count total files in project
   */
  countFiles(project) {
    // This is a simplified count - in reality we'd track unique files
    return project.classes.size + project.scenes.size;
  }

  /**
   * Count total methods in project
   */
  countMethods(project) {
    let total = 0;
    for (const class_ of project.classes) {
      total += class_.methods.size;
    }
    return total;
  }
}
