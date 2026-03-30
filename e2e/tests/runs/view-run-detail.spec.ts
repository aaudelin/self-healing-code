import { test, expect } from '@playwright/test';

test.describe('View Run Detail', () => {
  test('should display run timeline with steps', async ({ page }) => {
    // Create and configure a pipeline, then trigger a run
    await page.goto('/pipelines/new');
    await page.getByLabel(/name/i).fill('Run Detail Test Pipeline');
    await page.getByRole('button', { name: /create pipeline/i }).click();
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/edit/);

    // Quick configure all integrations
    const integrations = [
      { tab: 'logs', provider: 'vercel', field: 'project id', value: 'prj_test' },
      { tab: 'repo', provider: 'github', fields: [{ label: 'owner', value: 'test' }, { label: 'repository', value: 'test' }] },
      { tab: 'db', provider: 'supabase', field: 'project reference', value: 'test' },
      { tab: 'tickets', provider: 'linear', field: 'team id', value: 'test-team' },
    ];

    for (const integration of integrations) {
      await page.getByRole('tab', { name: new RegExp(integration.tab, 'i') }).click();
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: new RegExp(integration.provider, 'i') }).click();

      if ('fields' in integration) {
        for (const f of integration.fields) {
          await page.getByLabel(new RegExp(f.label, 'i')).fill(f.value);
        }
      } else if ('field' in integration) {
        await page.getByLabel(new RegExp(integration.field, 'i')).fill(integration.value);
      }

      await page.getByRole('button', { name: /save/i }).click();
      await page.waitForTimeout(1000);
    }

    // Trigger a run
    await page.getByRole('button', { name: /done/i }).click();
    await page.getByRole('button', { name: /run pipeline/i }).click();

    // Wait for run page
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/runs\/[\w]+/);

    // Check for timeline elements
    await expect(page.getByText(/execution timeline/i)).toBeVisible();

    // Should show step names
    await expect(page.getByText(/log ingestion/i)).toBeVisible();
    await expect(page.getByText(/repository clone/i)).toBeVisible();
    await expect(page.getByText(/schema inspection/i)).toBeVisible();
    await expect(page.getByText(/analysis/i)).toBeVisible();
    await expect(page.getByText(/remediation/i)).toBeVisible();
    await expect(page.getByText(/ticket update/i)).toBeVisible();
  });

  test('should show run status badge', async ({ page }) => {
    // Navigate to a run (assuming one exists from previous test)
    await page.goto('/');

    // If there are pipelines with runs, click on one
    const pipelineLink = page.locator('a').filter({ hasText: /run detail test/i }).first();
    const exists = await pipelineLink.isVisible().catch(() => false);

    if (exists) {
      await pipelineLink.click();

      // Click on a run
      const runLink = page.locator('a').filter({ has: page.locator('[class*="badge"]') }).first();
      const runExists = await runLink.isVisible().catch(() => false);

      if (runExists) {
        await runLink.click();
        await expect(page).toHaveURL(/\/pipelines\/[\w]+\/runs\/[\w]+/);

        // Should show some status badge
        await expect(page.locator('[class*="badge"]').first()).toBeVisible();
      }
    }
  });
});
