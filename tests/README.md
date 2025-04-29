# Tests Directory

This directory contains all test files for the application. Tests are organized by feature/component and follow these conventions:

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts` or `*.integration.test.tsx`
- Test utilities: `__tests__/utils/`

## Testing Setup

The project uses:
- Jest for testing
- React Testing Library for component testing
- Mock Service Worker for API mocking

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test/file
```

## Test Structure

Tests should be placed in the same directory as the component/feature they're testing, with the `.test.ts` or `.test.tsx` extension.

Example:
```
src/
  components/
    Button/
      Button.tsx
      Button.test.tsx
``` 