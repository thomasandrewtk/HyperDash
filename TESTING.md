# Testing Guide for HyperDash

## What are Tests?

Tests are automated checks that verify your code works correctly. Instead of manually clicking through your app every time you make changes, tests do this automatically!

## Quick Start

### Run Tests

```bash
# Run tests once (good for CI/CD)
npm run test:run

# Run tests in watch mode (re-runs when you save files)
npm test

# Run tests with a nice UI interface
npm run test:ui
```

## What Tests Are Already Set Up

I've created example tests for you to learn from:

### 1. **Utility Function Tests** (`app/lib/__tests__/utils.test.ts`)
Tests for localStorage helper functions:
- Saving data to localStorage
- Getting data from localStorage
- Removing data from localStorage
- Testing edge cases

### 2. **Color Utility Tests** (`app/lib/__tests__/colorUtils.test.ts`)
Tests for color calculation functions:
- Default color palette
- Color adjustments for dark wallpapers
- Color adjustments for light wallpapers
- Edge cases and boundary conditions

### 3. **Component Tests** (`app/components/__tests__/Widget.test.tsx`)
Example of testing React components:
- Rendering children
- Displaying titles
- Applying custom styles

## Understanding Test Structure

Here's what a typical test looks like:

```typescript
describe('functionName', () => {
  it('should do something specific', () => {
    // Arrange: Set up test data
    const input = 'test';
    
    // Act: Call the function
    const result = myFunction(input);
    
    // Assert: Check the result
    expect(result).toBe('expected');
  });
});
```

### Key Terms:
- **`describe`**: Groups related tests together
- **`it`**: A single test case (describes what it should do)
- **`expect`**: Makes an assertion (checks if something is true)
- **`beforeEach`**: Runs code before each test (like clearing localStorage)

## Common Test Patterns

### Testing Functions

```typescript
import { add } from './math';

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
```

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should display text', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle button clicks', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);
  
  const button = screen.getByRole('button');
  await user.click(button);
  
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

## Writing Your First Test

Let's say you want to test the `formatTimer` function in ClockWidget. Here's how:

1. Create a test file: `app/components/__tests__/ClockWidget.test.tsx`
2. Write your test:

```typescript
import { describe, it, expect } from 'vitest';
import { formatTimer } from '../ClockWidget';

// Wait, formatTimer isn't exported! Let's test it differently
// You might need to export it or test it through the component
```

## Tips for Beginners

1. **Start Small**: Test simple functions first (like math operations, string formatting)
2. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
3. **One Assertion Per Test**: Each test should check one thing
4. **Use Descriptive Names**: Test names should explain what they're testing
5. **Test Edge Cases**: What happens with empty inputs? null? very large numbers?

## Common Assertions

```typescript
expect(value).toBe(5);              // Exact equality
expect(value).toEqual({ a: 1 });     // Deep equality for objects
expect(value).toBeTruthy();          // Truthy value
expect(value).toBeFalsy();           // Falsy value
expect(value).toBeNull();            // Is null
expect(value).toBeDefined();         // Is defined
expect(array).toHaveLength(3);      // Array length
expect(string).toContain('text');    // String contains
expect(element).toBeInTheDocument(); // React element exists
```

## Running Specific Tests

```bash
# Run only tests matching "utils"
npm test -- utils

# Run a specific test file
npm test -- utils.test.ts
```

## Next Steps

1. Run the existing tests: `npm run test:run`
2. Look at the test files to understand the patterns
3. Try adding a test for one of your functions
4. Run tests frequently as you code to catch bugs early!

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

Happy Testing! 🧪

