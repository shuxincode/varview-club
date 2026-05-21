# Contributing

Thanks for your interest in varview-club.

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-change`
3. Install dependencies: `npm install`
4. Make your changes
5. Run quality checks: `npm run lint && npx tsc --noEmit && npm run build`
6. Commit and push, then open a pull request

## Guidelines

- Keep the prediction engine pure — no side effects in `dixon-coles.ts` or the core protocol functions
- New signature conditions or veto rules should be added as pure functions with their own test data
- Threshold changes belong in `constants.ts`, not inline
- Alphabetize where possible (conditions, imports, config keys)

## Pull Requests

- Keep PRs focused: one feature or fix per PR
- Explain what changed and why in the description
- Reference any related issues

## Questions

Open an issue for discussion before starting large changes.
