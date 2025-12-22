# Regression Testing Guide

## Overview

The test suite is designed to help you add new features while ensuring you don't break existing functionality. This is called **regression testing**.

## How It Works

### 1. Baseline Testing

When you first run tests, a baseline is created:

```bash
npm run test:regression
```

This creates `test/regression-baseline.json` with the current test results.

### 2. Adding New Features

When you add a new feature:

1. **Write tests for your new feature** using the template:
   ```bash
   cp test/feature-test-template.js test/unit/test-my-new-feature.js
   ```

2. **Edit the template** to test your feature:
   - Test basic functionality
   - Test edge cases
   - Test error handling
   - Test integration with existing features

3. **Run tests** to verify your feature works:
   ```bash
   npm test
   ```

### 3. Detecting Regressions

After making changes, run regression tests:

```bash
npm run test:regression
```

The test runner will:
- ✅ Run all tests
- ✅ Compare results with the baseline
- ✅ Report any regressions (tests that were passing but now fail)
- ✅ Report improvements (tests that were failing but now pass)

### 4. Updating the Baseline

When you intentionally change behavior or fix bugs:

```bash
npm run test:regression:update
```

This updates the baseline to reflect the new expected state.

## Workflow for Adding Features

### Step 1: Before Making Changes

```bash
# Run tests to ensure everything is working
npm test

# Create/update baseline
npm run test:regression:update
```

### Step 2: Add Your Feature

1. Implement your feature
2. Write tests for it (use the template)
3. Test your feature in isolation

### Step 3: Verify No Regressions

```bash
# Run all tests including your new ones
npm test

# Check for regressions
npm run test:regression
```

### Step 4: If Tests Pass

```bash
# Update baseline with new expected state
npm run test:regression:update
```

### Step 5: If Tests Fail

1. **Review the failures:**
   - Are they expected? (you changed behavior)
   - Are they bugs? (you broke something)

2. **Fix bugs** and re-run tests

3. **Update baseline** if changes were intentional

## Example: Adding a New Feature

Let's say you want to add a "call priority" feature:

```bash
# 1. Copy the template
cp test/feature-test-template.js test/unit/test-call-priority.js

# 2. Edit test-call-priority.js to test your feature
#    - Test setting priority
#    - Test filtering by priority
#    - Test priority display

# 3. Run your new tests
node test/unit/test-call-priority.js

# 4. Run all tests to ensure nothing broke
npm test

# 5. Check for regressions
npm run test:regression

# 6. If all good, update baseline
npm run test:regression:update
```

## Continuous Integration

For CI/CD pipelines, use:

```bash
# This will exit with code 1 if tests fail
npm run test:regression
```

The exit code can be used to fail builds when regressions are detected.

## Test Categories

### Unit Tests
- Test individual functions/components
- Fast execution
- No external dependencies
- Location: `test/unit/`

### Integration Tests
- Test component interactions
- May use mock servers
- Location: `test/integration/`

### End-to-End Tests
- Test complete workflows
- Use all mock servers
- Location: `test/e2e/`

## Best Practices

1. **Write tests first** (TDD) or immediately after implementing
2. **Test edge cases** - don't just test the happy path
3. **Test error handling** - what happens when things go wrong?
4. **Test integration** - does your feature work with existing features?
5. **Run tests frequently** - catch issues early
6. **Update baseline** when behavior changes intentionally
7. **Don't ignore failures** - investigate and fix

## Troubleshooting

### "Baseline file not found"
- Run `npm run test:regression:update` to create it

### "Tests pass but regression detected"
- Check if you changed expected behavior
- Update baseline if changes were intentional

### "New feature tests fail"
- Fix bugs in your feature
- Ensure tests are written correctly
- Check that mock servers are running

### "Existing tests fail after adding feature"
- You may have broken something
- Review your changes
- Check integration points
- Fix the issues before updating baseline

## Web Interface

You can also run regression tests from the web interface:

1. Start the test server: `npm run test:server`
2. Open: http://localhost:8768
3. Click "Run All Tests"
4. View results and check for regressions

The web interface shows:
- Current test status
- Pass/fail counts
- Detailed output
- Comparison with previous runs

