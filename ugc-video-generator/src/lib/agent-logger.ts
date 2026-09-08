import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR_ROOT = path.join(process.cwd(), '..', '.agent-logs');
const LOG_DIR_LOCAL = path.join(process.cwd(), '.agent-logs');

export function logAgentEvent(event: string, data: Record<string, any>) {
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  const logEntry = {
    timestamp,
    event,
    data,
  };

  const line = JSON.stringify(logEntry) + '\n';

  // Safely attempt to write to both possible log dirs
  for (const dir of [LOG_DIR_ROOT, LOG_DIR_LOCAL]) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const logFile = path.join(dir, `capture-${dateStr}.jsonl`);
      fs.appendFileSync(logFile, line);
    } catch {
      // Ignore filesystem errors for agent log capture
    }
  }
}
