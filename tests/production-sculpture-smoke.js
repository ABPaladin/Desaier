async (page) => {
  // Read-only acceptance of the canonical production deployment. No account writes.
  const origin = 'https://desaier-cjyd.vercel.app';
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const tab = await context.newPage(), errors = [];
  const ensure = (value, message) => { if (!value) throw Error(message); };
  tab.on('pageerror', error => errors.push(error.message));
  tab.on('console', message => { if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text()); });
  try {
    const response = await tab.goto(origin);
    ensure(response.status() === 200, 'Homepage unavailable');
    await tab.locator('svg[data-sculpture="silk"]').waitFor();
    await tab.waitForTimeout(1200);
    ensure(await tab.locator('.silk-sculpture').evaluate(svg => svg.getCurrentTime() > 0 && !svg.animationsPaused()), 'Production morph inactive');
    await tab.screenshot({ path: 'artifacts/silk-production-desktop.png' });
    await tab.getByRole('button', { name: 'Pause motion' }).click();
    ensure(await tab.locator('.silk-sculpture').evaluate(svg => svg.animationsPaused()), 'Production pause failed');
    await tab.emulateMedia({ reducedMotion: 'reduce' });
    await tab.setViewportSize({ width: 390, height: 844 });
    ensure(!(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Production mobile overflow');
    await tab.screenshot({ path: 'artifacts/silk-production-mobile.png' });
    await tab.getByRole('button', { name: 'Menu', exact: false }).click();
    await tab.locator('header').getByRole('link', { name: 'Log in', exact: true }).click();
    await tab.waitForURL('**/login');
    await tab.getByLabel('Email', { exact: true }).waitFor();
    ensure(await tab.getByLabel('Email', { exact: true }).isEnabled(), 'Production login unavailable');
    ensure(await tab.getByLabel('Password', { exact: true }).isEnabled(), 'Production password input unavailable');
    const health = await context.request.get(origin + '/api/health');
    ensure(health.status() === 200, 'Production configuration unhealthy');
    ensure((await context.request.get(origin + '/api/workspace')).status() === 401, 'Anonymous workspace access accepted');
    ensure(errors.length === 0, errors.join('\n'));
    return 'PASS: deployed silk sculpture, running morph and pause, desktop/mobile homepage, guest menu and configured login form, healthy configuration, anonymous workspace denied; no page/hydration errors. No production account writes.';
  } finally { await context.close(); }
}
