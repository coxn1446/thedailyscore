---
name: write-tests
description: Adds Jest and Testing Library tests using this repo’s file names, shared fetch mocks, and coverage expectations. Use when writing or updating tests for a feature, bug fix, or behavior change.
---

# Write tests (App Shell)

Follow `documentation/TESTING_GUIDELINES.md`. Do not invent a second test stack.

## Where

- App / routing: `src/tests/App.[feature].test.js`
- Component: `src/tests/ComponentName.test.js`
- Route page: `src/tests/RouteName.test.js`
- Helper: `src/tests/helperName.test.js`
- Reducer: `src/tests/name.reducer.test.js`

## Cover

- Happy path
- Failure and edge cases
- Authorization or permission behavior when the code is gated

## Mocks

Reuse `src/tests/__mocks__/fetchMocks.js` (`createDefaultFetchMock`, `createAuthFetchMock`, or the project equivalents). Extend that file for new common endpoints instead of copying fetch stubs into every test.

## Do not

- Test implementation details (Redux internals unless the change is the reducer).
- Add Cypress/Playwright/Vitest unless architecture already uses them.
- Skip tests because the change “is only UI” — render and interaction still belong here; layout QA is still done in the browser.
