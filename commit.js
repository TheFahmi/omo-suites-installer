const { execSync } = require('child_process');

try {
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "feat: telemetry opt-in and plugin isolation (#12)"', { stdio: 'inherit' });
  const hash = execSync('git rev-parse HEAD').toString().trim();
  console.log('Committed: ' + hash);
} catch (e) {
  console.error('Commit failed', e);
}