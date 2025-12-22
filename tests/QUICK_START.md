# Quick Start: Verifying Tests Work

## Step 1: Verify Test Framework Setup

Run the verification script to ensure all test utilities are working:

```bash
npm run test:verify
```

This will:
- Test all mock utilities (SDR client, servers, database, storage)
- Start mock servers and verify they respond
- Test database operations
- Test storage operations
- Clean up test data

**Expected output:**
```
╔═══════════════════════════════════════════════════════════╗
║        Scanner Map Test Framework Verification            ║
╚═══════════════════════════════════════════════════════════╝

✓ Testing MockSDRClient...
  ✓ MockSDRClient: OK
✓ Testing MockTranscriptionServer...
  ✓ MockTranscriptionServer: Started successfully
✓ Testing MockAIServer...
  ✓ MockAIServer: Started successfully
✓ Testing MockGeocodingServer...
  ✓ MockGeocodingServer: Started successfully
✓ Testing DBTestUtils...
  ✓ DBTestUtils: OK
✓ Testing StorageTestUtils...
  ✓ StorageTestUtils: OK
✓ Testing HTTP requests to mock servers...
  ✓ Transcription Server HTTP: OK
  ✓ AI Server HTTP: OK
  ✓ Geocoding Server HTTP: OK

╔═══════════════════════════════════════════════════════════╗
║                      Verification Summary                  ║
╚═══════════════════════════════════════════════════════════╝

  Passed: 9
  Failed: 0
  Total:  9

  ✓ All verification tests passed!
  ✓ Test framework is ready to use.
```

## Step 2: Run a Simple Test

Test that mock servers respond correctly:

```bash
# Start a mock server manually to test
node -e "
const { MockTranscriptionServer } = require('./test/mock-transcription-server');
const server = new MockTranscriptionServer(8765);
server.start().then(() => {
  console.log('Server started on port 8765');
  console.log('Test it with: curl http://localhost:8765/health');
  setTimeout(() => server.stop(), 10000);
});
"
```

Then in another terminal:
```bash
curl http://localhost:8765/health
```

You should see: `{"status":"ok","service":"mock-transcription"}`

## Step 3: Run Unit Tests

```bash
npm run test:unit
```

## Step 4: Run Integration Tests

```bash
npm run test:integration
```

## Step 5: Run End-to-End Tests

```bash
npm run test:e2e
```

## Troubleshooting

### Port Already in Use
If you see "port already in use" errors:
- Mock servers use ports 8765, 8766, 8767
- Make sure these ports are available
- Or modify the port numbers in the test files

### Missing Dependencies
If you see module not found errors:
```bash
npm install
```

### Database Locked
If you see database locked errors:
- Make sure no other process is using the test database
- Test databases are created in the `test/` directory
- They should be cleaned up automatically after tests

## What to Look For

✅ **Success indicators:**
- All verification tests pass
- Mock servers start without errors
- HTTP requests to mock servers return valid responses
- Database operations complete successfully
- Storage operations work correctly

❌ **Failure indicators:**
- Port conflicts
- Module not found errors
- Database errors
- HTTP connection errors

## Next Steps

Once verification passes:
1. Write your own tests using the mock utilities
2. Run the full test suite: `npm test`
3. Check test coverage: `npm run test:coverage`
4. Run with verbose output: `npm run test:verbose`

