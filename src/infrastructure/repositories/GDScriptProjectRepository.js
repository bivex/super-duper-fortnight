import fs from 'fs/promises';
import path from 'path';
import Parser from 'tree-sitter';
import GDScript from 'tree-sitter-gdscript';
import { GDScriptProject } from '../../domain/entities/GDScriptProject.js';
import { Class } from '../../domain/entities/Class.js';
import { Method } from '../../domain/entities/Method.js';
import { Parameter } from '../../domain/entities/Parameter.js';
import { Identifier } from '../../domain/value_objects/Identifier.js';
import { CodeLine } from '../../domain/value_objects/CodeLine.js';

/**
 * Repository for loading GDScript projects from file system
 * Uses tree-sitter-gdscript to parse GDScript files
 */
export class GDScriptProjectRepository {
  constructor() {
    this.parser = new Parser();
    this.parser.setLanguage(GDScript);
  }

  /**
   * Load project from directory
   * @param {string} directoryPath - Path to the project directory
   * @returns {Promise<GDScriptProject>} Loaded project
   */
  async loadFromDirectory(directoryPath) {
    const absolutePath = path.resolve(directoryPath);

    // Find all GDScript files
    const gdFiles = await this.findGDScriptFiles(absolutePath);

    // Parse all files
    const classes = [];
    const scenes = [];
    const autoloads = [];

    for (const filePath of gdFiles) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedEntities = this.parseFile(filePath, fileContent);

      classes.push(...parsedEntities.classes);
      scenes.push(...parsedEntities.scenes);

      // Check if this is an autoload (convention: autoloads are in root directory)
      if (path.dirname(filePath) === absolutePath) {
        autoloads.push(...parsedEntities.classes);
      }
    }

    // Create project name from directory
    const projectName = path.basename(absolutePath);

