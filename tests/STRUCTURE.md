# Test Suite Structure

All test files are organized in the `tests/` subfolder to keep the root directory clean.

## Directory Structure

```
tests/
├── README.md                    # Main test documentation
├── QUICK_START.md              # Quick start guide
├── REGRESSION_TESTING.md       # Regression testing guide
├── MIGRATION.md                # Migration notes
├── .gitignore                  # Test artifacts to ignore
│
├── Core Test Utilities
├── mock-sdr-client.js          # Mock SDR app client
├── mock-transcription-server.js # Mock transcription service
├── mock-ai-server.js           # Mock AI service (Ollama/OpenAI)
├── mock-geocoding-server.js    # Mock geocoding service
├── intercept-transcription.js  # Transcription interception
├── intercept-ai.js            # AI interception
├── db-test-utils.js            # Database utilities
├── storage-test-utils.js       # Storage utilities
│
├── Test Runners
├── test-runner.js              # Enhanced test execution engine
├── run-all-tests.js            # Main test runner entry point
├── regression-test.js           # Regression testing with baseline
├── verify-setup.js             # Setup verification script
│
├── Web Interface
├── test-results-server.js      # Web server for test results
├── start-test-server.js        # Server starter script
├── web/
│   └── index.html              # Web UI for viewing test results
│
├── Test Suites
├── unit/                       # Unit tests
│   ├── test-sdr-client.js
│   ├── test-transcription-server.js
│   ├── test-ai-server.js
│   ├── test-geocoding-server.js
│   ├── test-db-utils.js
│   └── test-storage-utils.js
├── integration/                # Integration tests
│   ├── test-call-processing.js
│   ├── test-address-extraction.js
│   └── test-discord-integration.js
└── e2e/                        # End-to-end tests
    ├── test-complete-flow.js
    └── test-error-scenarios.js
│
├── Test Data
├── fixtures/                   # Sample test data
│   ├── sample-transcriptions.json
│   ├── sample-geocoding-responses.json
│   ├── sample-ai-responses.json
│   └── README.md
│
└── Templates
    └── feature-test-template.js # Template for new feature tests
```

## Path References

All test files use `__dirname` for relative paths, so they work correctly from the `tests/` subfolder:

- Internal references: `path.join(__dirname, 'unit')` → `tests/unit/`
- Parent references: `path.join(__dirname, '..')` → project root
- Fixtures: `path.join(__dirname, 'fixtures')` → `tests/fixtures/`

## Running Tests

All commands work from the project root:

```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # End-to-end tests only
npm run test:verify        # Verify setup
npm run test:server        # Web interface (http://localhost:8768)
npm run test:regression    # Regression tests
```

## Adding New Tests

1. Copy the template:
   ```bash
   cp tests/feature-test-template.js tests/unit/test-my-feature.js
   ```

2. Edit the template to test your feature

3. Run your test:
   ```bash
   node tests/unit/test-my-feature.js
   ```

4. Run all tests to check for regressions:
   ```bash
   npm test
   ```

