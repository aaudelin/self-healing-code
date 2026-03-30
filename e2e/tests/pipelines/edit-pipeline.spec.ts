import { test, expect } from '@playwright/test';

test.describe('Edit Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Create a pipeline first
    await page.goto('/pipelines/new');
    await page.getByLabel(/name/i).fill('Pipeline to Edit');
    await page.getByRole('button', { name: /create pipeline/i }).click();

    // Wait for redirect to edit page
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/edit/);
  });

  test('should update pipeline name', async ({ page }) => {
    // Update the name
    await page.getByLabel(/name/i).fill('Updated Pipeline Name');
    await page.getByRole('button', { name: /update/i }).click();

    // Should show success (toast or stay on page without error)
    await expect(page.getByRole('heading', { name: /configure pipeline/i })).toBeVisible();
  });

  test('should show integration tabs', async ({ page }) => {
    // Check all integration tabs are present
    await expect(page.getByRole('tab', { name: /logs/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /repo/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /db/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /tickets/i })).toBeVisible();
  });

  test('should configure logs integration', async ({ page }) => {
    // Click on Logs tab
    await page.getByRole('tab', { name: /logs/i }).click();

    // Select Vercel provider
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: /vercel/i }).click();

    // Fill in project ID
    await page.getByLabel(/project id/i).fill('prj_test123');

    // Save
    await page.getByRole('button', { name: /save/i }).click();

    // Should show success (toast)
    await expect(page.getByText(/configured successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate back to pipeline detail', async ({ page }) => {
    await page.getByRole('button', { name: /done/i }).click();

    await expect(page).toHaveURL(/\/pipelines\/[\w]+$/);
  });
});
