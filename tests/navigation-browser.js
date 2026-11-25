async (page) => {
  // Local demo fixtures only; never run this against production accounts.
  const browser = page.context().browser(), origin = 'http://localhost:3003';
  const contexts = [], errors = [], checks = [];
  const ensure = (value, message) => { if (!value) throw Error(message); };
  const watch = tab => { tab.on('pageerror', error => errors.push(error.message)); tab.on('console', message => { if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text()); }); };
  try {
    const guest = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); contexts.push(guest);
    const visitor = await guest.newPage(); watch(visitor);
    await visitor.goto(origin);
    await visitor.locator('header').getByRole('link', { name: 'Log in', exact: true }).waitFor();
    ensure(await visitor.locator('header').getByRole('link', { name: 'Start a project' }).count() === 1, 'Guest action missing');
    // Untrusted browser role state must never determine navigation.
    await visitor.evaluate(() => localStorage.setItem('role', 'operator'));
    await visitor.reload();
    await visitor.locator('header').getByRole('link', { name: 'Log in', exact: true }).waitFor();
    await visitor.goto(origin + '/login');
    await visitor.getByLabel('Email', { exact: true }).fill('client@demo.test');
    await visitor.getByLabel('Password', { exact: true }).fill('incorrect-password');
    await visitor.getByRole('button', { name: 'Enter workspace' }).click();
    await visitor.getByRole('alert').filter({ hasText: 'Login failed' }).waitFor();
    ensure(await visitor.locator('header .profile-trigger').count() === 0, 'Failed login changed identity');
    checks.push('Guest navigation, forged local role ignored, invalid login feedback');

    for (const role of ['client', 'designer', 'operator']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', hasTouch: true }); contexts.push(context);
      const tab = await context.newPage(); watch(tab);
      await tab.goto(origin + '/login');
      await tab.getByLabel('Email', { exact: true }).fill(role + '@demo.test');
      await tab.getByLabel('Password', { exact: true }).fill('demo-test-password');
      await tab.getByRole('button', { name: 'Enter workspace' }).click();
      await tab.waitForURL('**/dashboard/' + role);
      const trigger = tab.locator('header .profile-trigger');
      await trigger.waitFor();
      ensure((await trigger.innerText()).includes(role), 'Incorrect role after login');
      ensure(await tab.locator('header').getByRole('link', { name: 'Log in', exact: true }).count() === 0, 'Guest login remained after login');
      await tab.reload(); await trigger.waitFor();
      await tab.locator('header').getByRole('link', { name: 'Desaier home' }).click();
      await tab.waitForURL(origin + '/');
      await trigger.waitFor();
      const response = await context.request.get(origin + '/');
      const html = await response.text();
      ensure(html.includes('Account: Demo ' + role), 'Identity missing from SSR');
      ensure(!/<a[^>]*href="\/login"/.test(html), 'Authenticated SSR contains guest login');
      const identityResponse = await context.request.get(origin + '/api/auth/session');
      ensure(/no-store/.test(identityResponse.headers()['cache-control']), 'Identity cache unsafe');
      const identity = await identityResponse.json();
      ensure(Object.keys(identity.user).sort().join(',') === 'name,role', 'Excess account data in nav');
      const cta = tab.locator('header a.pill');
      ensure(await cta.getAttribute('href') === '/dashboard/' + role, 'Wrong role CTA');
      await trigger.focus(); await tab.keyboard.press('Enter');
      await tab.locator('.profile-panel').waitFor();
      await tab.keyboard.press('ArrowDown');
      ensure(await tab.evaluate(() => document.activeElement.textContent) === 'My Dashboard', 'Arrow focus missing');
      await tab.keyboard.press('End');
      ensure(await tab.evaluate(() => document.activeElement.textContent) === 'Log out', 'End focus missing');
      await tab.keyboard.press('Escape');
      ensure(await trigger.getAttribute('aria-expanded') === 'false', 'Escape did not close');
      ensure(await trigger.evaluate(el => el === document.activeElement), 'Escape did not restore focus');
      await trigger.click(); await tab.locator('.hero:visible').click({ position: { x: 10, y: 10 } });
      ensure(await trigger.getAttribute('aria-expanded') === 'false', 'Outside click did not close');
      await trigger.click();
      ensure(await tab.locator('.profile-panel').getByRole('link', { name: 'My Profile' }).count() === (role === 'designer' ? 1 : 0), 'Unsupported profile link');
      ensure(await tab.locator('.profile-panel').getByText('Settings').count() === 0, 'Unsupported settings shown');
      await tab.screenshot({ path: `artifacts/navigation-${role}-desktop.png` });
      await tab.locator('.profile-panel').getByRole('link', { name: 'My Dashboard' }).click();
      await tab.waitForURL('**/dashboard/' + role);
      await tab.locator('.live-workspace:visible').waitFor();
      if (role === 'designer') {
        await trigger.click(); await tab.getByRole('link', { name: 'My Profile', exact: true }).click();
        await tab.getByLabel('Skills & tools').waitFor();
        ensure(await tab.getByRole('button', { name: 'Save creative profile' }).isVisible(), 'Profile destination not functional');
      }
      await tab.setViewportSize({ width: 390, height: 844 });
      await tab.getByRole('button', { name: 'Menu', exact: false }).tap();
      await trigger.tap();
      await tab.locator('.profile-panel').waitFor();
      ensure(!(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Mobile overflow');
      await tab.screenshot({ path: `artifacts/navigation-${role}-mobile.png` });
      await tab.keyboard.press('Escape');
      ensure(await tab.locator('#main-navigation').isVisible(), 'Profile Escape unexpectedly closed mobile navigation');
      await tab.keyboard.press('Escape');
      ensure(!await tab.locator('#main-navigation').isVisible(), 'Second Escape did not close mobile navigation');
      await tab.getByRole('button', { name: 'Menu', exact: false }).tap();
      await trigger.tap();
      const otherTab = await context.newPage(); watch(otherTab);
      await otherTab.goto(origin + '/dashboard/' + role);
      await otherTab.locator('.live-workspace').waitFor();
      await tab.bringToFront();
      await tab.locator('.profile-panel').getByRole('button', { name: 'Log out', exact: true }).tap();
      await tab.waitForURL('**/login');
      await tab.getByRole('button', { name: 'Menu', exact: false }).tap();
      await tab.locator('header').getByRole('link', { name: 'Log in', exact: true }).waitFor();
      ensure(await tab.locator('header .profile-trigger').count() === 0, 'Logout retained profile');
      await otherTab.bringToFront();
      await otherTab.waitForURL('**/login');
      ensure(await otherTab.locator('.live-workspace:visible').count() === 0, 'Cross-tab logout retained visible private content');
      await tab.reload();
      const session = await (await context.request.get(origin + '/api/auth/session')).json();
      ensure(session.user === null, 'Logout session persisted');
      checks.push(`${role}: login, server identity, refresh, navigation, keyboard, outside click, touch menu, logout and cross-tab logout`);
    }
    ensure(errors.length === 0, errors.join('\n'));
    return { status: 'PASS', checks, browserErrors: errors };
  } finally { await Promise.all(contexts.map(context => context.close())); }
}
