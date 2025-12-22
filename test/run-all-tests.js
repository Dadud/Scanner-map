// run-all-tests.js - Test runner that orchestrates all test suites

const TestRunner = require('./test-runner');
const path = require('path');
const fs = require('fs');

// Use the enhanced TestRunner

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    suite: args.find(arg => arg.startsWith('--suite='))?.split('=')[1] || 
           args.find(arg => arg.startsWith('-s='))?.split('=')[1] || 'all',
    bail: args.includes('--bail')
  };

  const runner = new TestRunner(options);
  runner.run().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;

