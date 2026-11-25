async (page) => {
  const browser = page.context().browser(), origin = 'http://localhost:3003';
  const contexts = [], errors = [], stamp = Date.now();
  const ensure = (value, message) => { if (!value) throw Error(message); };
  async function account() {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    contexts.push(context);
    const tab = await context.newPage(); tab.on('pageerror', error => errors.push(error.message));
    return { context, tab };
  }
  async function login(person, email, role) {
    await person.tab.goto(origin + '/login');
    await person.tab.getByLabel('Email', { exact: true }).fill(email);
    await person.tab.getByLabel('Password', { exact: true }).fill('demo-test-password');
    await person.tab.getByRole('button', { name: 'Enter workspace' }).click();
    await person.tab.waitForURL('**/dashboard/' + role);
    await person.tab.locator('.live-workspace:visible').waitFor();
  }
  async function register(person, label, type) {
    const email = `demo-${label}-${stamp}@demo.test`;
    await person.tab.goto(origin + '/register');
    await person.tab.getByRole('radio', { name: /^Client/ }).waitFor();
    ensure(await person.tab.getByRole('radio').count() === 2, 'Unexpected account options');
    await person.tab.getByRole('radio', { name: type === 'designer' ? /^Designer/ : /^Client/ }).check();
    await person.tab.getByLabel('Name', { exact: true }).fill('Demo ' + label);
    await person.tab.getByLabel('Email', { exact: true }).fill(email);
    await person.tab.getByLabel('Password', { exact: true }).fill('demo-test-password');
    if (label === 'approved') {
      await person.tab.screenshot({ path: 'artifacts/designer-registration-desktop.png', fullPage: true });
      await person.tab.setViewportSize({ width: 390, height: 900 });
      await person.tab.screenshot({ path: 'artifacts/designer-registration-mobile.png', fullPage: true });
      ensure(!(await person.tab.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Registration mobile overflow');
    }
    await person.tab.getByRole('button', { name: 'Create account' }).click();
    await person.tab.getByRole('status').filter({ hasText: 'Check your email' }).waitFor();
    ensure((await (await person.context.request.get(origin + '/api/auth/session')).json()).user === null, 'Signup skipped deliberate login');
    return email;
  }
  try {
    const approved = await account(), declined = await account(), client = await account(), operator = await account();
    const approvedEmail = await register(approved, 'approved', 'designer');
    await login(approved, approvedEmail, 'client');
    await approved.tab.getByRole('heading', { name: 'Your application is awaiting review.' }).waitFor();
    ensure(await approved.tab.getByRole('button', { name: 'New brief', exact: true }).count() === 0, 'Candidate shown client onboarding');
    await approved.tab.reload();
    await approved.tab.getByRole('heading', { name: 'Your application is awaiting review.' }).waitFor();
    await approved.tab.screenshot({ path: 'artifacts/designer-application-pending-mobile.png', fullPage: true });
    const pending = await (await approved.context.request.get(origin + '/api/workspace')).json();
    ensure(pending.profile.role === 'client' && pending.profile.designer_application_status === 'pending', 'Candidate gained staff role');
    const forbidden = await approved.context.request.post(origin + '/api/workspace', { headers: { Origin: origin }, data: { action: 'review-designer', member_id: pending.profile.id, decision: 'approved' } });
    ensure(forbidden.status() === 403, 'Candidate can self-approve');
    await approved.tab.goto(origin + '/dashboard/designer');
    await approved.tab.waitForURL('**/dashboard/client');
    const declinedEmail = await register(declined, 'declined', 'designer');
    await login(declined, declinedEmail, 'client');
    const clientEmail = await register(client, 'client', 'client');
    await login(client, clientEmail, 'client');
    await client.tab.getByRole('button', { name: 'New brief', exact: true }).waitFor();
    const badType = await client.context.request.post(origin + '/api/auth/register', { headers: { Origin: origin }, data: { name: 'Demo forbidden role', email: `demo-forged-${stamp}@demo.test`, password: 'demo-test-password', account_type: 'operator' } });
    ensure(badType.status() === 400, 'Public operator signup accepted');
    await login(operator, 'operator@demo.test', 'operator');
    await operator.tab.getByRole('button', { name: /People & access/ }).click();
    const approveRow = operator.tab.getByRole('article', { name: 'Application from Demo approved' });
    await approveRow.waitFor();
    await operator.tab.screenshot({ path: 'artifacts/designer-applications-operator-desktop.png', fullPage: true });
    await operator.tab.setViewportSize({ width: 390, height: 900 });
    ensure(!(await operator.tab.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Review mobile overflow');
    await operator.tab.screenshot({ path: 'artifacts/designer-applications-operator-mobile.png', fullPage: true });
    await approveRow.getByRole('button', { name: 'Approve designer' }).click();
    await approveRow.waitFor({ state: 'detached' });
    await approved.tab.getByRole('button', { name: 'Refresh', exact: true }).click();
    await approved.tab.waitForURL('**/dashboard/designer');
    await approved.tab.getByRole('button', { name: 'Creative profile' }).click();
    await approved.tab.getByLabel('Skills & tools').fill('Demo branding skills');
    await approved.tab.getByRole('button', { name: 'Save creative profile' }).click();
    await approved.tab.getByRole('status').filter({ hasText: 'Saved to your workspace.' }).waitFor();
    await operator.tab.getByRole('article', { name: 'Application from Demo declined' }).getByRole('button', { name: 'Decline application' }).click();
    await operator.tab.getByRole('article', { name: 'Application from Demo declined' }).waitFor({ state: 'detached' });
    await declined.tab.getByRole('button', { name: 'Refresh', exact: true }).click();
    await declined.tab.getByRole('heading', { name: 'Your application was not approved.' }).waitFor();
    const rejected = await (await declined.context.request.get(origin + '/api/workspace')).json();
    ensure(rejected.profile.role === 'client' && rejected.profile.designer_application_status === 'declined', 'Decline granted staff access');
    ensure(errors.length === 0, errors.join('\n'));
    return 'PASS: client/designer signup choices, confirmation notice and deliberate login, durable pending application, no self-approval/operator signup, operator approval/decline, role-aware redirect, approved profile editing, desktop/mobile layouts. Local Auth transport auto-confirms fixture emails; real email delivery is unchanged and not simulated as verified.';
  } finally { await Promise.all(contexts.map(context => context.close())); }
}
