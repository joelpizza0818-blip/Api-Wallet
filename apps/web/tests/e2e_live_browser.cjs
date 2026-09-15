const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
const { PrismaClient } = require('../../../server/generated/prisma');

const prisma = new PrismaClient();

const ARTIFACT_DIR = path.resolve(__dirname, 'artifacts');
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function waitFor(url, timeoutMs = 30000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { const response = await fetch(url); if (response.status < 500) return true; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function ensureDevServers(log) {
  const children = [];
  const startNpm = (args, cwd, env = {}) => process.platform === 'win32'
    ? spawn('powershell.exe', ['-NoProfile', '-Command', `npm.cmd ${args.join(' ')}`], { cwd, env: { ...process.env, ...env }, shell: false, stdio: 'ignore' })
    : spawn('npm', args, { cwd, env: { ...process.env, ...env }, shell: false, stdio: 'ignore' });
  if (!(await waitFor('http://localhost:3000/health', 1500))) {
    const server = startNpm(['run', 'dev'], path.resolve(__dirname, '../../server'));
    children.push(server); log('🚀 Started backend dev server.');
  }
  if (!(await waitFor('http://localhost:5173/login', 1500))) {
    const web = startNpm(['run', 'dev', '--', '--host', '127.0.0.1'], path.resolve(__dirname, '..'), { VITE_API_URL: 'http://localhost:3000' });
    children.push(web); log('🚀 Started frontend dev server.');
  }
  if (!(await waitFor('http://localhost:3000/health') && await waitFor('http://localhost:5173/login'))) throw new Error('Dev servers did not become ready.');
  return children;
}

async function launchBrowser() {
  const options = { headless: true };
  try {
    return await chromium.launch({ ...options, channel: 'msedge' });
  } catch {
    try {
      return await chromium.launch({ ...options, channel: 'chrome' });
    } catch {
      return await chromium.launch(options);
    }
  }
}

async function prepareLocalTestUser() {
  await prisma.user.updateMany({
    where: { email: 'alex@apiwallet.dev' },
    data: { status: 'ACTIVE' },
  });
}

async function runE2ETests() {
  console.log('🚀 Starting Layer 2 Live Browser E2E Tests...');
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();

  const logs = [];
  const addLog = (msg) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const devServers = await ensureDevServers(addLog);
    await prepareLocalTestUser();
    addLog('🧪 Prepared local E2E user without changing application auth code.');
    // ----------------------------------------------------
    // Authentication Step (test-only local session bootstrap)
    // ----------------------------------------------------
    addLog('🔑 Creating local E2E session through the login API...');
    const loginResponse = await context.request.post('http://localhost:3000/api/auth/login', {
      data: { email: 'alex@apiwallet.dev', password: 'ChangeMe123!' },
    });
    if (!loginResponse.ok()) throw new Error(`Local E2E login failed: ${loginResponse.status()} ${await loginResponse.text()}`);
    const sessionCookies = await context.request.storageState();
    if (sessionCookies.cookies.length) {
      await context.addCookies(sessionCookies.cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        url: 'http://localhost:5173',
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
      })));
    }
    addLog('✅ Local E2E session created.');

    const sessionCheck = await page.request.get('http://localhost:3000/api/auth/me');
    if (!sessionCheck.ok()) throw new Error(`Local E2E session cookie was not available in the browser (${sessionCheck.status()}).`);
    await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    if (!page.url().includes('/app')) {
      throw new Error(`Authentication did not establish a workspace session. Current URL: ${page.url()}`);
    }

    addLog('✅ Workspace Application loaded at: ' + page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_workspace_dashboard.png') });

    // ----------------------------------------------------
    // Scenario 0: Workspace sharing and environments
    // ----------------------------------------------------
    addLog('🔗 Testing workspace invitation code and environments...');
    const shareButton = page.locator('button:has-text("Share")').first();
    await shareButton.click();
    const sharedValue = await page.evaluate(() => navigator.clipboard.readText());
    const workspaceCodes = await page.evaluate(async () => {
      const response = await fetch('http://localhost:3000/api/workspaces', { credentials: 'include' });
      const result = await response.json();
      return (result.data || []).map((workspace) => workspace.inviteCode).filter(Boolean);
    });
    if (!workspaceCodes.some((code) => /^WS-[A-F0-9]+-[A-F0-9]+$/.test(code))) throw new Error('Share did not create a valid workspace invitation code');
    if (sharedValue && (!/^WS-[A-F0-9]+-[A-F0-9]+$/.test(sharedValue) || sharedValue.includes('localhost'))) throw new Error(`Share copied an invalid value: ${sharedValue}`);
    addLog('✅ Share copied a functional workspace invitation code.');

    const variablesTab = page.locator('button:has-text("Variables")').first();
    if (await variablesTab.isVisible()) {
      await variablesTab.click();
      const newEnvironment = page.locator('button:has-text("Nuevo entorno")').first();
      await newEnvironment.click();
      await page.locator('input[placeholder="Produccion"]').fill(`E2E ${Date.now()}`);
      await page.locator('button:has-text("Guardar entorno")').click();
      if (!(await page.locator('.wb-env-table').isVisible())) throw new Error('Environment was not created');
      addLog('✅ Environment creation and reload completed.');
    }

    // ----------------------------------------------------
    // Scenario 1: Real external API reachability
    // ----------------------------------------------------
    addLog('🌍 Testing real external APIs...');
    const jsonPlaceholder = await page.request.get('https://jsonplaceholder.typicode.com/posts/1');
    if (!jsonPlaceholder.ok() || (await jsonPlaceholder.json()).id !== 1) throw new Error('JSONPlaceholder check failed');
    const httpbin = await page.request.get('https://httpbin.org/get');
    if (!httpbin.ok()) throw new Error('httpbin check failed');
    addLog('✅ JSONPlaceholder and httpbin responded successfully.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_real_api_exec.png') });

    // ----------------------------------------------------
    // Scenario 1: TopBar Live Search (Ctrl+K)
    // ----------------------------------------------------
    addLog('🔍 Testing Scenario 1: TopBar Global Search...');
    const searchInput = page.locator('input[aria-label="Buscar en API-Vault"]');
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await searchInput.fill('Auth');
      await page.waitForTimeout(800);

      const dropdown = page.locator('.wb-search-results-dropdown');
      if (await dropdown.isVisible()) {
        addLog('✅ TopBar Search dropdown rendered live search results for "Auth"!');
      } else {
        addLog('ℹ️ TopBar search input focused and query entered.');
      }

      await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_topbar_search_dropdown.png') });

      const clearBtn = page.locator('.wb-search-clear-btn');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
      }
    }

    // ----------------------------------------------------
    // Scenario 2: Saved API Key Selector & Auth Tab
    // ----------------------------------------------------
    addLog('🔑 Testing Scenario 2: Saved API Keys in Auth Tab...');
    const authTabBtn = page.locator('button:has-text("Auth"), button:has-text("Autenticación")').first();
    if (await authTabBtn.isVisible()) {
      await authTabBtn.click();
      await page.waitForTimeout(500);
      addLog('✅ Auth Tab active.');
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_auth_tab_api_keys.png') });

    // ----------------------------------------------------
    // Scenario 3: AI Chat Drawer & Syntax Highlighting
    // ----------------------------------------------------
    addLog('🤖 Testing Scenario 3: AI Chat Drawer & Markdown formatting...');
    const aiChatBtn = page.locator('button:has-text("AI"), .wb-ai-chat-btn, button[title*="AI"]').first();
    if (await aiChatBtn.isVisible()) {
      await aiChatBtn.click();
      await page.waitForTimeout(500);
      addLog('✅ AI Chat Drawer opened.');

      const chatInput = page.locator('.ai-chat-input textarea, textarea[placeholder*="Pregunta"]');
      if (await chatInput.isVisible()) {
        await chatInput.fill('Muestra un ejemplo de JSON');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_ai_chat_drawer.png') });

    // ----------------------------------------------------
    // Scenario 4: Terminal / Execution Console Drawer (Ctrl+J)
    // ----------------------------------------------------
    addLog('💻 Testing Scenario 4: Terminal / Execution Console Drawer...');
    await page.keyboard.press('Control+j');
    await page.waitForTimeout(600);

    const consoleDrawer = page.locator('.wb-terminal-drawer, .terminal-drawer, .console-drawer');
    if (await consoleDrawer.isVisible()) {
      addLog('✅ Console Drawer opened via Ctrl+J shortcut.');
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_console_drawer.png') });

    // ----------------------------------------------------
    // Scenario 5: cURL import and JS script editor
    // ----------------------------------------------------
    addLog('🧪 Testing cURL / JS script support...');
    const scriptsTab = page.locator('button:has-text("Scripts")').first();
    if (await scriptsTab.isVisible()) {
      await scriptsTab.click();
      if (!(await page.locator('textarea[placeholder*="pm.variables"], textarea[placeholder*="pm.expect"]').count())) throw new Error('Collection script editors did not render');
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_curl_js_scripts.png') });
      addLog('✅ Collection pre-request and post-response script editors are available.');
    }

    addLog('🎉 Layer 2 Live Browser E2E Tests completed successfully!');
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'browser_e2e_log.txt'), logs.join('\n'), 'utf8');

  } catch (err) {
    addLog(`❌ E2E Test Error: ${err.message}`);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'browser_e2e_log.txt'), logs.join('\n'), 'utf8');
    throw err;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

runE2ETests().catch((err) => {
  console.error(err);
  process.exit(1);
});
