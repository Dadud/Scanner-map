// test-runner.js - Enhanced test runner that actually executes tests

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Enhanced Test Runner
 * Actually executes test files and reports results
 */
class TestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      coverage: options.coverage || false,
      suite: options.suite || 'all',
      bail: options.bail || false, // Stop on first failure
      ...options
    };
    this.results = {
      unit: { passed: 0, failed: 0, total: 0, tests: [] },
      integration: { passed: 0, failed: 0, total: 0, tests: [] },
      e2e: { passed: 0, failed: 0, total: 0, tests: [] }
    };
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * Run all tests
   */
  async run() {
    this.startTime = Date.now();
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           Scanner Map - Test Suite Runner                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    try {
      if (this.options.suite === 'all' || this.options.suite === 'unit') {
        await this.runTestSuite('unit', path.join(__dirname, 'unit'));
      }

      if (this.options.suite === 'all' || this.options.suite === 'integration') {
        await this.runTestSuite('integration', path.join(__dirname, 'integration'));
      }

      if (this.options.suite === 'all' || this.options.suite === 'e2e') {
        await this.runTestSuite('e2e', path.join(__dirname, 'e2e'));
      }

      this.endTime = Date.now();
      this.printSummary();
      
      // Return exit code for CI/CD
      const totalFailed = this.results.unit.failed + 
                         this.results.integration.failed + 
                         this.results.e2e.failed;
      
      return totalFailed === 0 ? 0 : 1;
    } catch (error) {
      console.error('Test runner error:', error);
      return 1;
    }
  }

  /**
   * Run a test suite
   */
  async runTestSuite(suiteName, testDir) {
    if (!fs.existsSync(testDir)) {
      console.log(`⚠ ${suiteName} test directory not found: ${testDir}`);
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Running ${suiteName.toUpperCase()} Tests...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testFiles = this.getTestFiles(testDir);

    if (testFiles.length === 0) {
      console.log(`  ⚠ No test files found in ${suiteName}`);
      return;
    }

    for (const testFile of testFiles) {
      await this.runTestFile(testFile, suiteName);
      
      // Bail on first failure if requested
      if (this.options.bail && this.results[suiteName].failed > 0) {
        console.log(`\n  ⚠ Stopping tests due to failure (--bail)`);
        break;
      }
    }
  }

  /**
   * Get test files from directory
   */
  getTestFiles(dir) {
    return fs.readdirSync(dir)
      .filter(file => file.startsWith('test-') && file.endsWith('.js'))
      .map(file => path.join(dir, file))
      .sort();
  }

  /**
   * Run a single test file using Node.js
   */
  async runTestFile(testFile, suite) {
    return new Promise((resolve) => {
      const testName = path.basename(testFile);
      const relativePath = path.relative(__dirname, testFile);
      
      console.log(`\n  📝 ${relativePath}`);

      // Use Node.js to execute the test file
      // Test files should export test functions or use a simple test framework
      const child = spawn('node', [testFile], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';
      let testResult = {
        name: testName,
        passed: false,
        error: null,
        output: ''
      };

      child.stdout.on('data', (data) => {
        const text = data.toString();
        stdout += text;
        if (this.options.verbose) {
          process.stdout.write(text);
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        stderr += text;
        if (this.options.verbose) {
          process.stderr.write(text);
        }
      });

      child.on('close', (code) => {
        testResult.output = stdout + stderr;
        
        if (code === 0) {
          // Check if output indicates success
          const hasError = stderr.toLowerCase().includes('error') || 
                          stderr.toLowerCase().includes('failed') ||
                          stdout.toLowerCase().includes('✗') ||
                          stdout.toLowerCase().includes('FAIL');
          
          if (!hasError && (stdout.includes('✓') || stdout.includes('PASS') || stdout.trim() === '')) {
            testResult.passed = true;
            this.results[suite].passed++;
            console.log(`    ✓ ${testName} - PASSED`);
          } else {
            testResult.passed = false;
            testResult.error = 'Test output indicates failure';
            this.results[suite].failed++;
            console.log(`    ✗ ${testName} - FAILED`);
            if (!this.options.verbose && testResult.output) {
              console.log(`      Output: ${testResult.output.substring(0, 200)}...`);
            }
          }
        } else {
          testResult.passed = false;
          testResult.error = `Exit code: ${code}`;
          this.results[suite].failed++;
          console.log(`    ✗ ${testName} - FAILED (exit code: ${code})`);
          if (!this.options.verbose && testResult.output) {
            console.log(`      Error: ${testResult.output.substring(0, 200)}...`);
          }
        }

        this.results[suite].total++;
        this.results[suite].tests.push(testResult);
        resolve();
      });

      child.on('error', (error) => {
        testResult.passed = false;
        testResult.error = error.message;
        this.results[suite].failed++;
        this.results[suite].total++;
        this.results[suite].tests.push(testResult);
        console.log(`    ✗ ${testName} - ERROR: ${error.message}`);
        resolve();
      });
    });
  }

  /**
   * Print test summary
   */
  printSummary() {
    const duration = ((this.endTime - this.startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                      Test Summary                         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    for (const [suite, results] of Object.entries(this.results)) {
      if (results.total > 0) {
        totalPassed += results.passed;
        totalFailed += results.failed;
        totalTests += results.total;

        const status = results.failed === 0 ? '✓' : '✗';
        const percentage = ((results.passed / results.total) * 100).toFixed(1);
        console.log(`  ${status} ${suite.toUpperCase()}: ${results.passed}/${results.total} passed (${percentage}%)`);
        
        if (results.failed > 0) {
          console.log(`    Failed tests:`);
          results.tests
            .filter(t => !t.passed)
            .forEach(t => {
              console.log(`      - ${t.name}${t.error ? `: ${t.error}` : ''}`);
            });
        }
      }
    }

    console.log('');
    console.log(`  Total: ${totalPassed}/${totalTests} passed (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`  Duration: ${duration}s`);
    
    if (totalFailed > 0) {
      console.log(`  ${totalFailed} test(s) failed`);
      console.log('');
      console.log('  ⚠ Some tests failed. Review the output above for details.');
      return false;
    } else {
      console.log('  ✓ All tests passed!');
      console.log('');
      return true;
    }
  }

  /**
   * Get results as JSON (for CI/CD integration)
   */
  getResultsJSON() {
    return {
      summary: {
        total: this.results.unit.total + this.results.integration.total + this.results.e2e.total,
        passed: this.results.unit.passed + this.results.integration.passed + this.results.e2e.passed,
        failed: this.results.unit.failed + this.results.integration.failed + this.results.e2e.failed,
        duration: this.endTime - this.startTime
      },
      suites: this.results
    };
  }
}

module.exports = TestRunner;

