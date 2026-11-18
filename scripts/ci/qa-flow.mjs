// An area script (scripts/ci/areas.json runs area scripts with `node <file>`): `pnpm qa:flow`, the Milestone 2
// happy path plus the guide appearance and the stage-two journey, exactly as package.json defines it.
import { spawnSync } from "node:child_process";

const r = spawnSync("pnpm", ["run", "qa:flow"], { stdio: "inherit", shell: false });
process.exitCode = r.status ?? 1;
