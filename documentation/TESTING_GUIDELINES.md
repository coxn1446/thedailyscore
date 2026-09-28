# Testing Guidelines

This document provides guidelines for creating and maintaining tests in this codebase. Follow these patterns to ensure consistent, maintainable, and useful tests.

## Test Suite Organization

Tests are organized by feature area for better maintainability and discoverability.

## Test File Structure

### App Integration Tests
These test files cover the main App component and routing integration. Use feature-based naming:
- **`App.basic.test.js`** - Basic rendering, initialization, and layout tests
- **`App.routes.test.js`** - Route rendering and navigation tests
- **`App.auth.test.js`** - Authentication, protected routes, and profile completion checks
- **`App.[feature].test.js`** - Feature-specific integration tests (e.g., `App.projects.test.js`, `App.notifications.test.js`)

### Component Tests
Tests for individual React components. One test file per component:
- **`ComponentName.test.js`** - Component-specific tests
- Test component behavior, props, user interactions, and rendering
- Keep tests focused on component functionality, not integration

### Route Tests
Tests for route components (pages):
- **`RouteName.test.js`** - Route-specific tests (e.g., `Project.test.js`, `Profile.test.js`)
- Test route rendering, data fetching, navigation, and route-specific logic

### Helper Tests
Tests for utility functions in `src/helpers/`:
- **`helperName.test.js`** - Helper function tests (e.g., `projectHelpers.test.js`, `caseStudyHelpers.test.js`)
- Test function inputs, outputs, error handling, and edge cases
- Mock external dependencies (fetch, APIs, etc.)

### Store Tests
Tests for Redux state management:
- **`reducerName.reducer.test.js`** - Redux reducer and action tests (e.g., `project.reducer.test.js`)
- Test action creators, reducers, state updates, and side effects

## Shared Test Utilities

### `__mocks__/fetchMocks.js`
Create shared fetch mocking utilities for common API endpoints:

```javascript
// Create default mock for common endpoints
export const createDefaultFetchMock = () => {
  return (url) => {
    if (url === '/api/secrets') {
      return Promise.resolve({
        ok: true,
        json: async () => ({ GOOGLE_PLACES_API_KEY: 'test-api-key' }),
      });
    }
    // Handle other common endpoints...
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Endpoint not mocked' }),
    });
  };
};

// Create auth-aware mock
export const createAuthFetchMock = (authenticated = false, user = null, isProfileComplete = false) => {
  const defaultMock = createDefaultFetchMock();
  return (url) => {
    if (url === '/api/auth/me') {
      if (authenticated && user) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ user, isProfileComplete }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Not authenticated' }),
      });
    }
    return defaultMock(url);
  };
};
```

## Writing Useful Tests

### Test Structure
Follow the AAA pattern (Arrange, Act, Assert):

