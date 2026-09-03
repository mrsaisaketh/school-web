import { execSync } from 'child_process';

try {
  if (process.platform === 'win32') {
    // Kill processes listening on port 5000 & 3000 in Windows PowerShell
    const cmd = `Get-NetTCPConnection -LocalPort 5000,3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`;
    execSync(`powershell -Command "${cmd}"`, { stdio: 'ignore' });
  } else {
    execSync('fuser -k 5000/tcp 3000/tcp || true', { stdio: 'ignore' });
  }
} catch (e) {
  // Ignore error if ports are already free
}
