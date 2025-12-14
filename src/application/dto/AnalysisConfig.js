/**
 * Data Transfer Object for analysis configuration
 * Loaded from YAML file with threshold settings
 */
export class AnalysisConfig {
  constructor(config = {}) {
    // Default thresholds from Z-specification
    this.thresholds = {
      // Long Method
      maxLines: config.maxLines || 50,
      maxComplexity: config.maxComplexity || 10,
      maxYields: config.maxYields || 7,

      // Large Class
      maxFields: config.maxFields || 15,
      maxMethods: config.maxMethods || 20,
      maxLOC: config.maxLOC || 400,
      maxExports: config.maxExports || 10,

      // Duplicate Code
      similarityThreshold: config.similarityThreshold || 6,
      minLines: config.minLines || 5,
      minSimilarity: config.minSimilarity || 0.6,

      // Long Parameter List
      maxParams: config.maxParams || 4,
      maxRelatedParams: config.maxRelatedParams || 3,

      // Divergent Change
      maxReasons: config.maxReasons || 3,

      // Shotgun Surgery
      maxClasses: config.maxClasses || 3,

      // Feature Envy
      envyRatio: config.envyRatio || 2.0,

      // Data Clumps
      minClumpSize: config.minClumpSize || 3,
      minOccurrences: config.minOccurrences || 3,

      // Primitive Obsession
      maxMagicNumbers: config.maxMagicNumbers || 5,
      maxMagicStrings: config.maxMagicStrings || 5,
      maxStringGetNodes: config.maxStringGetNodes || 3,
      maxUntypedVars: config.maxUntypedVars || 3,

      // Switch Statements
      maxSwitches: config.maxSwitches || 2,
      maxCases: config.maxCases || 5,

      // Lazy Class
      minLOC: config.minLOC || 20,
      minMethods: config.minMethods || 2,
      minResponsibilities: config.minResponsibilities || 1,

      // Speculative Generality
      unusedMethods: config.unusedMethods || 0,
      unusedParameters: config.unusedParameters || 0,

      // Temporary Field
      conditionalUsage: config.conditionalUsage || false,
      nullChecks: config.nullChecks || 0,

      // Message Chains
      maxChainLength: config.maxChainLength || 3,

      // Middle Man
      maxDelegationRatio: config.maxDelegationRatio || 0.5,

      // Inappropriate Intimacy
      bidirectionalDependency: config.bidirectionalDependency || false,
      sharedIntimacy: config.sharedIntimacy || 0,

      // Data Class
      behaviorMethods: config.behaviorMethods || 0,
      publicFields: config.publicFields || 0,

      // Refused Bequest
      usageRatio: config.usageRatio || 0.3,
      overriddenEmpty: config.overriddenEmpty || 0,

      // Comments
      maxCommentDensity: config.maxCommentDensity || 0.5,

      // Global State
      maxAutoloads: config.maxAutoloads || 5,
      maxGlobalVars: config.maxGlobalVars || 20
    };

    // Enabled detectors
    this.enabledDetectors = config.enabledDetectors || [
      'LongMethod',
      'LargeClass',
      'DuplicateCode',
      'LongParameterList',
      'DivergentChange',
      'ShotgunSurgery',
      'FeatureEnvy',
      'DataClumps',
      'PrimitiveObsession',
      'SwitchStatements',
      'LazyClass',
      'SpeculativeGenerality',
      'TemporaryField',
      'MessageChains',
      'MiddleMan',
      'InappropriateIntimacy',
      'DataClass',
      'RefusedBequest',
      'Comments',
      'GlobalState'
    ];

    // Output settings
    this.output = {
      format: config.output?.format || 'json',
      directory: config.output?.directory || './analysis-results',
      includeDetails: config.output?.includeDetails !== false,
      groupBySeverity: config.output?.groupBySeverity || false
    };

    Object.freeze(this);
  }

  /**
   * Check if a detector is enabled
   */
  isDetectorEnabled(detectorName) {
    return this.enabledDetectors.includes(detectorName);
  }

  /**
   * Get threshold value for a detector
   */
  getThreshold(detectorName, thresholdName) {
    return this.thresholds[thresholdName] || null;
  }

  /**
   * Get all thresholds for a detector
   */
  getDetectorThresholds(detectorName) {
    // Map detector names to their relevant thresholds
    const detectorThresholds = {
      'LongMethod': ['maxLines', 'maxComplexity', 'maxYields'],
      'LargeClass': ['maxFields', 'maxMethods', 'maxLOC', 'maxExports'],
      'DuplicateCode': ['similarityThreshold', 'minLines', 'minSimilarity'],
      'LongParameterList': ['maxParams', 'maxRelatedParams'],
      'DivergentChange': ['maxReasons'],
      'ShotgunSurgery': ['maxClasses'],
      'FeatureEnvy': ['envyRatio'],
      'DataClumps': ['minClumpSize', 'minOccurrences'],
      'PrimitiveObsession': ['maxMagicNumbers', 'maxMagicStrings', 'maxStringGetNodes', 'maxUntypedVars'],
      'SwitchStatements': ['maxSwitches', 'maxCases'],
      'LazyClass': ['minLOC', 'minMethods', 'minResponsibilities'],
      'SpeculativeGenerality': ['unusedMethods', 'unusedParameters'],
      'TemporaryField': ['conditionalUsage', 'nullChecks'],
      'MessageChains': ['maxChainLength'],
      'MiddleMan': ['maxDelegationRatio'],
      'InappropriateIntimacy': ['bidirectionalDependency', 'sharedIntimacy'],
      'DataClass': ['behaviorMethods', 'publicFields'],
      'RefusedBequest': ['usageRatio', 'overriddenEmpty'],
      'Comments': ['maxCommentDensity'],
      'GlobalState': ['maxAutoloads', 'maxGlobalVars']
    };

    const relevantThresholds = detectorThresholds[detectorName] || [];
    const result = {};

    for (const threshold of relevantThresholds) {
      result[threshold] = this.thresholds[threshold];
    }

    return result;
  }

  static fromYAML(yamlConfig) {
    return new AnalysisConfig(yamlConfig);
  }

  static getDefaultConfig() {
    return new AnalysisConfig({});
  }
}
