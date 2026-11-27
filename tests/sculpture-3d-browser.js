async (page) => {
  const origin = new URL(page.url()).origin;
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
  const tab=await context.newPage(), errors=[];
  tab.on('pageerror',e=>errors.push(e.message));
  const ensure=(value,message)=>{if(!value)throw Error(message);};
  try {
    await tab.goto(origin);
    const model=tab.locator('.sculpture-3d');
    await tab.locator('.sculpture-3d[data-ready]').waitFor();
    await tab.waitForTimeout(1200);
    ensure(Number(await model.getAttribute('data-frame'))>0,'No WebGL animation');
    ensure(await model.locator('canvas').evaluate(c=>c.width<=1100),'Resolution budget exceeded');
    await tab.screenshot({path:'artifacts/sculpture-3d-desktop.png'});
    await tab.getByRole('button',{name:'Pause motion'}).click();
    const paused=await model.getAttribute('data-frame');
    await tab.waitForTimeout(250);
    ensure(await model.getAttribute('data-frame')===paused,'Pause did not stop rendering');
    await tab.getByRole('button',{name:'Resume motion'}).click();
    await tab.locator('.academy').scrollIntoViewIfNeeded();
    await tab.waitForTimeout(150);
    ensure(await model.getAttribute('data-running')==='false','Offscreen rendering continues');
    const mark=tab.locator('.academy > span > svg');
    await tab.mouse.move(0,0); await tab.waitForTimeout(1300);
    const base=await mark.evaluate(el=>getComputedStyle(el).color);
    await tab.locator('.academy').hover();
    ensure(await mark.evaluate(el=>getComputedStyle(el).transitionDelay)==='0.18s','Hover delay missing');
    await tab.waitForTimeout(1500);
    ensure(await mark.evaluate(el=>getComputedStyle(el).color)!==base,'Hover illumination missing');
    await tab.locator('.academy').screenshot({path:'artifacts/academy-glow-desktop.png'});
    await tab.emulateMedia({reducedMotion:'reduce'});
    await tab.setViewportSize({width:390,height:844});
    await tab.evaluate(()=>scrollTo(0,0)); await tab.waitForTimeout(200);
    ensure(await model.getAttribute('data-running')==='false','Reduced motion renders continuously');
    ensure(!(await tab.evaluate(()=>document.documentElement.scrollWidth>innerWidth)),'Mobile overflow');
    await tab.screenshot({path:'artifacts/sculpture-3d-mobile.png'});
    await model.locator('canvas').evaluate(c=>c.getContext('webgl').getExtension('WEBGL_lose_context').loseContext());
    await tab.waitForTimeout(150);
    ensure(await model.getAttribute('data-ready')===null,'Context loss has no fallback');
    ensure(await model.locator('svg').isVisible(),'SVG fallback hidden');
    await tab.getByRole('button',{name:/Menu/}).click();
    await tab.locator('header').getByRole('link',{name:'Log in',exact:true}).click();
    await tab.waitForURL('**/login');
    await tab.getByLabel('Email',{exact:true}).waitFor();
    ensure(errors.length===0,errors.join('\n'));
    return 'PASS: WebGL render, capped resolution, animation, pause/resume, offscreen suspension, reduced motion, context-loss fallback, desktop/mobile screenshots, delayed Academy illumination and mobile login navigation. No page errors.';
  } finally {await context.close();}
}
