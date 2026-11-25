async (page) => {
  // Read-only production checks: do not submit registration or create real accounts.
  const origin = 'https://desaier-cjyd.vercel.app';
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const tab = await context.newPage(), errors = [];
  const ensure = (value, message) => { if (!value) throw Error(message); };
  tab.on('pageerror', error => errors.push(error.message));
  tab.on('console', message => { if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text()); });
  try {
    ensure((await tab.goto(origin)).status() === 200, 'Homepage unavailable');
    await tab.locator('svg[data-sculpture="silk"]').waitFor();
    await tab.locator('header').getByRole('link', { name: 'Log in', exact: true }).click();
    await tab.waitForURL('**/login');
    ensure(await tab.getByLabel('Email', { exact: true }).isEnabled(), 'Login disabled');
    ensure(await tab.getByLabel('Password', { exact: true }).isEnabled(), 'Password disabled');
    await tab.getByRole('link', { name: 'Register', exact: true }).click();
    await tab.getByRole('radio', { name: /^Client/ }).waitFor();
    ensure(await tab.getByRole('radio').count() === 2, 'Unexpected signup choices');
    await tab.getByRole('radio', { name: /^Designer/ }).check();
    ensure((await tab.locator('#account-type-help').innerText()).includes('agency operator'), 'Approval explanation missing');
    ensure(await tab.getByRole('button', { name: 'Create account' }).isEnabled(), 'Signup disabled');
    await tab.screenshot({ path: 'artifacts/designer-production-desktop.png', fullPage: true });
    await tab.setViewportSize({ width: 390, height: 900 });
    ensure(!(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Mobile overflow');
    await tab.screenshot({ path: 'artifacts/designer-production-mobile.png', fullPage: true });
    await tab.getByRole('button', { name: /Menu/ }).click();
    await tab.locator('header').getByRole('link', { name: 'Log in', exact: true }).click();
    await tab.waitForURL('**/login');
    ensure((await context.request.get(origin + '/api/health')).status() === 200, 'Invalid production configuration');
    ensure((await context.request.get(origin + '/api/workspace')).status() === 401, 'Anonymous workspace accepted');
    ensure(errors.length === 0, errors.join('\n'));
    return 'PASS: canonical homepage/sculpture, desktop/mobile navigation, enabled login and registration, Client/Designer choice and approval notice, no overflow or page/hydration errors, health 200 and anonymous workspace 401. No accounts created or email sent.';
  } finally { await context.close(); }
}
