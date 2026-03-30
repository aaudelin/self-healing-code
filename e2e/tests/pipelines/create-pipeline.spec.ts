import { test, expect } from '@playwright/test';

test.describe('Create Pipeline', () => {
  test('should create a new pipeline', async ({ page }) => {
    await page.goto('/');

    // Click new pipeline button
    await page.getByRole('link', { name: /new pipeline/i }).click();

    // Wait for form to load
    await expect(page.getByRole('heading', { name: /create pipeline/i })).toBeVisible();

    // Fill in the form
    await page.getByLabel(/name/i).fill('Test Pipeline');
    await page.getByLabel(/description/i).fill('A test pipeline for E2E testing');

    // Submit the form
    await page.getByRole('button', { name: /create pipeline/i }).click();

    // Should redirect to edit page
    await expect(page).toHaveURL(/\/pipelines\/[\w]+\/edit/);

    // Should show success message or be on the edit page
    await expect(page.getByRole('heading', { name: /configure pipeline/i })).toBeVisible();
  });

  test('should require a name', async ({ page }) => {
    await page.goto('/pipelines/new');

    // Try to submit without filling in the name
    const submitButton = page.getByRole('button', { name: /create pipeline/i });

    // Button should be disabled when name is empty
    await expect(submitButton).toBeDisabled();
  });

  test('should allow canceling', async ({ page }) => {
    await page.goto('/pipelines/new');

    // Click cancel button
    await page.getByRole('button', { name: /cancel/i }).click();

    // Should redirect back to dashboard
    await expect(page).toHaveURL('/');
  });
});
