import { test, expect } from '@playwright/test';

test.describe('Trigger Pipeline Run', () => {
  test('should not allow running unconfigured pipeline', async ({ page }) => {
    // Create a new pipeline (unconfigured)
    await page.goto('/pipelines/new');
    await page.getByLabel(/name/i).fill('Unconfigured Pipeline');
    await page.getByRole('button', { name: /create pipeline/i }).click();

    // Go back to dashboard
    await page.goto('/');

    // Find the pipeline card
    await expect(page.getByText('Unconfigured Pipeline')).toBeVisible();

    // Run button should be disabled
    const runButton = page.locator('button').filter({ hasText: /run/i }).first();
    await expect(runButton).toBeDisabled();
  });

  test('should trigger run on configured pipeline', async ({ page }) => {
    // Create and configure a pipeline
    await page.goto('/pipelines/new');
    await page.getByLabel(/name/i).fill('Configured Pipeline for Run');
    await page.getByRole('button', { name: /create pipeline/i }).click();
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/edit/);

    // Quick configure all integrations
    // Logs
    await page.getByRole('tab', { name: /logs/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /vercel/i }).click();
    await page.getByLabel(/project id/i).fill('prj_test');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Repository
    await page.getByRole('tab', { name: /repo/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /github/i }).click();
    await page.getByLabel(/owner/i).fill('test');
    await page.getByLabel(/repository/i).fill('test');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Database
    await page.getByRole('tab', { name: /db/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /supabase/i }).click();
    await page.getByLabel(/project reference/i).fill('test');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Ticketing
    await page.getByRole('tab', { name: /tickets/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /linear/i }).click();
    await page.getByLabel(/team id/i).fill('test-team-id');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1000);

    // Go to pipeline detail page
    await page.getByRole('button', { name: /done/i }).click();

    // Click run button
    await page.getByRole('button', { name: /run pipeline/i }).click();

    // Should navigate to run detail page
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/runs\/[\w]+/);

    // Should show run status
    await expect(page.getByRole('heading', { name: /pipeline run/i })).toBeVisible();
  });
});
