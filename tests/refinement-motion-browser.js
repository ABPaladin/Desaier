async (page) => {
  const ensure = (value, message) => { if (!value) throw Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /hydrat/i.test(message.text())) errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://localhost:3003');
  const svg = page.locator('.silk-sculpture');
  await svg.waitFor();
  const sample = () => page.locator('[data-sculpture-surface]').evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() * .2);
    return [point.x, point.y];
  });
  const first = await sample(); await page.waitForTimeout(1100);
  ensure(JSON.stringify(first) !== JSON.stringify(await sample()), 'Silhouette is not morphing');
  await page.getByRole('button', { name: 'Pause motion' }).click();
  const pausedTime = await svg.evaluate(el => el.getCurrentTime());
  const pausedShape = await sample(); await page.waitForTimeout(200);
  ensure(pausedTime === await svg.evaluate(el => el.getCurrentTime()), 'Pause left SVG timeline running');
  ensure(JSON.stringify(pausedShape) === JSON.stringify(await sample()), 'Pause left geometry moving');
  for (const phase of [0, 7, 14]) {
    await svg.evaluate((el, time) => el.setCurrentTime(time), phase);
    await page.screenshot({ path: `artifacts/silk-phase-${phase}.png` });
  }
  await page.getByRole('button', { name: 'Resume motion' }).click();
  ensure(await svg.evaluate(el => el.getCurrentTime()) >= 14, 'Resume restarted the sculpture');
  await page.waitForTimeout(150);
  ensure(await svg.evaluate(el => el.getCurrentTime()) > 14, 'Resume did not restart the clock');
  await page.screenshot({ path: 'artifacts/silk-desktop.png' });
  await page.locator('.process').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.living-field').classList.contains('offstage'));
  ensure(await svg.evaluate(el => el.animationsPaused()), 'Offscreen SVG kept running');
  ensure(await page.evaluate(() => document.getAnimations().some(a => a.id === 'desaier-scroll' && a.currentTime > 300)), 'Scroll storytelling inactive');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  ensure(await svg.evaluate(el => el.animationsPaused()), 'Reduced motion left SVG running');
  ensure(await page.evaluate(() => !document.getAnimations().some(a => a.id === 'desaier-scroll')), 'Reduced motion left scroll animations active');
  await page.locator('.hero').scrollIntoViewIfNeeded();
  const reducedShape = await sample(); await page.waitForTimeout(150);
  ensure(JSON.stringify(reducedShape) === JSON.stringify(await sample()), 'Reduced motion changed geometry');
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    ensure(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Overflow at ' + width);
    if (width === 390) await page.screenshot({ path: 'artifacts/silk-mobile.png' });
  }
  await page.locator('.work').first().click();
  ensure(await page.locator('.study-expansion').first().getAttribute('aria-hidden') === 'false', 'Expansion inaccessible');
  await page.locator('.work').first().click();
  ensure(await page.locator('.study-expansion').first().getAttribute('aria-hidden') === 'true', 'Collapse inaccessible');
  await page.goto('http://localhost:3003');
  await page.locator('.silk-sculpture').waitFor();
  ensure(await page.locator('.silk-sculpture').evaluate(el => el.animationsPaused()), 'Initial reduced motion was not respected');
  ensure(errors.length === 0, errors.join('\n'));
  return 'PASS: continuous surface morphs, pause/resume preserves phase, offscreen suspension, initial/live reduced motion, scroll storytelling, four responsive widths, portfolio expansion; no page or hydration errors.';
}
