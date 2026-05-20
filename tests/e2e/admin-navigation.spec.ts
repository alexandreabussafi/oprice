import { expect, test, type Page, type TestInfo } from '@playwright/test';

type DiagnosticConsole = {
  type: string;
  text: string;
};

type DiagnosticRequestFailure = {
  method: string;
  url: string;
  errorText?: string;
};

type DiagnosticResponse = {
  method: string;
  status: number;
  url: string;
  body: string;
};

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || process.env.E2E_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.E2E_PASSWORD;
const TENANT_SLUG = process.env.E2E_TENANT_SLUG || '';
const TENANT_NAME = process.env.E2E_TENANT_NAME || TENANT_SLUG;
const READY_PATTERN = /Oportunidades e Propostas|Pipeline comercial|Inbox CRM|Dashboard/i;
const SETTINGS_READY_PATTERN = /Configuracoes do Tenant|Configura..es do Tenant|Marca & Apar|Parametros Financeiros|Pipelines/i;
const FATAL_PATTERN = /PageShell is not defined|ReferenceError|white screen|Cannot access|is not defined/i;
const OPTIONAL_OBSERVABILITY_TABLES = /tenant_activity_events|tenant_user_sessions/;

const isVisible = async (locator: ReturnType<Page['locator']>, timeout = 1_000) =>
  locator.isVisible({ timeout }).catch(() => false);

const installDiagnostics = (page: Page) => {
  const consoleMessages: DiagnosticConsole[] = [];
  const pageErrors: string[] = [];
  const failedRequests: DiagnosticRequestFailure[] = [];
  const responses: DiagnosticResponse[] = [];

  page.on('console', message => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => {
    failedRequests.push({
      method: request.method(),
      url: request.url(),
      errorText: request.failure()?.errorText
    });
  });
  page.on('response', async response => {
    const url = response.url();
    if (!/\/rest\/v1\/|\/functions\/v1\//.test(url)) return;
    if (response.status() < 400) return;
    responses.push({
      method: response.request().method(),
      status: response.status(),
      url,
      body: (await response.text().catch(error => `<<failed to read response body: ${String(error)}>>`)).slice(0, 4_000)
    });
  });

  return { consoleMessages, pageErrors, failedRequests, responses };
};

const attachDiagnostics = async (
  testInfo: TestInfo,
  diagnostics: ReturnType<typeof installDiagnostics>,
  page: Page,
  tenantLabel?: string
) => {
  await testInfo.attach('admin-navigation-diagnostics.json', {
    body: JSON.stringify({
      finalUrl: page.url(),
      tenantLabel,
      bodySample: (await page.locator('body').innerText().catch(() => '')).slice(0, 4_000),
      ...diagnostics
    }, null, 2),
    contentType: 'application/json'
  });
};

const expectNoFatalNavigationErrors = (diagnostics: ReturnType<typeof installDiagnostics>) => {
  const fatalConsole = diagnostics.consoleMessages.filter(message => FATAL_PATTERN.test(message.text));
  const fatalPageErrors = diagnostics.pageErrors.filter(message => FATAL_PATTERN.test(message));
  expect([...fatalConsole.map(item => item.text), ...fatalPageErrors]).toEqual([]);
};

const login = async (page: Page) => {
  await page.goto(TENANT_SLUG ? `/${TENANT_SLUG}` : '/', { waitUntil: 'domcontentloaded' });

  const emailInput = page.getByLabel(/e-mail/i);
  if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await emailInput.fill(ADMIN_EMAIL || '');
    await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD || '');
    await page.getByRole('button', { name: /^Entrar$/i }).click();
  }
};

const selectTenantIfNeeded = async (page: Page) => {
  if (TENANT_NAME) {
    const tenantButton = page.getByRole('button', { name: new RegExp(TENANT_NAME, 'i') }).first();
    if (await tenantButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await tenantButton.click();
      return TENANT_NAME;
    }
  }

  const tenantCard = page
    .getByRole('button')
    .filter({ hasText: /Admin|Gestor|Analista|Super Admin|Produtos|Lub/i })
    .first();
  if (await tenantCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const label = await tenantCard.innerText().catch(() => undefined);
    await tenantCard.click();
    return label;
  }

  return undefined;
};

const openTenantSettings = async (page: Page) => {
  const settingsButton = page.getByRole('button', { name: /Tenant|Configura/i }).first();
  if (await settingsButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await settingsButton.click();
    return;
  }

  await page.locator('button[aria-label*="Tenant"], button[title*="Tenant"]').first().click();
};

test.describe('oPrice admin navigation', () => {
  test.beforeEach(() => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD to run admin navigation.');
  });

  test('opens tenant administration from the sidebar gear without a blank page', async ({ page }, testInfo) => {
    const diagnostics = installDiagnostics(page);

    await login(page);
    const tenantLabel = await selectTenantIfNeeded(page);
    await expect(page.locator('body')).toContainText(READY_PATTERN, { timeout: 30_000 });

    await openTenantSettings(page);
    await expect(page.locator('body')).toContainText(SETTINGS_READY_PATTERN, { timeout: 30_000 });
    await expect(page.locator('body')).not.toHaveText(/^\s*$/);

    const tabLabels = [/Marca|Apar/i, /Finance/i, /Pipeline/i, /Equipe|Auditoria|Usuarios/i];
    for (const label of tabLabels) {
      const tab = page.getByRole('button', { name: label }).first();
      if (await tab.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await tab.click();
        await expect(page.locator('body')).not.toHaveText(/^\s*$/);
      }
    }

    await attachDiagnostics(testInfo, diagnostics, page, tenantLabel);
    expectNoFatalNavigationErrors(diagnostics);

    const blockingResponses = diagnostics.responses.filter(response =>
      response.status >= 500 || (response.status >= 400 && !OPTIONAL_OBSERVABILITY_TABLES.test(response.url))
    );
    expect(blockingResponses).toEqual([]);
  });
});
