#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

async function readStdin() {
  if (process.stdin.isTTY) {
    return '';
  }
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    
    const timer = setTimeout(() => {
      resolve(data);
    }, 500);
    if (timer.unref) timer.unref();

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });

    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function getAppLogPath(workspaceRoot, date = new Date()) {
  const agentLogsDir = path.join(workspaceRoot, '.agent-logs');
  if (!fs.existsSync(agentLogsDir)) {
    fs.mkdirSync(agentLogsDir, { recursive: true });
  }
  const dateStr = date.toISOString().slice(0, 10);
  return path.join(agentLogsDir, `capture-${dateStr}.jsonl`);
}

function parseTranscript(transcriptFullPath) {
  if (!fs.existsSync(transcriptFullPath)) {
    return [];
  }

  const lines = fs.readFileSync(transcriptFullPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const steps = [];
  for (const line of lines) {
    try {
      steps.push(JSON.parse(line));
    } catch {
      // ignore malformed lines
    }
  }
  return steps;
}

function extractCleanPrompt(rawContent) {
  if (!rawContent) return '';
  const match = rawContent.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return rawContent.trim();
}

function pairConversations(steps, sessionId, defaultModel) {
  const pairs = [];
  let currentPrompt = null;
  let currentPromptTime = null;
  let lastResponse = null;
  let lastResponseTime = null;
  let detectedModel = defaultModel || 'Gemini 3.8 Flash (Medium)';

  for (const step of steps) {
    // Check for model change / setting metadata
    if (step.content && typeof step.content === 'string') {
      const modelMatch = step.content.match(/Model Selection` from [^ ]+ to (.*?)\.\s*No need/);
      if (modelMatch && modelMatch[1]) {
        detectedModel = modelMatch[1].trim();
      } else {
        const altMatch = step.content.match(/Model Selection` from [^ ]+ to ([^\n\r]+)/);
        if (altMatch && altMatch[1]) {
          detectedModel = altMatch[1].replace(/\.\s*$/, '').trim();
        }
      }
    }

    if (step.type === 'USER_INPUT' && (step.source === 'USER_EXPLICIT' || step.source === 'USER')) {
      // If we already had a prompt and response, store it
      if (currentPrompt && lastResponse) {
        pairs.push({
          timestamp: lastResponseTime || currentPromptTime || new Date().toISOString(),
          session_id: sessionId,
          model: detectedModel,
          prompt: currentPrompt,
          response: lastResponse
        });
        lastResponse = null;
      }
      currentPrompt = extractCleanPrompt(step.content);
      currentPromptTime = step.created_at || new Date().toISOString();
    } else if (step.source === 'MODEL' && step.type === 'PLANNER_RESPONSE') {
      if (step.content && typeof step.content === 'string' && step.content.trim().length > 0) {
        lastResponse = step.content.trim();
        lastResponseTime = step.created_at || new Date().toISOString();
      }
    }
  }

  // Flush the final turn
  if (currentPrompt && lastResponse) {
    pairs.push({
      timestamp: lastResponseTime || currentPromptTime || new Date().toISOString(),
      session_id: sessionId,
      model: detectedModel,
      prompt: currentPrompt,
      response: lastResponse
    });
  }

  return pairs;
}

function getExistingLogSignatures(targetLogPath) {
  const sigs = new Set();
  if (!fs.existsSync(targetLogPath)) return sigs;
  const lines = fs.readFileSync(targetLogPath, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.session_id && obj.prompt) {
        // signature of session_id + first 80 chars of prompt
        sigs.add(`${obj.session_id}::${obj.prompt.slice(0, 80)}`);
      }
    } catch {}
  }
  return sigs;
}

