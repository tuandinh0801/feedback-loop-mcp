#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class NPMPackageBuilder {
  constructor() {
    this.rootDir = path.dirname(__dirname);
    this.srcDir = path.join(this.rootDir, 'src');
    this.outputDir = path.join(this.rootDir, 'npm-package');
  }

  async build() {
    console.log('🏗️  Building NPM package...');
    
    try {
      await this.cleanOutput();
      await this.createDirectories();
      await this.copySourceFiles();
      await this.copyBinaryFile();
      await this.copyPackageJson();
      await this.makeExecutable();
      
      console.log('✅ NPM package built successfully!');
      console.log(`📦 Package location: ${this.outputDir}`);
      console.log('💡 To install globally: npm install -g ./npm-package');
      console.log('💡 To publish: cd npm-package && npm publish');
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async cleanOutput() {
    console.log('🧹 Cleaning output directory...');
    await fs.remove(this.outputDir);
  }

  async createDirectories() {
    console.log('📁 Creating directories...');
    await fs.ensureDir(path.join(this.outputDir, 'bin'));
    await fs.ensureDir(path.join(this.outputDir, 'server'));
    await fs.ensureDir(path.join(this.outputDir, 'renderer'));
    await fs.ensureDir(path.join(this.outputDir, 'assets'));
  }

  async copySourceFiles() {
    console.log('📋 Copying source files...');
    
    const filesToCopy = [
      { src: 'main.mjs', dest: 'main.mjs' },
      { src: 'preload.mjs', dest: 'preload.mjs' },
      { src: 'README.md', dest: 'README.md' }
    ];

    const dirsToCopy = [
      { src: 'renderer', dest: 'renderer' },
      { src: 'server', dest: 'server' },
      { src: 'assets', dest: 'assets' }
    ];

    // Copy individual files
    for (const file of filesToCopy) {
      const srcPath = path.join(this.rootDir, file.src);
      const destPath = path.join(this.outputDir, file.dest);
      
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
        console.log(`  ✓ ${file.src}`);
      } else {
        console.warn(`  ⚠️  ${file.src} not found, skipping`);
      }
    }

    // Copy directories
    for (const dir of dirsToCopy) {
      const srcPath = path.join(this.rootDir, dir.src);
      const destPath = path.join(this.outputDir, dir.dest);
      
      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
        console.log(`  ✓ ${dir.src}/`);
      } else {
        console.warn(`  ⚠️  ${dir.src}/ not found, skipping`);
      }
    }
  }

  async copyBinaryFile() {
    console.log('🔧 Copying binary file...');
    const srcBin = path.join(this.srcDir, 'bin', 'feedback-loop-mcp.js');
    const destBin = path.join(this.outputDir, 'bin', 'feedback-loop-mcp');
    
    if (await fs.pathExists(srcBin)) {
      await fs.copy(srcBin, destBin);
      console.log('  ✓ bin/feedback-loop-mcp');
    } else {
      throw new Error('Binary source file not found: ' + srcBin);
    }
  }

  async copyPackageJson() {
    console.log('📄 Copying package.json...');
    const srcPackage = path.join(this.srcDir, 'package.json');
    const destPackage = path.join(this.outputDir, 'package.json');
    
    if (await fs.pathExists(srcPackage)) {
      await fs.copy(srcPackage, destPackage);
      console.log('  ✓ package.json');
    } else {
      throw new Error('Package.json source file not found: ' + srcPackage);
    }
  }

  async makeExecutable() {
    console.log('🔐 Making binary executable...');
    const binPath = path.join(this.outputDir, 'bin', 'feedback-loop-mcp');
    await fs.chmod(binPath, '755');
    console.log('  ✓ Binary is now executable');
  }
}

// Run the builder if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new NPMPackageBuilder();
  builder.build();
}

export default NPMPackageBuilder;