```javascript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup: Clear mocks, reset state, set up test data
    jest.clearAllMocks();
  });

  test('should do something specific', () => {
    // Arrange: Set up test conditions
    const mockData = { id: 1, name: 'Test' };
    
    // Act: Perform the action being tested
    render(<ComponentName data={mockData} />);
    
    // Assert: Verify the expected outcome
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### What to Test

#### Components
- ✅ **Rendering**: Component renders without errors
- ✅ **Props**: Component handles props correctly
- ✅ **User Interactions**: Click, input, form submission, etc.
- ✅ **Conditional Rendering**: Shows/hides content based on state/props
- ✅ **Error States**: Displays errors appropriately
- ✅ **Loading States**: Shows loading indicators
- ✅ **Accessibility**: Key elements are accessible (if applicable)

#### Helpers
- ✅ **Success Cases**: Function works with valid inputs
- ✅ **Error Cases**: Function handles errors gracefully
- ✅ **Edge Cases**: Empty inputs, null values, boundary conditions
- ✅ **API Calls**: Correct endpoints, parameters, and error handling
- ✅ **Return Values**: Function returns expected data structure

#### Routes
- ✅ **Route Rendering**: Route component renders correctly
- ✅ **Data Fetching**: Loads and displays data
- ✅ **Navigation**: Navigates to correct routes
- ✅ **Protected Routes**: Redirects unauthenticated users
- ✅ **Query Parameters**: Handles URL parameters correctly

#### Redux Reducers
- ✅ **Initial State**: Reducer returns correct initial state
- ✅ **Actions**: Actions update state correctly
- ✅ **State Immutability**: State updates are immutable
- ✅ **Multiple Actions**: State updates correctly with multiple actions

### What NOT to Test
- ❌ Implementation details (internal function calls, variable names)
- ❌ Third-party library functionality (React, Redux, etc.)
- ❌ Styling (unless testing conditional styling)
- ❌ Code that's already tested elsewhere (don't duplicate tests)

### Testing Best Practices

1. **Test Behavior, Not Implementation**
   ```javascript
   // ❌ Bad: Tests implementation details
   test('calls fetchProjects function', () => {
     expect(fetchProjects).toHaveBeenCalled();
   });
   
   // ✅ Good: Tests user-visible behavior
   test('displays projects list', async () => {
     render(<Projects />);
     await waitFor(() => {
       expect(screen.getByText('Project 1')).toBeInTheDocument();
     });
   });
   ```

2. **Use Descriptive Test Names**
   ```javascript
   // ❌ Bad
   test('test 1', () => {});
   
   // ✅ Good
   test('displays error message when API call fails', async () => {});
   ```

3. **Keep Tests Isolated**
   - Each test should be independent
   - Use `beforeEach` to set up clean state
   - Don't rely on test execution order

4. **Mock External Dependencies**
   ```javascript
   // Mock fetch
   global.fetch = jest.fn();
   
   // Mock React Router
   jest.mock('react-router-dom', () => ({
     ...jest.requireActual('react-router-dom'),
     useNavigate: () => mockNavigate,
   }));
   
   // Mock helpers
   jest.mock('../helpers/projectHelpers', () => ({
     fetchProjects: jest.fn(),
   }));
   ```

5. **Use WaitFor for Async Operations**
   ```javascript
   test('loads data asynchronously', async () => {
     render(<Component />);
     
     await waitFor(() => {
       expect(screen.getByText('Loaded Data')).toBeInTheDocument();
     });
   });
   ```

6. **Test Error Handling**
   ```javascript
   test('displays error when fetch fails', async () => {
     global.fetch.mockRejectedValue(new Error('Network error'));
     
     render(<Component />);
     
     await waitFor(() => {
       expect(screen.getByText('Error loading data')).toBeInTheDocument();
     });
   });
   ```

7. **Use Test Data Factories**
   ```javascript
   // Create reusable test data
   const createMockUser = (overrides = {}) => ({
     user_id: 1,
     username: 'testuser',
     email: 'test@example.com',
     ...overrides,
   });
   
   test('displays user information', () => {
     const user = createMockUser({ username: 'customuser' });
     render(<UserProfile user={user} />);
     expect(screen.getByText('customuser')).toBeInTheDocument();
   });
   ```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run a Specific Test File
```bash
npm test -- ComponentName.test.js
```

### Run Tests Matching a Pattern
```bash
npm test -- --testNamePattern="should display"
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

## Adding New Tests

### When Adding a New Feature

1. **New Component**:
   - Create `ComponentName.test.js` in `src/tests/`
   - Test rendering, props, user interactions, and edge cases
   - Mock external dependencies

2. **New Route**:
   - Add tests to appropriate `App.[feature].test.js` file OR
   - Create `RouteName.test.js` for route-specific tests
   - Test route rendering, data fetching, and navigation

3. **New Helper**:
   - Create `helperName.test.js` in `src/tests/`
   - Test all function variations, success/error cases, and edge cases
   - Mock API calls and external dependencies

