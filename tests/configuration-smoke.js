async (page) => {
  const origin = 'http://localhost:3003';
  await page.context().clearCookies();
  await page.setViewportSize({ width: 390, height: 900 });
  for (const path of ['/login', '/register', '/forgot-password', '/reset-password']) {
    await page.goto(origin + path);
    await page.getByRole('heading', { level: 1 }).waitFor();
    if (!await page.locator('form:visible fieldset input').first().isDisabled()) throw new Error(`Unconfigured auth enabled at ${path}`);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`Overflow ${path}`);
  }
  await page.goto(origin + '/dashboard/client');
  await page.getByRole('alert').filter({ hasText: 'not available yet' }).waitFor();
  if (await page.getByText('ORA — Brand identity', { exact: true }).count()) throw new Error('Demo data leaked into real workspace');
  const unavailable = await page.request.get(origin + '/api/workspace');
  if (unavailable.status() !== 503 || !unavailable.headers()['cache-control'].includes('no-store')) throw new Error('Unconfigured backend did not fail closed');
  const crossSite = await page.request.post(origin + '/api/workspace', { headers: { Origin: 'https://evil.example' }, data: { action: 'create' } });
  if (crossSite.status() !== 403) throw new Error('Cross-origin mutation accepted');
  await page.goto(origin + '/auth/confirm?code=invalid&next=https://evil.example');
  if (new URL(page.url()).pathname !== '/login') throw new Error('Invalid callback redirect');
  return 'PASS: all four account forms disabled without configuration, private APIs fail closed/no-store, real workspaces contain no demo records, cross-site mutation blocked, invalid callback stays on-site; mobile layout checks passed.';
}
