/**
 * Railway infrastructure as code — the Between Gigs 2.0 server, service `web` in Railway project "Between Gigs OS"
 * (decision N-03), next to Company OS's `api` (and its `scheduler`), which the Company OS repo owns ("partial" `web`).
 * Applied by GitHub Actions (.github/workflows/deploy-test.yml, deploy-prod.yml), never by hand.
 *
 * - No source: Railway never deploys by itself. The workflow builds and checks the server on GitHub
 *   (`pnpm build:server`), then uploads the bundle from scripts/make-bundle.mjs with `railway up`; Railway only runs
 *   its Dockerfile (the prebuilt standalone server, nothing installed or built there).
 * - Public: test gets a Railway-generated *.up.railway.app domain from the workflow; production gets the customer's
 *   domain by hand (APP_URL).
 * - It reaches the private API over Railway's internal network; `${{api.…}}` resolves against the api service's own
 *   variables. The API never gets a public address.
 * - Secrets are `preserve()`: written by the workflow from the GitHub Environment, never in git. The Clerk
 *   publishable key and the data source are build-time (NEXT_PUBLIC_*), so they are not here.
 * - The project's name and region come from the GitHub Environment's variables through the workflow.
 */
import { defineRailway, empty, preserve, project, service } from "railway/iac";

export const partial = "web";

export default defineRailway((ctx) => {
  const prod = ctx.isEnvironment("production");
  // Next to the API (Company OS's registry entry for between-gigs: us-east4-eqdc4a). Unset: Railway's default.
  const region = process.env.BG_RAILWAY_REGION;

  const web = service("web", {
    source: empty(),
    build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
    healthcheck: "/",
    healthcheckTimeout: 60,
    ...(region ? { regions: { [region]: 1 } } : {}),
    env: {
      NODE_ENV: "production",
      PORT: "3000",
      HOSTNAME: "0.0.0.0",
      NEXT_TELEMETRY_DISABLED: "1",
      COMPANY_OS_URL: "http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}",
      // test: the made-up tenant (Company OS registry `testTenants`); production: the real slug (N-13).
      COMPANY_OS_TENANT: prod ? "between-gigs" : "between-gigs-dev",
      // Service identities (Company OS ADR 0029, 0042), created per environment by the operator; shown once.
      // Read: public reads (the public profile pages). Submit: the public forms only.
      COMPANY_OS_READ_TOKEN: preserve(),
      COMPANY_OS_SUBMIT_TOKEN: preserve(),
      // The SAME Clerk instance as this environment's api (test: development; production: production).
      CLERK_SECRET_KEY: preserve(),
      // This service's public origin: Clerk session tokens must have been issued to it (`azp`).
      APP_URL: preserve(),
    },
  });

  // The project token already points at one project, so the name is a label, kept equal to the real project's
  // name (the label Company OS's api partial uses).
  const name = process.env.BG_RAILWAY_PROJECT || ctx.projectName;
  if (!name) throw new Error("BG_RAILWAY_PROJECT must name the Railway project (the workflows set it from vars.RAILWAY_PROJECT_NAME).");
  return project(name, { resources: [web] });
});
