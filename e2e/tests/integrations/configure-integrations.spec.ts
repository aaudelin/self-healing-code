import { test, expect } from '@playwright/test';

test.describe('Configure Integrations', () => {
  test.beforeEach(async ({ page }) => {
    // Create a pipeline first
    await page.goto('/pipelines/new');
    await page.getByLabel(/name/i).fill('Integration Test Pipeline');
    await page.getByRole('button', { name: /create pipeline/i }).click();
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/edit/);
  });

  test('should configure all integrations', async ({ page }) => {
    // Configure Logs (Vercel)
    await page.getByRole('tab', { name: /logs/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /vercel/i }).click();
    await page.getByLabel(/project id/i).fill('prj_test123');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/configured successfully/i)).toBeVisible({ timeout: 5000 });

    // Configure Repository (GitHub)
    await page.getByRole('tab', { name: /repo/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /github/i }).click();
    await page.getByLabel(/owner/i).fill('test-org');
    await page.getByLabel(/repository/i).fill('test-repo');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/configured successfully/i)).toBeVisible({ timeout: 5000 });

    // Configure Database (Supabase)
    await page.getByRole('tab', { name: /db/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /supabase/i }).click();
    await page.getByLabel(/project reference/i).fill('abcdefghijklmnop');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/configured successfully/i)).toBeVisible({ timeout: 5000 });

    // Configure Ticketing (Linear)
    await page.getByRole('tab', { name: /tickets/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /linear/i }).click();
    await page.getByLabel(/team id/i).fill('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    await page.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/configured successfully/i)).toBeVisible({ timeout: 5000 });

    // Go back to pipeline detail
    await page.getByRole('button', { name: /done/i }).click();

    // Pipeline should now show as Configured
    await expect(page.getByText(/configured/i).first()).toBeVisible();
  });

  test('should show provider-specific fields', async ({ page }) => {
    // Select Logs tab and Vercel
    await page.getByRole('tab', { name: /logs/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /vercel/i }).click();

    // Should show Vercel-specific fields
    await expect(page.getByLabel(/project id/i)).toBeVisible();
    await expect(page.getByLabel(/team id/i)).toBeVisible();

    // Switch to Repository tab and GitHub
    await page.getByRole('tab', { name: /repo/i }).click();
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /github/i }).click();

    // Should show GitHub-specific fields
    await expect(page.getByLabel(/owner/i)).toBeVisible();
    await expect(page.getByLabel(/repository/i)).toBeVisible();
    await expect(page.getByLabel(/branch/i)).toBeVisible();
  });
});
