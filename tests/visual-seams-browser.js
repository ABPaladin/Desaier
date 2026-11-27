async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
  const tab = await context.newPage(), errors = [];
  tab.on('pageerror', e => errors.push(e.message));
  const check = (ok, message) => { if (!ok) throw Error(message); };
  try {
    await tab.goto('http://localhost:3004');
    const svg = tab.locator('.silk-sculpture'); await svg.waitFor();
    const initial = await tab.locator('[data-sculpture-surface]').evaluate(p => p.getBBox().width);
    await tab.waitForTimeout(2500);
    check(Math.abs((await tab.locator('[data-sculpture-surface]').evaluate(p => p.getBBox().width)) - initial) > .1, 'Morph did not move');
    await tab.screenshot({ path: 'artifacts/hero-seam-desktop.png' });
    await tab.getByRole('button', { name: 'Pause motion' }).click();
    check(await svg.evaluate(s => s.animationsPaused()), 'Pause failed');
    for (const width of [1440, 390]) {
      await tab.setViewportSize({ width, height: 900 });
      await tab.emulateMedia({ reducedMotion: 'reduce' });
      await tab.locator('.academy').scrollIntoViewIfNeeded();
      const section = await tab.locator('.academy').boundingBox(), mark = await tab.locator('.academy > span').boundingBox();
      check(mark.y >= section.y && mark.y + mark.height <= section.y + section.height, 'Academy mark clipped vertically');
      check(mark.x >= section.x && mark.x + mark.width <= section.x + section.width, 'Academy mark clipped horizontally');
      check(!(await tab.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'Horizontal overflow');
      await tab.locator('.academy').screenshot({ path: `artifacts/academy-position-${width}.png` });
    }
    await tab.evaluate(() => scrollTo(0, 0));
    await tab.screenshot({ path: 'artifacts/hero-seam-mobile.png' });
    check(await svg.evaluate(s => s.animationsPaused()), 'Reduced motion failed');
    check(errors.length === 0, errors.join('\n'));
    return 'PASS: morph changes, pause, reduced motion, Academy mark containment, desktop/mobile overflow and no page errors.';
  } finally { await context.close(); }
}
