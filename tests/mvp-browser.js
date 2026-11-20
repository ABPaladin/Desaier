async (page) => {
  const browser = page.context().browser();
  const origin = 'http://localhost:3003';
  const contexts = [], errors = [];
  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  async function account(role) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }); contexts.push(context);
    const tab = await context.newPage(); tab.on('pageerror', error => errors.push(error.message));
    await tab.goto(`${origin}/login`);
    await tab.getByLabel('Email', { exact: true }).fill(`${role}@demo.test`);
    await tab.getByLabel('Password', { exact: true }).fill('demo-test-password');
    await tab.getByRole('button', { name: 'Enter workspace' }).click();
    await tab.waitForURL(`**/dashboard/${role === 'other' ? 'client' : role}`);
    await tab.getByRole('button', { name: 'Refresh', exact: true }).waitFor();
    const cookies = await context.cookies();
    ensure(cookies.some(cookie => cookie.name.includes('auth-token')), 'Missing session cookie');
    ensure(cookies.filter(cookie => cookie.name.includes('auth-token')).every(cookie => cookie.httpOnly && cookie.sameSite === 'Lax'), 'Sessions must be HttpOnly and SameSite');
    ensure(!(await tab.evaluate(() => document.cookie)).includes('auth-token'), 'Session exposed to JavaScript');
    return { context, tab };
  }
  async function post(context, path, body, expected = 200) {
    const response = await context.request.post(origin + path, { headers: { Origin: origin }, data: body });
    ensure(response.status() === expected, `${path}: expected ${expected}, got ${response.status()} ${await response.text()}`);
    return response.json();
  }
  try {
    const client = await account('client');
    await client.tab.getByRole('button', { name: 'New brief' }).click();
    await client.tab.getByLabel('Project name').fill('Demo fixture — November launch');
    await client.tab.getByLabel('Industry', { exact: true }).fill('Creative studio');
    await client.tab.getByLabel('Your brief').fill('Create an expressive visual identity with a logo, palette and digital guidelines. This is a test fixture.');
    await client.tab.getByRole('button', { name: 'Send brief to the agency' }).click();
    await client.tab.getByRole('heading', { name: 'Demo fixture — November launch', exact: true }).waitFor();
    const projects = await (await client.context.request.get(origin + '/api/workspace')).json();
    const project = projects.projects.find(project => project.title === 'Demo fixture — November launch');
    ensure(project && project.requirements.industry === 'Creative studio', 'Brief not persisted');
    await client.tab.reload();
    await client.tab.getByRole('button', { name: /Demo fixture — November launch/ }).click();
    await client.tab.getByRole('heading', { name: 'Demo fixture — November launch', exact: true }).waitFor();
    await client.tab.goto(origin + '/dashboard/operator');
    await client.tab.waitForURL('**/dashboard/client');
    await post(client.context, '/api/workspace', { action: 'assign', project_id: project.id, version: 1, designer_id: '20000000-0000-4000-8000-000000000003', due_date: '' }, 403);
    const other = await account('other');
    const leaked = await other.context.request.get(origin + `/api/projects/${project.id}`);
    ensure(leaked.status() === 404, 'Cross-client detail leaked');

    const operator = await account('operator');
    await operator.tab.getByRole('button', { name: /Demo fixture — November launch/ }).click();
    await operator.tab.getByLabel('Assigned designer').selectOption('20000000-0000-4000-8000-000000000003');
    await operator.tab.getByLabel('Target delivery date').fill('2026-11-25');
    await operator.tab.getByRole('button', { name: 'Save assignment' }).click();
    await operator.tab.locator('.project-brief:visible .status').filter({ hasText: 'In progress' }).waitFor();
    await operator.tab.getByLabel('New task', { exact: true }).fill('Develop visual concepts');
    await operator.tab.getByRole('button', { name: 'Add task' }).click();
    await operator.tab.getByLabel('Develop visual concepts', { exact: true }).waitFor();
    await operator.tab.getByLabel('Message', { exact: true }).fill('Demo internal creative direction.');
    await operator.tab.getByRole('button', { name: 'Post message' }).click();
    await operator.tab.getByText('Demo internal creative direction.', { exact: true }).waitFor();
    await post(operator.context, '/api/workspace', { action: 'schedule', project_id: project.id, version: 1, due_date: '' }, 409);
    await post(operator.context, '/api/ai', { project_id: project.id }, 503);

    const designer = await account('designer');
    await designer.tab.getByRole('button', { name: 'Creative profile' }).click();
    await designer.tab.getByLabel('Skills & tools').fill('Brand identity, Figma, typography');
    await designer.tab.getByLabel('Timezone', { exact: true }).fill('Europe/Chisinau');
    await designer.tab.getByLabel('Portfolio URL').fill('https://example.com/demo-portfolio');
    await designer.tab.getByRole('button', { name: 'Save creative profile' }).click();
    await designer.tab.getByRole('status').filter({ hasText: 'Saved to your workspace.' }).waitFor();
    await designer.tab.getByRole('button', { name: 'Projects', exact: true }).click();
    await designer.tab.getByRole('button', { name: /Demo fixture — November launch/ }).click();
    await designer.tab.getByLabel('Develop visual concepts', { exact: true }).click();
    await designer.tab.waitForFunction(() => Array.from(document.querySelectorAll('.task-list input')).some(input => input.checked));
    await designer.tab.getByRole('status').filter({ hasText: 'Saved to your workspace.' }).waitFor();
    await designer.tab.getByLabel('Deliverable file').setInputFiles({ name: 'demo-concept.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nDemo test fixture\n%%EOF') });
    await designer.tab.getByLabel('Note for the operator').fill('Internal delivery note — not for the client.');
    await designer.tab.getByRole('button', { name: 'Submit file for review' }).click();
    await designer.tab.locator('.project-brief:visible .status').filter({ hasText: 'Operator review' }).waitFor();
    let clientDetail = await (await client.context.request.get(origin + `/api/projects/${project.id}`)).json();
    ensure(clientDetail.deliveries.length === 0 && clientDetail.comments.length === 0, 'Unapproved delivery or internal note leaked');
    await operator.tab.getByRole('button', { name: 'Refresh', exact: true }).click();
    await operator.tab.getByRole('button', { name: 'Approve delivery' }).waitFor();
    const review = await (await operator.context.request.get(origin + `/api/projects/${project.id}`)).json();
    await post(client.context, '/api/files', { action: 'download', delivery_id: review.deliveries[0].id }, 404);
    await operator.tab.getByRole('button', { name: 'Approve delivery' }).click();
    await operator.tab.locator('.project-brief:visible .status').filter({ hasText: 'Approved for delivery' }).waitFor();
    clientDetail = await (await client.context.request.get(origin + `/api/projects/${project.id}`)).json();
    ensure(clientDetail.deliveries.length === 1 && clientDetail.comments.length === 0, 'Approval visibility or private note isolation failed');
    const download = await post(client.context, '/api/files', { action: 'download', delivery_id: clientDetail.deliveries[0].id });
    ensure(download.url.includes('/object/sign/'), 'Download was not signed');
    await post(other.context, '/api/files', { action: 'download', delivery_id: clientDetail.deliveries[0].id }, 404);
    const csrf = await client.context.request.post(origin + '/api/workspace', { headers: { Origin: 'https://evil.example' }, data: { action: 'create' } });
    ensure(csrf.status() === 403, 'Cross-site mutation accepted');

    for (const width of [1440, 390]) {
      for (const { tab } of [client, operator, designer]) {
        await tab.setViewportSize({ width, height: 1000 });
        await tab.getByRole('button', { name: /Demo fixture — November launch/ }).click();
        await tab.getByRole('heading', { name: 'Demo fixture — November launch', exact: true }).waitFor();
        ensure(!await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth), `Workspace overflow at ${width}`);
        await tab.locator('.project-brief:visible .status').filter({hasText: 'Approved for delivery'}).waitFor();
        await tab.waitForFunction(() => Array.from(document.querySelectorAll('.workspace-stats')).filter(el => el.checkVisibility()).every(el => el.querySelectorAll('strong')[3]?.textContent === '1'), null, {timeout: 5000});
        const totals = await tab.locator('.workspace-stats:visible .stat').last().locator('strong').textContent();
        ensure(totals === '1', `Workspace totals did not synchronize: ${tab.url()} at ${width}; received ${totals}; ${await tab.locator('.project-brief:visible .status').textContent()}`);
        const role = new URL(tab.url()).pathname.split('/').at(-1);
        await tab.screenshot({ path: `artifacts/mvp-test-${role}-${width}.png`, fullPage: true });
      }
    }
    await post(operator.context, '/api/workspace', { action: 'member', member_id: '20000000-0000-4000-8000-000000000003', role: 'designer', active: false });
    ensure((await designer.context.request.get(origin + '/api/workspace')).status() === 403, 'Suspension did not revoke workspace');
    await client.tab.getByRole('button', { name: 'Log out' }).click();
    await client.tab.waitForURL('**/login');
    ensure((await client.context.request.get(origin + '/api/workspace')).status() === 401, 'Logout did not revoke session');
    ensure(errors.length === 0, errors.join('\n'));
    return 'PASS: Next.js endpoints + PostgreSQL RLS through isolated client, second client, designer and operator sessions; persisted briefs, role redirects, assignment, tasks, internal notes, profile, upload, review, signed download, stale edits, CSRF, suspension, logout and six responsive workspace captures. Auth/Storage transport is a local test double; live provider validation remains required.';
  } finally { await Promise.all(contexts.map(context => context.close())); }
}
