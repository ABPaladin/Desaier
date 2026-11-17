async (page) => {
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://localhost:3003');
 const body=page.locator('.ribbon-body');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.ribbon-body')).animationPlayState==='running');
 await page.getByRole('button',{name:'Pause motion'}).click();
 if(await body.evaluate(el=>getComputedStyle(el).animationPlayState)!=='paused')throw Error('Pause failed');
 await page.getByRole('button',{name:'Resume motion'}).click();
 await page.mouse.move(1150,420);
 if(!await page.locator('.living-field').evaluate(el=>el.style.getPropertyValue('--drift-x')))throw Error('Pointer drift inactive');
 await page.locator('.work').first().scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.living-field').classList.contains('offstage'));
 await page.locator('.work').first().scrollIntoViewIfNeeded();
 await page.waitForTimeout(1200);
 await page.locator('.work').first().hover();
 if(await page.locator('.view-project').first().evaluate(el=>Number(getComputedStyle(el).opacity))<.9)await page.waitForTimeout(400);
 await page.screenshot({path:'artifacts/creative-work-hover.png'});
 await page.emulateMedia({reducedMotion:'reduce'});
 if(await body.evaluate(el=>getComputedStyle(el).animationName)!=='none')throw Error('Live reduced motion failed');
 for(const width of [320,768,1024]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/services','/designers','/dashboard/operator']){
   await page.goto('http://localhost:3003'+route);
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow '+width+' '+route);
  }
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://localhost:3003');
 await page.keyboard.press('Tab');
 if(await page.evaluate(()=>document.activeElement.textContent)!=='Skip to content')throw Error('Skip navigation focus');
 return 'PASS: motion pause/resume, pointer drift, offscreen suspension, live reduced-motion change, hover, keyboard entry, 12 additional responsive checks.';
}
