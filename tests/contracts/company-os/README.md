# Private Company OS idempotency contract

Company OS is private. No backend source is vendored or published here.

Run against its authenticated local checkout:

```
COMPANY_OS_CONTRACT_ROOT=/path/to/Company-OS pnpm exec vitest run lib/server/company-os-idempotency-contract.test.ts
```

The test reads the actual `apps/api/src/services/idempotency.ts` and `apps/api/src/errors.ts` at reviewed commit `dfca42e7e4fdb61b66c057c654ff12cf81488b66`, verifies their SHA256 fingerprints, and uses the TypeScript AST to execute the actual parser, error class and replay-window constant. It does not rewrite the parser or require a database/provider. Source drift fails the test for review.

Without `COMPANY_OS_CONTRACT_ROOT`, these three private-source contract tests are explicitly skipped. They must be run separately with the private checkout at release; public CI does not have its credentials. Ordinary gateway and expiry tests still run in public CI. This limitation must not be described as live backend/provider integration verification.

The site stops retrying after 23 hours from the first browser attempt, before the backend's 24-hour replay expiry. Missing/expired/future timestamps fail closed. This protects ordinary saved retries, not malicious clock/storage changes or an owner deliberately starting a newly confirmed test. It is not a lifetime backend reservation. Real delivery, configured tenant opt-in and provider behavior are outside this no-send contract test.
