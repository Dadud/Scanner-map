# Test Suite Migration

All test files have been moved from `test/` to `tests/` subfolder to keep the root directory clean.

## What Changed

- All test files moved to `tests/` subfolder
- `package.json` scripts updated to use `tests/` instead of `test/`
- All internal paths updated to work from new location

## Verification

Run this to verify everything works:

```bash
npm run test:verify
```

## Old Test Directory

The old `test/` directory can be safely deleted if you've verified everything works:

```bash
# After verifying tests work, you can remove:
rm -rf test/
```

Or on Windows:
```powershell
Remove-Item -Path test -Recurse -Force
```

## All Commands Still Work

All npm test commands work the same way:

```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:verify        # Verify setup
npm run test:server        # Web interface
npm run test:regression    # Regression tests
```

