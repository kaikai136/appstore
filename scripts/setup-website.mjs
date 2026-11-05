import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// npm 11 may forward project-scoped allow-scripts options into nested npm
// invocations. Execute in website/ with a clean child configuration.
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^npm_config_allow_scripts$/i.test(key)) delete env[key];
}
const cwd = fileURLToPath(new URL('../website/', import.meta.url));
const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(cmd, ['ci'], {
  cwd,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
