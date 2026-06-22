import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteEntryPoint = path.join(rootDirectory, 'node_modules', 'vite', 'bin', 'vite.js');
const viteArguments = process.argv.slice(2);

const apiProcess = spawn(process.execPath, ['--watch', 'server/index.js'], {
  cwd: rootDirectory,
  stdio: 'inherit',
});

const viteProcess = spawn(process.execPath, [viteEntryPoint, ...viteArguments], {
  cwd: rootDirectory,
  stdio: 'inherit',
});

let isStopping = false;

function stopProcess(childProcess) {
  if (!childProcess || childProcess.killed) return;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(childProcess.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }

  childProcess.kill('SIGTERM');
}

function shutdown(exitCode = 0) {
  if (isStopping) return;

  isStopping = true;
  stopProcess(apiProcess);
  stopProcess(viteProcess);
  process.exitCode = exitCode;
}

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());

apiProcess.on('exit', (code) => {
  if (!isStopping) shutdown(code || 1);
});

viteProcess.on('exit', (code) => {
  if (!isStopping) shutdown(code || 1);
});
