// build-local.js
import { execSync } from 'child_process';

function runCommand(command) {
  try {
    console.log(`\n▶️ Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

console.log('🛠 Starting full local build...');

runCommand('node cachebust.js');
runCommand('node generate-sri.js');
runCommand('node inject-sri.js');

console.log('\n✅ Local build completed successfully.');
