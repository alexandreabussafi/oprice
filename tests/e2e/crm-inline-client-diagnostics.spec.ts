import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

type CapturedResponse = {
  method: string;
  status: number;
  url: string;
  body: string;
};

type CapturedRequestFailure = {
  method: string;
  url: string;
  errorText?: string;
};

type CapturedConsole = {
  type: string;
  text: string;
};

const TENANT_SLUG = process.env.E2E_TENANT_SLUG || 'lubcore';
const ERROR_PATTERN =
  /Salvar|Erro ao salvar|Sem permiss|Schema remoto|Tempo limite|excedeu o limite|foi abortada|row-level security|permission denied|RLS|migration|constraint/i;
const READY_PATTERN = /Oportunidades e Propostas|Pipeline comercial|Configuracoes do Tenant|Configurações do Tenant/i;

const isVisible = async (locator: Locator, timeout = 1_000) =>
  locator.isVisible({ timeout }).catch(() => false);

const attachDiagnostics = async (
  testInfo: TestInfo,
  diagnostics: {
    consoleMessages: CapturedConsole[];
    pageErrors: string[];
    failedRequests: CapturedRequestFailure[];
    supabaseResponses: CapturedResponse[];
    visibleError?: string | null;
    bodySample?: string;
  }
) => {
  await testInfo.attach('oprice-supabase-diagnostics.json', {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: 'application/json'
  });
};

const installDiagnostics = (page: Page) => {
  const consoleMessages: CapturedConsole[] = [];
  const pageErrors: string[] = [];
  const failedRequests: CapturedRequestFailure[] = [];
  const supabaseResponses: CapturedResponse[] = [];

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
    if (!/\/rest\/v1\/(clients|contacts|crm_tasks|proposals|tenant_settings|tenants|crm_task_attachments|crm_communications|crm_external_events)(\?|$)|\/functions\/v1\//.test(url)) {
      return;
    }
    supabaseResponses.push({
      method: response.request().method(),
      status: response.status(),
      url,
      body: (await response.text().catch(error => `<<failed to read response body: ${String(error)}>>`)).slice(0, 4_000)
    });
  });

  return { consoleMessages, pageErrors, failedRequests, supabaseResponses };
};

const loginIfNeeded = async (page: Page) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  const emailInput = page.getByLabel(/e-mail/i);
  if (!(await isVisible(emailInput, 3_000))) return;
  if (!email || !password) return;
  await emailInput.fill(email);
  await page.getByLabel(/senha/i).fill(password);
  await page.getByRole('button', { name: /^Entrar$/i }).click();
};

const openTenant = async (page: Page) => {
  await page.goto(`/${TENANT_SLUG}`);
  await loginIfNeeded(page);
  const tenantButton = page.getByRole('button', { name: new RegExp(TENANT_SLUG, 'i') }).first();
  if (await isVisible(tenantButton, 5_000)) {
    await tenantButton.click();
  }
  await expect(page.getByText(READY_PATTERN).first()).toBeVisible({ timeout: 30_000 });
};

const openOpportunities = async (page: Page) => {
  const sidebar = page.getByText(/Oportunidades/i).first();
  if (await isVisible(sidebar, 2_000)) await sidebar.click();
  await expect(page.getByText(/Oportunidades e Propostas|Pipeline comercial/i).first()).toBeVisible({ timeout: 20_000 });
};

const openNewOpportunityModal = async (page: Page) => {
  await openOpportunities(page);
  await page.getByRole('button', { name: /Nova|Nova Cot/i }).last().click();
  const productOption = page.getByRole('button', { name: /Assinatura SaaS|Contrato Mensal|Produto|Servi/i }).first();
  if (await isVisible(productOption, 2_000)) await productOption.click();
  await expect(page.getByRole('heading', { name: /Nova Oportunidade Comercial/i })).toBeVisible({ timeout: 10_000 });
};

