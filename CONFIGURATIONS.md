# Godot Smell Analyzer - Configuration Guide

This document explains the three pre-configured experience levels and how to choose the right configuration for your project.

## Configuration Levels Overview

### 🎓 Middle Level (`middle-config.yaml`)
**Target Audience:** Junior to intermediate developers, students, hobbyists
**Philosophy:** Learning-friendly with more lenient thresholds to avoid overwhelming beginners

**Key Characteristics:**
- Higher tolerance for complexity and size during development
- Allows more magic numbers and hardcoded values
- Permits longer methods for feature development
- Focus on major architectural issues rather than minor style issues

**Use Cases:**
- Learning GDScript and Godot development
- Prototyping and early-stage development
- Personal projects and game jams
- Educational environments

**Threshold Highlights:**
- Max method lines: 80 (vs 45 in studio)
- Max class fields: 20 (vs 12 in studio)
- Magic numbers allowed: 8 (vs 3 in studio)

---

### 👨‍💼 Senior Level (`senior-config.yaml`)
**Target Audience:** Experienced developers, professional teams
**Philosophy:** Balanced professional standards that encourage good practices

**Key Characteristics:**
- Reasonable limits that promote maintainable code
- Encourages separation of concerns and encapsulation
- Balances productivity with code quality
- Suitable for most commercial projects

**Use Cases:**
- Professional game development projects
- Team-based development environments
- Projects with multiple contributors
- Code that will be maintained long-term

**Threshold Highlights:**
- Max method lines: 60 (balanced approach)
- Max complexity: 12 (professional standard)
- Quality gates: 1 high-severity smell per file

---

### 🏢 Studio Level (`studio-config.yaml`)
**Target Audience:** Professional game studios, enterprise teams
**Philosophy:** Strict enterprise standards for maximum maintainability and scalability

**Key Characteristics:**
- Zero tolerance for critical issues
- Strict limits on complexity and size
- Quality gates enforced for CI/CD integration
- Designed for large-scale, long-term projects

**Use Cases:**
- AAA game development studios
- Enterprise software projects
- Projects with large teams and long lifecycles
- Codebases that must be maintained for years
- Projects requiring high reliability and performance

**Threshold Highlights:**
- Max method lines: 45 (strict limit)
- Max complexity: 10 (very low tolerance)
- Quality gates: Zero critical smells allowed
- Inheritance depth limit: 3 levels

## Threshold Comparison Table

| Detector Category | Middle | Senior | Studio | Rationale |
|-------------------|--------|--------|--------|-----------|
| **Method Length** | 80 lines | 60 lines | 45 lines | Shorter methods are more maintainable |
| **Cyclomatic Complexity** | 15 | 12 | 10 | Lower complexity reduces bugs |
| **Class Fields** | 20 | 15 | 12 | Fewer fields improve encapsulation |
| **Class Methods** | 25 | 20 | 15 | Focused classes are easier to understand |
| **Parameters** | 8 | 6 | 4 | Fewer parameters reduce coupling |
| **Magic Numbers** | 8 | 5 | 3 | Named constants improve readability |
| **Switch Cases** | 12 | 8 | 6 | Prefer polymorphism over large switches |

## Quality Gates (Senior & Studio Only)

### Senior Level Gates:
- Max 1 high-severity smell per file
- Group results by severity for easier review
- Balanced approach to quality enforcement

### Studio Level Gates:
- **Zero critical smells** (blocks builds)
- Max 1 high-severity smell per file
- Max 3 medium-severity smells per file
- Max 20 total smells per project
- Average complexity ≤ 8 per project
- **CI/CD integration** with build failure on violations

## Choosing the Right Configuration

### Quick Decision Guide:

**Choose Middle if:**
- You're learning GDScript/Godot
- Working on prototypes or personal projects
- Want to focus on functionality over perfection
- Part of an educational program

**Choose Senior if:**
- You have 2+ years of development experience
- Working on commercial projects
- Part of a development team
- Code will be maintained by others

**Choose Studio if:**
- Working in a professional game studio
- Project has 10+ developers
- Codebase will live for 5+ years
- Requires enterprise-grade quality standards
- Using CI/CD pipelines

### Migration Path:

Most projects should start with **Middle** configuration during early development, then migrate to **Senior** as the project matures, and finally adopt **Studio** standards for production releases.

## Custom Configuration

For specialized needs, you can create custom configurations by copying and modifying any of the provided config files. Common customizations include:

- Industry-specific thresholds (e.g., mobile games vs. desktop games)
- Team-specific coding standards
- Project-phase appropriate settings (prototyping vs. production)
- Legacy codebase accommodations

## CI/CD Integration

The Studio configuration includes CI/CD-ready settings:

```yaml
ci:
  failOnQualityGate: true   # Fail builds on quality violations
  generateReport: true      # Always generate reports
  uploadResults: true       # Upload to quality dashboards
```

This enables automated code quality enforcement in your development pipeline.

## Configuration Validation

All configurations are validated at startup to ensure:
- Required thresholds are present
- Values are within acceptable ranges
- Enabled detectors exist
- Output formats are supported

Invalid configurations will show clear error messages with suggestions for fixes.
