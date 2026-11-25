async (page) => {
  const browser = page.context().browser(), origin = 'http://localhost:3003';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const operator = await browser.newContext();
  const ensure = (value, message) => { if (!value) throw Error(message); };
  const post = async (ctx, path, body) => {
    const response = await ctx.request.post(origin + path, { headers: { Origin: origin }, data: body });
    ensure(response.ok(), `Fixture request failed: ${path}, ${response.status()}`);
    return response;
  };
  try {
    await post(context, '/api/auth/login', { email: 'other@demo.test', password: 'demo-test-password' });
    const cookie = (await context.cookies()).find(cookie => /auth-token$/.test(cookie.name));
    ensure(cookie?.value.startsWith('base64-'), 'Unexpected fixture session format');
    const session = JSON.parse(Buffer.from(cookie.value.slice(7), 'base64url').toString());
    const oldToken = session.access_token;
    session.expires_at = 1; // Simulate expiry; the Auth transport must refresh it.
    session.user.user_metadata.role = 'operator'; // Untrusted metadata is not authority.
    await context.addCookies([{ ...cookie, value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url') }]);
    const response = await context.request.get(origin + '/');
    ensure(response.ok(), 'Expired-session SSR failed');
    ensure((await response.text()).includes('Account: Demo other'), 'Refresh lost server-rendered identity');
    const refreshed = (await context.cookies()).find(item => item.name === cookie.name);
    ensure(refreshed.httpOnly && refreshed.sameSite === 'Lax', 'Refresh weakened cookie protections');
    const renewed = JSON.parse(Buffer.from(refreshed.value.slice(7), 'base64url').toString());
    ensure(renewed.access_token !== oldToken && renewed.expires_at > Date.now() / 1000, 'Proxy failed to persist refreshed cookie');
    const identity = await (await context.request.get(origin + '/api/auth/session')).json();
    ensure(identity.user.role === 'client', 'Metadata role was trusted');
    const tab = await context.newPage();
    await tab.goto(origin + '/dashboard/client');
    await tab.locator('.live-workspace:visible').waitFor();
    await tab.route('**/api/auth/session', route => route.fulfill({ status: 503, json: { user: null, unavailable: true } }));
    await tab.evaluate(() => window.dispatchEvent(new Event('focus')));
    await tab.locator('header .profile-trigger').waitFor();
    ensure(await tab.locator('header').getByRole('link', { name: 'Log in', exact: true }).count() === 0, 'Transient error flashed guest navigation');
    await tab.unroute('**/api/auth/session');
    await tab.locator('header .profile-trigger').click();
    await tab.route('**/api/auth/logout', route => route.fulfill({ status: 503, json: { error: 'Test outage' } }));
    await tab.locator('.profile-panel').getByRole('button', { name: 'Log out' }).click();
    try { await tab.locator('.profile-panel').getByRole('alert').waitFor({ timeout: 3000 }); }
    catch { throw Error(`Failed logout UI: ${await tab.locator('header').innerText()}`); }
    ensure(await tab.locator('header .profile-trigger').count() === 1, 'Failed logout falsely cleared identity');
    await tab.unroute('**/api/auth/logout');
    await tab.keyboard.press('Escape');

    await post(operator, '/api/auth/login', { email: 'operator@demo.test', password: 'demo-test-password' });
    const member = { action: 'member', member_id: '20000000-0000-4000-8000-000000000002', role: 'designer', active: true };
    await post(operator, '/api/workspace', member);
    await tab.evaluate(() => window.dispatchEvent(new Event('focus')));
    await tab.waitForURL('**/dashboard/designer');
    await tab.waitForFunction(() => document.querySelector('.profile-summary small')?.textContent === 'designer');
    await post(operator, '/api/workspace', { ...member, active: false });
    await tab.evaluate(() => window.dispatchEvent(new Event('focus')));
    await tab.waitForURL('**/login');
    const inactive = await (await context.request.get(origin + '/api/auth/session')).json();
    ensure(inactive.user === null, 'Suspended identity leaked');
    await post(operator, '/api/workspace', { ...member, role: 'client' });
    await post(context, '/api/auth/logout', {});
    // Replay a revoked token: getUser must reject it even though its expiry is valid.
    await context.addCookies([refreshed]);
    const revoked = await (await context.request.get(origin + '/api/auth/session')).json();
    ensure(revoked.user === null, 'Revoked session trusted');
    return 'PASS: expired-cookie refresh persisted securely, untrusted metadata ignored, outage and failed logout recovery, live role change, suspension and revoked session.';
  } finally { await context.close(); await operator.close(); }
}
