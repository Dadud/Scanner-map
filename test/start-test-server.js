// start-test-server.js - Start the test results web server

const TestResultsServer = require('./test-results-server');

const server = new TestResultsServer(8768);

server.start()
  .then(() => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     Scanner Map Test Results Server                      ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✓ Test results server started!`);
    console.log(`✓ Open your browser and navigate to:`);
    console.log(`  ${server.getUrl()}`);
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
  })
  .catch(error => {
    console.error('Failed to start test server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down test server...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

