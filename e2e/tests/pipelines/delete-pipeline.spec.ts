import { test, expect } from '@playwright/test';

test.describe('Delete Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Create a pipeline first
    await page.goto('/pipelines/new');
    await page.getByLabel(/name/i).fill('Pipeline to Delete');
    await page.getByRole('button', { name: /create pipeline/i }).click();

    // Wait for redirect and go back to dashboard
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/edit/);
    await page.goto('/');
  });

  test('should show delete confirmation dialog', async ({ page }) => {
    // Find and click delete button on the pipeline card
    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    await deleteButton.click();

    // Check confirmation dialog appears
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
  });

  test('should cancel deletion', async ({ page }) => {
    // Find and click delete button
    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    await deleteButton.click();

    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible();

    // Pipeline should still exist
    await expect(page.getByText('Pipeline to Delete')).toBeVisible();
  });

  test('should delete pipeline', async ({ page }) => {
    // Find and click delete button
    const deleteButton = page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first();
    await deleteButton.click();

    // Confirm deletion
    await page.getByRole('button', { name: /delete/i }).last().click();

    // Should show success toast
    await expect(page.getByText(/pipeline deleted/i)).toBeVisible({ timeout: 5000 });
  });
});
