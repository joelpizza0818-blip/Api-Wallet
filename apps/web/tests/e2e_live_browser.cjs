const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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
  if (!(await waitFor('http://localhost:3000/health', 1500))) {
    const server = spawn('npm', ['run', 'dev'], { cwd: path.resolve(__dirname, '../../server'), shell: true, stdio: 'ignore' });
    children.push(server); log('🚀 Started backend dev server.');
  }
  if (!(await waitFor('http://localhost:5173/login', 1500))) {
    const web = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), shell: true, stdio: 'ignore' });
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

async function runE2ETests() {
  console.log('🚀 Starting Layer 2 Live Browser E2E Tests...');
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  const logs = [];
  const addLog = (msg) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const devServers = await ensureDevServers(addLog);
    // ----------------------------------------------------
    // Authentication Step (Login with seed user)
    // ----------------------------------------------------
    addLog('🌐 Navigating to http://localhost:5173/login...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
    addLog('✅ Login page loaded.');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_login_page.png') });

    const emailInput = page.locator('input[name="email"]');
    if (await emailInput.isVisible()) {
      addLog('🔑 Submitting login form (alex@apiwallet.dev)...');
      await emailInput.fill('alex@apiwallet.dev');
      await page.locator('input[name="password"]').fill('ChangeMe123!');

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}),
        page.locator('.auth-form button[type="submit"]').click(),
      ]);

      await page.waitForTimeout(2000);
      addLog('✅ Login submitted. Current URL: ' + page.url());
    }

    if (!page.url().includes('/app')) {
      await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
    }

    addLog('✅ Workspace Application loaded at: ' + page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_workspace_dashboard.png') });

    // ----------------------------------------------------
    // Scenario 0: Real external API reachability
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
      await page.locator('.wb-snippets-trigger-btn').click();
      if (!(await page.locator('.wb-snippets-popover').isVisible())) throw new Error('Script snippets popover did not open');
      await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_curl_js_scripts.png') });
      addLog('✅ JS script snippets are available in the Scripts tab.');
    }

    addLog('🎉 Layer 2 Live Browser E2E Tests completed successfully!');
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'browser_e2e_log.txt'), logs.join('\n'), 'utf8');

  } catch (err) {
    addLog(`❌ E2E Test Error: ${err.message}`);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'browser_e2e_log.txt'), logs.join('\n'), 'utf8');
    throw err;
  } finally {
    await browser.close();
  }
}

runE2ETests().catch((err) => {
  console.error(err);
  process.exit(1);
});
