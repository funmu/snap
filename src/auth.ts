import * as fs from 'fs';
import * as path from 'path';
import { getDefaultDataDir } from './store';

export interface SNAPConfig {
  substack_session_id?: string;
  substack_handle?: string;
}

export function getConfigPath(customDataDir?: string): string {
  const dataDir = customDataDir ? path.resolve(customDataDir) : getDefaultDataDir();
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'config.json');
}

function parseEnvFile(filePath: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const eqIdx = trimmed.indexOf('=');
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          envVars[key] = val;
        }
      });
    } catch {
      // Ignore read errors
    }
  }
  return envVars;
}

export function loadConfig(customDataDir?: string): SNAPConfig {
  let config: SNAPConfig = {};

  // 1. Check process.env first
  if (process.env.SUBSTACK_SESSION_ID) {
    config.substack_session_id = process.env.SUBSTACK_SESSION_ID;
  }
  if (process.env.SUBSTACK_HANDLE) {
    config.substack_handle = process.env.SUBSTACK_HANDLE;
  }

  // 2. Parse .env files if process.env variables are missing
  const dataDir = customDataDir ? path.resolve(customDataDir) : getDefaultDataDir();
  const envPathsToTry = [
    path.join(process.cwd(), '.env'),
    path.join(dataDir, '.env'),
    path.join(__dirname, '../.env')
  ];

  for (const envPath of envPathsToTry) {
    const envVars = parseEnvFile(envPath);
    if (!config.substack_session_id && envVars.SUBSTACK_SESSION_ID) {
      config.substack_session_id = envVars.SUBSTACK_SESSION_ID;
    }
    if (!config.substack_handle && envVars.SUBSTACK_HANDLE) {
      config.substack_handle = envVars.SUBSTACK_HANDLE;
    }
  }

  // 3. Fallback to local user config file in hidden directory (~/.snap/config.json)
  const configPath = getConfigPath(customDataDir);
  if (fs.existsSync(configPath)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      config = {
        substack_session_id: config.substack_session_id || fileData.substack_session_id,
        substack_handle: config.substack_handle || fileData.substack_handle
      };
    } catch {
      // Ignore JSON parse errors
    }
  }

  return config;
}

export function saveSessionToken(token: string, handle?: string, customDataDir?: string): void {
  const config = loadConfig(customDataDir);
  config.substack_session_id = token.trim();
  if (handle) {
    config.substack_handle = handle;
  }

  const configPath = getConfigPath(customDataDir);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`✅ Session configuration saved to hidden user store: ${configPath}`);
}

export function getAuthInstructions(): string {
  return `
🔑 SUBSTACK AUTHENTICATION GUIDE (substack.sid)
================================================
SNAP uses your official Substack Web Session Cookie to securely post notes and fetch analytics.

How to get your session cookie:
1. Open Google Chrome (or your primary browser) and navigate to:
   https://substack.com (make sure you are logged into your Substack account).
2. Open Chrome Developer Tools:
   - Mac: Press Cmd + Option + I
   - Windows/Linux: Press F12 or Ctrl + Shift + I
3. Go to the "Application" tab (top navigation bar of DevTools).
4. In the left panel, expand "Cookies" -> click on "https://substack.com".
5. Find the cookie named "substack.sid".
6. Double-click the Value column and copy the full token string (starts with 's%3A...').

How to configure SNAP:
Option A: Run the CLI command:
   snap auth --set "<paste_token_here>" [--handle "<your_handle>"]

Option B: Set environment variables:
   export SUBSTACK_SESSION_ID="<paste_token_here>"
   export SUBSTACK_HANDLE="<your_handle>"

Option C: Add to your .env file:
   SUBSTACK_SESSION_ID="<paste_token_here>"
   SUBSTACK_HANDLE="<your_handle>"
`;
}