4. **New Reducer**:
   - Create `reducerName.reducer.test.js` in `src/tests/`
   - Test initial state, all actions, and state updates

5. **Update Shared Mocks**:
   - If new common endpoints are used, add them to `__mocks__/fetchMocks.js`
   - Create reusable mock utilities for common patterns

### Test File Naming Convention
- Component tests: `ComponentName.test.js`
- Route tests: `RouteName.test.js`
- Helper tests: `helperName.test.js`
- Reducer tests: `reducerName.reducer.test.js`
- App integration tests: `App.[feature].test.js`

## Test Organization Principles

1. **Feature-based grouping** - Tests are grouped by feature area (auth, projects, notifications, etc.)
2. **Shared utilities** - Common mocks and helpers are in `__mocks__/` directory
3. **Component isolation** - Component tests focus on component behavior, not integration
4. **Integration tests** - App tests verify routing and feature integration
5. **Helper tests** - Utility functions have dedicated test files
6. **One test file per component/helper/reducer** - Keep tests organized and discoverable

## Common Testing Patterns

### Testing Components with Redux
```javascript
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      global: globalReducer,
    },
    preloadedState: initialState,
  });
};

test('renders with Redux store', () => {
  const store = createMockStore({
    auth: { user: { id: 1 }, isAuthenticated: true },
  });
  
  render(
    <Provider store={store}>
      <Component />
    </Provider>
  );
});
```

### Testing Components with React Router
```javascript
import { BrowserRouter, MemoryRouter } from 'react-router-dom';

// For full routing
render(
  <BrowserRouter>
    <Component />
  </BrowserRouter>
);

// For specific route
render(
  <MemoryRouter initialEntries={['/projects/1']}>
    <Component />
  </MemoryRouter>
);
```

### Testing Async Operations
```javascript
import { waitFor } from '@testing-library/react';

test('loads data asynchronously', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: 'test' }),
  });
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
  
  expect(global.fetch).toHaveBeenCalledWith('/api/endpoint');
});
```

### Testing User Interactions
```javascript
import { fireEvent } from '@testing-library/react';

test('handles button click', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick} />);
  
  fireEvent.click(screen.getByRole('button'));
  
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Maintaining Tests

### When Refactoring
- Update tests to match new implementation
- Don't delete tests unless functionality is removed
- Ensure tests still validate the same behavior

### When Fixing Bugs
- Add a test that reproduces the bug
- Fix the bug
- Verify the test passes

### Code Coverage
- Aim for meaningful coverage, not 100%
- Focus on testing critical paths and edge cases
- Don't write tests just to increase coverage numbers

## Troubleshooting

### Common Issues

1. **Tests failing due to async operations**:
   - Use `waitFor` for async rendering
   - Ensure mocks return promises correctly

2. **Tests failing due to missing mocks**:
   - Check that all external dependencies are mocked
   - Add missing mocks to `__mocks__/fetchMocks.js` if common

3. **Tests failing due to Redux state**:
   - Ensure Redux store is properly configured in tests
   - Use `createMockStore` helper for consistent setup

4. **Tests failing due to routing**:
   - Wrap components in `BrowserRouter` or `MemoryRouter`
   - Mock `useNavigate` and `useParams` if needed

## Best Practices Summary

✅ **Do**:
- Test user-visible behavior
- Use descriptive test names
- Keep tests isolated and independent
- Mock external dependencies
- Test error cases and edge cases
- Use shared mock utilities
- Follow AAA pattern (Arrange, Act, Assert)

❌ **Don't**:
- Test implementation details
- Write tests that depend on other tests
- Duplicate tests unnecessarily
- Test third-party library functionality
- Write tests just for coverage numbers

---

**Remember**: Good tests are maintainable, readable, and provide confidence that the code works correctly. Focus on testing behavior that matters to users and the application's functionality.