const waitForSaveOutcome = async (page: Page, expectedText?: string) => {
  await page.waitForFunction(
    ({ expected, errorPatternSource }) => {
      const bodyText = document.body.innerText;
      return Boolean(expected && bodyText.includes(expected)) || new RegExp(errorPatternSource, 'i').test(bodyText) || !/Salvando dados|Criando/i.test(bodyText);
    },
    { expected: expectedText || '', errorPatternSource: ERROR_PATTERN.source },
    { timeout: 20_000 }
  );
};

const failWithVisibleError = async (page: Page, testInfo: TestInfo, diagnostics: ReturnType<typeof installDiagnostics>) => {
  const bodyText = await page.locator('body').innerText();
  const visibleError = bodyText.match(ERROR_PATTERN)?.[0] || null;
  await attachDiagnostics(testInfo, {
    ...diagnostics,
    visibleError,
    bodySample: bodyText.slice(0, 4_000)
  });
  if (visibleError) throw new Error(`Fluxo E2E falhou com erro visivel: ${visibleError}`);
};

test.describe('oPrice persistence diagnostics', () => {
  test.beforeEach(async ({ page }) => {
    const hasCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
    const hasStorageState = Boolean(process.env.E2E_STORAGE_STATE);
    test.skip(!hasCredentials && !hasStorageState, 'Set E2E_EMAIL/E2E_PASSWORD or E2E_STORAGE_STATE to run authenticated persistence diagnostics.');
    await openTenant(page);
  });

  test('saves tenant branding or captures exact Supabase failure', async ({ page }, testInfo) => {
    const diagnostics = installDiagnostics(page);
    const settingsButton = page.getByText(/Configuracoes do Tenant|Configurações do Tenant/i).first();
    if (!(await isVisible(settingsButton, 2_000))) {
      await page.getByRole('button', { name: /configura/i }).first().click().catch(() => undefined);
    }
    await expect(page.getByText(/Marca & Apar/i).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: /Salvar marca/i }).click();
    await waitForSaveOutcome(page);
    await failWithVisibleError(page, testInfo, diagnostics);
  });

  test('creates opportunity with existing client and saves quote', async ({ page }, testInfo) => {
    const diagnostics = installDiagnostics(page);
    await openNewOpportunityModal(page);
    await page.getByRole('button', { name: /Confirmar e Criar/i }).click();
    await waitForSaveOutcome(page);
    await failWithVisibleError(page, testInfo, diagnostics);

    const saveQuote = page.getByRole('button', { name: /Salvar cota|Salvar proposta/i }).first();
    if (await isVisible(saveQuote, 10_000)) {
      await saveQuote.click();
      await waitForSaveOutcome(page);
      await failWithVisibleError(page, testInfo, diagnostics);
    }
  });

  test('creates opportunity with inline client or captures exact save failure', async ({ page }, testInfo) => {
    const diagnostics = installDiagnostics(page);
    await openNewOpportunityModal(page);
    const clientName = `E2E Cliente ${Date.now()}`;
    await page
      .getByPlaceholder(/Ou cadastre novo cliente nesta cota|Nome do primeiro cliente/i)
      .fill(clientName);
    await page.getByRole('button', { name: /Confirmar e Criar/i }).click();
    await waitForSaveOutcome(page, clientName);
    await failWithVisibleError(page, testInfo, diagnostics);
    await expect(page.locator('body')).toContainText(clientName);
  });

  test('creates opportunity with inline client on mobile viewport', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const diagnostics = installDiagnostics(page);
    await openNewOpportunityModal(page);
    const clientName = `E2E Mobile Cliente ${Date.now()}`;
    await page
      .getByPlaceholder(/Ou cadastre novo cliente nesta cota|Nome do primeiro cliente/i)
      .fill(clientName);

    const confirmButton = page.getByRole('button', { name: /Confirmar e Criar/i });
    await expect(confirmButton).toBeVisible();
    await confirmButton.scrollIntoViewIfNeeded();
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    await waitForSaveOutcome(page, clientName);
    await failWithVisibleError(page, testInfo, diagnostics);
    await expect(page.locator('body')).toContainText(clientName);
  });
});