async function main() {
  let stdinRaw = '';
  try {
    stdinRaw = await readStdin();
  } catch {}

  let context = {};
  if (stdinRaw && stdinRaw.trim()) {
    try {
      context = JSON.parse(stdinRaw);
    } catch {}
  }

  const workspaceRoot = (context.workspacePaths && context.workspacePaths[0])
    ? context.workspacePaths[0]
    : process.cwd();

  const sessionId = context.conversationId || process.env.CONVERSATION_ID || 'faf75204-3697-4ad3-8b34-2452e265a6eb';
  const modelName = context.modelName && context.modelName !== 'auto'
    ? context.modelName
    : 'Gemini 3.8 Flash (Medium)';

  // Determine transcript path
  let transcriptPath = context.transcriptPath;
  if (!transcriptPath) {
    // Check default locations in user home
    const geminiBrain = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain', sessionId, '.system_generated', 'logs');
    if (fs.existsSync(path.join(geminiBrain, 'transcript_full.jsonl'))) {
      transcriptPath = path.join(geminiBrain, 'transcript_full.jsonl');
    } else if (fs.existsSync(path.join(geminiBrain, 'transcript.jsonl'))) {
      transcriptPath = path.join(geminiBrain, 'transcript.jsonl');
    }
  }

  if (transcriptPath) {
    const dir = path.dirname(transcriptPath);
    const fullPath = path.join(dir, 'transcript_full.jsonl');
    const effectivePath = fs.existsSync(fullPath) ? fullPath : transcriptPath;

    const steps = parseTranscript(effectivePath);
    const pairs = pairConversations(steps, sessionId, modelName);

    const targetLogPath = getAppLogPath(workspaceRoot);
    const subLogPath = path.join(workspaceRoot, 'ugc-video-generator', '.agent-logs', path.basename(targetLogPath));
    const existingSigs = getExistingLogSignatures(targetLogPath);

    const newEntries = [];
    for (const pair of pairs) {
      const sig = `${pair.session_id}::${pair.prompt.slice(0, 80)}`;
      if (!existingSigs.has(sig)) {
        newEntries.push(pair);
        existingSigs.add(sig);
      }
    }

    if (newEntries.length > 0) {
      const appendData = newEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.appendFileSync(targetLogPath, appendData, 'utf8');
      if (fs.existsSync(path.dirname(subLogPath))) {
        fs.appendFileSync(subLogPath, appendData, 'utf8');
      }
    }

    // Also write full structured 8x Markdown Session Log
    writeSessionMarkdownLog(workspaceRoot, sessionId, pairs, modelName);
  }

  // Antigravity hook stdout contract
  console.log(JSON.stringify({}));
  process.exit(0);
}

function writeSessionMarkdownLog(workspaceRoot, sessionId, pairs, modelName) {
  if (!pairs || pairs.length === 0) return;
  const agentLogsDir = path.join(workspaceRoot, '.agent-logs');
  if (!fs.existsSync(agentLogsDir)) {
    fs.mkdirSync(agentLogsDir, { recursive: true });
  }

  const sessionMdPath = path.join(agentLogsDir, `session-${sessionId}.md`);
  const firstTime = pairs[0].timestamp;
  const lastTime = pairs[pairs.length - 1].timestamp;
  const dateStr = new Date(firstTime).toISOString().slice(0, 10);

  let md = `---
session_id: ${sessionId}
date: ${dateStr}
author: Srinath
model: ${modelName}
tool: Google Antigravity
project: UGC video generator
total_exchanges: ${pairs.length}
first_prompt_time: ${firstTime}
last_prompt_time: ${lastTime}
---

# Session Log: ${sessionId}

`;

  for (const pair of pairs) {
    md += `[LOG_ENTRY type=PROMPT timestamp="${pair.timestamp}"]
${pair.prompt}
[/LOG_ENTRY]

[LOG_ENTRY type=RESPONSE timestamp="${pair.timestamp}"]
${pair.response}
[/LOG_ENTRY]

`;
  }

  fs.writeFileSync(sessionMdPath, md, 'utf8');

  const subLogs = path.join(workspaceRoot, 'ugc-video-generator', '.agent-logs', `session-${sessionId}.md`);
  if (fs.existsSync(path.dirname(subLogs))) {
    fs.writeFileSync(subLogs, md, 'utf8');
  }
}

main().catch(() => {
  console.log(JSON.stringify({}));
  process.exit(0);
});
