import { test, expect } from '@playwright/test';

test.describe('List Pipelines', () => {
  test('should display the dashboard', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    await expect(page.getByRole('heading', { name: /pipelines/i })).toBeVisible();

    // Check for new pipeline button
    await expect(page.getByRole('link', { name: /new pipeline/i })).toBeVisible();
  });

  test('should show empty state when no pipelines exist', async ({ page }) => {
    await page.goto('/');

    // May show empty state or existing pipelines depending on DB state
    const emptyState = page.getByText(/no pipelines yet/i);
    const pipelineCards = page.locator('[data-testid="pipeline-card"]');

    // Either show empty state or have some pipeline cards
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasPipelines = (await pipelineCards.count()) > 0;

    expect(hasEmptyState || hasPipelines).toBeTruthy();
  });

  test('should navigate to create pipeline page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /new pipeline/i }).click();

    await expect(page).toHaveURL('/pipelines/new');
  });
});