    return new GDScriptProject(classes, scenes, autoloads, [], projectName);
  }

  /**
   * Find all .gd files in directory recursively
   */
  async findGDScriptFiles(directoryPath) {
    const files = [];

    async function scanDirectory(dirPath) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'addons') {
          await scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.gd')) {
          files.push(fullPath);
        }
      }
    }

    await scanDirectory(directoryPath);
    return files;
  }

  /**
   * Parse a single GDScript file
   */
  parseFile(filePath, content) {
    try {
      const tree = this.parser.parse(content);
      const classes = [];
      const scenes = [];

      // For GDScript, each file is typically one class
      // Look for extends statement to identify the main class
      const class_ = this.parseAsClass(tree.rootNode, filePath);
      if (class_) {
        classes.push(class_);
      }

      return { classes, scenes };
    } catch (error) {
      console.warn(`Warning: Failed to parse ${filePath}: ${error.message}`);
      // Return empty result for this file
      return { classes: [], scenes: [] };
    }
  }

  /**
   * Parse entire file as a GDScript class
   */
  parseAsClass(rootNode, filePath) {
    // Extract class name from filename
    const fileName = path.basename(filePath, '.gd');
    let className = fileName.charAt(0).toUpperCase() + fileName.slice(1);

    let parentName = null;
    const fields = new Set();
    const methods = new Set();
    const exportedVars = new Set();

    // Walk through all top-level nodes
    for (const node of rootNode.children) {
      if (node.type === 'extends_statement') {
        parentName = this.extractInheritance(node);
      } else if (node.type === 'variable_statement') {
        const varInfo = this.parseVariableStatement(node);
        if (varInfo) {
          fields.add(varInfo.name);
          if (varInfo.isExported) {
            exportedVars.add(varInfo.name);
          }
        }
      } else if (node.type === 'function_definition') {
        const method = this.parseFunctionDefinition(node, filePath);
        if (method) {
          methods.add(method);
        }
      }
    }

    const identifier = Identifier.from(className);
    const parent = parentName ? Identifier.from(parentName) : null;

    return new Class(identifier, fields, methods, parent, exportedVars, false, filePath);
  }

  /**
   * Parse class definition from syntax tree (for future use)
   */
  parseClassDefinition(node, filePath) {
    let className = 'AnonymousClass';
    let parentName = null;
    const fields = new Set();
    const methods = new Set();
    const exportedVars = new Set();

    // Extract class name and inheritance
    for (const child of node.children) {
      if (child.type === 'class_name') {
        className = this.extractText(child);
      } else if (child.type === 'extends_statement') {
        parentName = this.extractInheritance(child);
      } else if (child.type === 'variable_statement') {
        const varInfo = this.parseVariableStatement(child);
        if (varInfo) {
          fields.add(varInfo.name);
          if (varInfo.isExported) {
            exportedVars.add(varInfo.name);
          }
        }
      } else if (child.type === 'function_definition') {
        const method = this.parseFunctionDefinition(child, filePath);
        if (method) {
          methods.add(method);
        }
      }
    }

    const identifier = Identifier.from(className);
    const parent = parentName ? Identifier.from(parentName) : null;

    return new Class(identifier, fields, methods, parent, exportedVars, false, filePath);
  }

  /**
   * Parse function definition
   */
  parseFunctionDefinition(node, filePath) {
    let methodName = '';
    const parameters = [];
    const lines = [];

    for (const child of node.children) {
      if (child.type === 'name') {
        methodName = this.extractText(child);
      } else if (child.type === 'parameters') {
        // Parse parameters
        for (const paramNode of child.children) {
          if (paramNode.type === 'typed_parameter') {
            const param = this.parseParameter(paramNode);
            if (param) {
              parameters.push(param);
            }
          }
        }
      } else if (child.type === 'body') {
        // Extract code lines
        lines.push(...this.extractBodyLines(child));
      }
    }

    if (!methodName) return null;

    const identifier = Identifier.from(methodName);
    const codeLines = lines.map((line, index) => CodeLine.from(line, index + 1));

    return new Method(identifier, parameters, codeLines, new Set(), new Set());
  }

  /**
   * Parse parameter
   */
  parseParameter(node) {
    let paramName = '';
    let paramType = 'dynamic';

    for (const child of node.children) {
      if (child.type === 'name') {
        paramName = this.extractText(child);
      } else if (child.type === 'type') {
        paramType = this.extractText(child);
      }
    }

    if (!paramName) return null;

    return Parameter.from(paramName, paramType);
  }

  /**
   * Parse variable statement
   */
  parseVariableStatement(node) {
    let varName = '';
    let isExported = false;

    for (const child of node.children) {
      if (child.type === 'annotations') {
        // Check for @export annotation
        for (const annotation of child.children) {
          if (annotation.type === 'annotation' && this.extractText(annotation) === '@export') {
            isExported = true;
          }
        }
      } else if (child.type === 'name') {
        varName = this.extractText(child);
      }
    }

    if (!varName) return null;

    return { name: Identifier.from(varName), isExported };
  }

  /**
   * Extract inheritance information
   */
  extractInheritance(node) {
    for (const child of node.children) {
      if (child.type === 'type') {
        return this.extractText(child);
      }
    }
    return null;
  }

  /**
   * Extract body lines from function body
   */
  extractBodyLines(node) {
    const lines = [];

    this.walkTree(node, (childNode) => {
      if (childNode.type === 'expression_statement' ||
          childNode.type === 'assignment' ||
          childNode.type === 'call' ||
          childNode.type === 'return_statement' ||
          childNode.type === 'if_statement' ||
          childNode.type === 'for_statement' ||
          childNode.type === 'while_statement') {
        lines.push(this.extractText(childNode));
      }
    });

    return lines;
  }

  /**
   * Walk syntax tree and execute callback on each node
   */
  walkTree(node, callback) {
    callback(node);
    for (const child of node.children) {
      this.walkTree(child, callback);
    }
  }

  /**
   * Extract text content from node
   */
  extractText(node) {
    return node.text.trim();
  }
}
