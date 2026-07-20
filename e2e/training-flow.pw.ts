import { test, expect } from '@playwright/test';

test('login, Today, Train catalog, and module metadata flow', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('rohitkparida');
  await page.getByLabel('Password').fill('magnus123');
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/$/);
  const onboarding = page.getByRole('dialog', { name: /a simple way to train/i });
  if (await onboarding.isVisible()) {
    await onboarding.getByRole('button', { name: /start today's plan/i }).click();
  }
  await expect(page.getByRole('heading', { name: /10-minute plan/i })).toBeVisible();

  await page.getByRole('link', { name: 'Train', exact: true }).click();
  await expect(page).toHaveURL(/\/train$/);
  await expect(page.getByRole('heading', { name: 'Choose a focus' })).toBeVisible();
  await expect(page.getByLabel('Calculation, locked')).toBeVisible();

  await page.getByRole('link', { name: /Board Vision/ }).click();
  await expect(page).toHaveURL(/\/train\/squares$/);
  await expect(page.locator('.task-label', { hasText: 'YOUR TASK' })).toBeVisible();
  await expect(page.getByLabel('Exercise details')).toContainText('New');

  await page.reload();
  await expect(page.getByLabel('Exercise details')).toBeVisible();

  await page.goto('/dictionary#loose-piece');
  await expect(page).toHaveURL(/\/dictionary#loose-piece$/);
  await expect(page.getByRole('heading', { name: 'Chess dictionary' })).toBeVisible();
  await expect(page.locator('#loose-piece')).toBeVisible();

});

test('guest mode opens every module', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /continue as guest/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('link', { name: 'Train', exact: true }).click();
  const catalog = page.locator('main.train-home');
  await expect(catalog.getByRole('link', { name: /Calculation/ })).toBeVisible();
  await expect(catalog.getByRole('link', { name: /Endgame/ })).toBeVisible();
  await expect(catalog.getByRole('link', { name: /Decision/ })).toBeVisible();

  for (const route of ['/train/calculation', '/train/positional', '/train/decision', '/train/endgame', '/train/opening', '/train/squares', '/train/mistakes']) {
    await page.goto(route);
    await page.waitForTimeout(1000);
    const task = page.locator('.task-label', { hasText: 'YOUR TASK' });
    await expect(task).toBeVisible({ timeout: 10_000 });
  }
});
