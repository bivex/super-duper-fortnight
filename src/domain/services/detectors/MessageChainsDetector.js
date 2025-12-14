import { CodeSmellDetector, CodeSmellResult } from '../CodeSmellDetector.js';

/**
 * Detector for Message Chains code smell
 * Based on Z-specification: MessageChains
 */
export class MessageChainsDetector extends CodeSmellDetector {
  getName() {
    return 'MessageChains';
  }

  getDescription() {
    return 'Long chains of method calls that traverse multiple objects';
  }

  detect(context, thresholds = {}) {
    // Can detect on methods or classes
    const target = context.method || context.class;
    if (!target) return null;

    // Default thresholds from Z-specification
    const maxChainLength = thresholds.maxChainLength || 3;

    const chains = this.findMessageChains(target);

    // Detection logic from Z-specification
    const isDetected = chains.length > 0;

    let severity = null;
    if (isDetected) {
      // Severity calculation from Z-specification
      const maxDepth = Math.max(...chains.map(c => c.length));
      if (maxDepth > 5) {
        severity = 'High';
      } else if (maxDepth > 3) {
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
      chainsCount: chains.length,
      chains: chains,
      maxChainLength,
      totalChainsLength: chains.reduce((sum, c) => sum + c.length, 0)
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
   * Find message chains in the target
   */
  findMessageChains(target) {
    const chains = [];

    if (target.lines) {
      // Method analysis
      chains.push(...this.findChainsInMethod(target));
    } else {
      // Class analysis
      for (const method of target.methods) {
        chains.push(...this.findChainsInMethod(method));
      }
    }

    return chains;
  }

  /**
   * Find message chains in a method
   */
  findChainsInMethod(method) {
    const chains = [];

    for (const line of method.lines) {
      const content = line.content;

      // Find method call chains like a.b().c().d()
      const callChains = this.extractCallChains(content);
      for (const chain of callChains) {
        if (chain.length > 3) { // More than 3 calls in chain
          chains.push({
            chain: chain,
            length: chain.length,
            line: line.lineNumber || method.lines.indexOf(line) + 1,
            type: 'method_chain'
          });
        }
      }

      // Find Godot-specific node path chains like $Node/Child/Grandchild
      const nodePathChains = this.extractNodePathChains(content);
      for (const chain of nodePathChains) {
        if (chain.length > 3) {
          chains.push({
            chain: chain,
            length: chain.length,
            line: line.lineNumber || method.lines.indexOf(line) + 1,
            type: 'node_path'
          });
        }
      }
    }

    return chains;
  }

  /**
   * Extract method call chains from a line
   */
  extractCallChains(content) {
    const chains = [];

    // Simple regex to find chained method calls
    // This is a simplified implementation - a full parser would be more accurate
    const chainRegex = /(\w+(?:\.\w+\(\s*\))+)/g;
    let match;

    while ((match = chainRegex.exec(content)) !== null) {
      const chainStr = match[1];
      const calls = chainStr.split('.').filter(part => part.includes('('));

      if (calls.length > 1) {
        chains.push(calls.map(call => call.replace('()', '')));
      }
    }

    return chains;
  }

  /**
   * Extract Godot node path chains from a line
   */
  extractNodePathChains(content) {
    const chains = [];

    // Find Godot node paths like $Node/Child/Grandchild
    const nodePathRegex = /\$([^\/\s]+)/g;
    let match;

    while ((match = nodePathRegex.exec(content)) !== null) {
      const path = match[1];

      // Split by '/' to get path segments
      const segments = path.split('/');
      if (segments.length > 1) {
        chains.push(segments);
      }
    }

    return chains;
  }
}
