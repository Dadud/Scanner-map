// regression-test.js - Run regression tests to verify features don't break

const TestRunner = require('./test-runner');
const fs = require('fs');
const path = require('path');

/**
 * Regression Test Runner
 * Runs all tests and compares against baseline to detect regressions
 */
class RegressionTest {
  constructor() {
    this.baselineFile = path.join(__dirname, 'regression-baseline.json');
    this.baseline = this.loadBaseline();
  }

  loadBaseline() {
    if (fs.existsSync(this.baselineFile)) {
      try {
        return JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
      } catch (error) {
        console.warn('Could not load baseline:', error.message);
        return null;
      }
    }
    return null;
  }

  saveBaseline(results) {
    const baseline = {
      timestamp: new Date().toISOString(),
      results: results.getResultsJSON()
    };
    
    fs.writeFileSync(this.baselineFile, JSON.stringify(baseline, null, 2));
    console.log(`\n✓ Baseline saved to ${this.baselineFile}`);
  }

  compareResults(currentResults, baselineResults) {
    const regressions = [];
    const improvements = [];

    // Compare test counts
    if (baselineResults) {
      const baseline = baselineResults.results || baselineResults;
      const current = currentResults.summary;

      // Check for new failures
      if (current.failed > baseline.failed) {
        regressions.push({
          type: 'new_failures',
          message: `New test failures detected: ${current.failed - baseline.failed} additional failures`,
          baseline: baseline.failed,
          current: current.failed
        });
      }

      // Check for tests that were passing but now fail
      if (baseline.passed > current.passed) {
        regressions.push({
          type: 'regression',
          message: `Tests that were passing now fail: ${baseline.passed - current.passed} tests`,
          baseline: baseline.passed,
          current: current.passed
        });
      }

      // Check for improvements
      if (current.passed > baseline.passed) {
        improvements.push({
          type: 'improvement',
          message: `Tests that were failing now pass: ${current.passed - baseline.passed} tests`,
          baseline: baseline.passed,
          current: current.passed
        });
      }
    }

    return { regressions, improvements };
  }

  async run(options = {}) {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║              Regression Test Suite                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');

    const runner = new TestRunner({
      suite: options.suite || 'all',
      verbose: options.verbose || false,
      bail: options.bail || false
    });

    const exitCode = await runner.run();
    const results = runner.getResultsJSON();

    // Compare with baseline
    if (this.baseline) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Regression Analysis');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      const comparison = this.compareResults(results, this.baseline.results);

      if (comparison.regressions.length > 0) {
        console.log('  ⚠ REGRESSIONS DETECTED:');
        comparison.regressions.forEach(reg => {
          console.log(`    ✗ ${reg.message}`);
        });
        console.log('');
      }

      if (comparison.improvements.length > 0) {
        console.log('  ✓ IMPROVEMENTS:');
        comparison.improvements.forEach(imp => {
          console.log(`    ✓ ${imp.message}`);
        });
        console.log('');
      }

      if (comparison.regressions.length === 0 && comparison.improvements.length === 0) {
        console.log('  ✓ No regressions detected. Test results match baseline.');
        console.log('');
      }
    } else {
      console.log('\n  ℹ No baseline found. This run will be saved as the new baseline.');
      console.log('  Run tests again to compare against this baseline.\n');
    }

    // Save new baseline if requested or if no baseline exists
    if (options.updateBaseline || !this.baseline) {
      this.saveBaseline(runner);
    }

    return exitCode;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 'all',
    verbose: args.includes('--verbose') || args.includes('-v'),
    bail: args.includes('--bail'),
    updateBaseline: args.includes('--update-baseline') || args.includes('-u')
  };

  const regressionTest = new RegressionTest();
  regressionTest.run(options).then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RegressionTest;

