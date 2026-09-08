const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '.agent-logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function capture(event, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    data
  };
  
  const logFile = path.join(LOG_DIR, `capture-${new Date().toISOString().split('T')[0]}.jsonl`);
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  console.log(`[CAPTURE] ${timestamp} - ${event}`);
}

function captureTest() {
  capture('test', { message: 'Capture system initialized' });
  capture('test', { message: 'Agent capture setup verified' });
  
  const logFile = path.join(LOG_DIR, `capture-${new Date().toISOString().split('T')[0]}.jsonl`);
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length >= 2) {
    console.log('✅ Capture test passed - logs are being written to .agent-logs/');
    return true;
  } else {
    console.log('❌ Capture test failed');
    return false;
  }
}

if (require.main === module) {
  const success = captureTest();
  process.exit(success ? 0 : 1);
}

module.exports = { capture, captureTest };