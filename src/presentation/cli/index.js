#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import { AnalyzeProjectUseCase } from '../../application/use_cases/AnalyzeProjectUseCase.js';
import { GDScriptProjectRepository } from '../../infrastructure/repositories/GDScriptProjectRepository.js';
import { YAMLConfigRepository } from '../../infrastructure/repositories/YAMLConfigRepository.js';
import { ReportRepository } from '../../infrastructure/repositories/ReportRepository.js';

const program = new Command();

program
  .name('godot-smell-analyzer')
  .description('Code smell analyzer for GDScript projects based on formal Z-specification')
  .version('1.0.0');

program
  .command('analyze <projectPath>')
  .description('Analyze a GDScript project for code smells')
  .option('-c, --config <configPath>', 'Path to YAML configuration file')
  .option('-o, --output <outputDir>', 'Output directory for reports', './analysis-results')
  .option('-f, --format <format>', 'Output format (json, txt, html)', 'json')
  .option('--verbose', 'Enable verbose output')
  .action(async (projectPath, options) => {
    try {
      console.log('🚀 Starting GDScript code smell analysis...');

      // Initialize dependencies
      const projectRepository = new GDScriptProjectRepository();
      const configRepository = new YAMLConfigRepository();
      const reportRepository = new ReportRepository();

      const analyzeUseCase = new AnalyzeProjectUseCase(projectRepository, configRepository);

      // Resolve paths
      const absoluteProjectPath = path.resolve(projectPath);
      const configPath = options.config ? path.resolve(options.config) : null;

      if (options.verbose) {
        console.log(`📁 Project path: ${absoluteProjectPath}`);
        if (configPath) console.log(`⚙️  Config path: ${configPath}`);
        console.log(`📊 Output format: ${options.format}`);
        console.log(`📂 Output directory: ${options.output}`);
      }

      // Execute analysis
      const result = await analyzeUseCase.execute(absoluteProjectPath, configPath);

      // Save report
      const reportPath = await reportRepository.saveResult(result, options.output, options.format);

      // Display summary
      const summary = result.getSummary();

      console.log('\n📊 Analysis Complete!');
      console.log(`📄 Report saved to: ${reportPath}`);
      console.log(`\n📈 Summary:`);
      console.log(`   Classes analyzed: ${summary.projectStats.totalClasses}`);
      console.log(`   Methods analyzed: ${summary.projectStats.totalMethods}`);
      console.log(`   Total LOC: ${summary.projectStats.totalLOC}`);

      if (summary.totalSmells > 0) {
        console.log(`\n⚠️  Code smells detected: ${summary.totalSmells}`);
        console.log(`   Critical: ${summary.bySeverity.Critical}`);
        console.log(`   High: ${summary.bySeverity.High}`);
        console.log(`   Medium: ${summary.bySeverity.Medium}`);
        console.log(`   Low: ${summary.bySeverity.Low}`);
      } else {
        console.log('\n✅ No code smells detected! Your codebase looks clean.');
      }

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('generate-config <outputPath>')
  .description('Generate a sample configuration file')
  .action(async (outputPath) => {
    try {
      const configRepository = new YAMLConfigRepository();
      const absolutePath = path.resolve(outputPath);

      await configRepository.generateSampleConfig(absolutePath);
      console.log(`✅ Sample configuration generated: ${absolutePath}`);
      console.log('Edit this file to customize analysis thresholds and settings.');

    } catch (error) {
      console.error('❌ Failed to generate config:', error.message);
      process.exit(1);
    }
  });

program
  .command('list-detectors')
  .description('List all available code smell detectors')
  .action(() => {
    const detectors = [
      'LongMethod - Methods that are too long or complex',
      'LargeClass - Classes with too many responsibilities',
      'DuplicateCode - Identical or very similar code blocks',
      'LongParameterList - Methods with too many parameters',
      'DivergentChange - Classes changed for different reasons',
      'ShotgunSurgery - One change affects many classes',
      'FeatureEnvy - Methods accessing other classes too much',
      'DataClumps - Groups of variables used together',
      'PrimitiveObsession - Overuse of primitive types',
      'SwitchStatements - Complex conditional logic',
      'LazyClass - Classes that do too little',
      'SpeculativeGenerality - Code for future that never came',
      'TemporaryField - Fields used conditionally',
      'MessageChains - Long chains of method calls',
      'MiddleMan - Classes that just delegate work',
      'InappropriateIntimacy - Classes too tightly coupled',
      'DataClass - Classes that only hold data',
      'RefusedBequest - Inheritance not used properly',
      'Comments - Excessive commenting masking bad code',
      'GlobalState - Overuse of global/singleton state'
    ];

    console.log('Available code smell detectors:');
    detectors.forEach(detector => console.log(`  • ${detector}`));
  });

// Parse command line arguments
program.parse();
