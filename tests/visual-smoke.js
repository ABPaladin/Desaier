async (page) => {
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const routes=['/','/services','/designers','/academy','/login','/register','/dashboard/client','/dashboard/designer','/dashboard/operator'];
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const route of routes){
   await page.goto('http://localhost:3002'+route);
   await page.locator('h1').waitFor();
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Overflow: '+route+' '+width);
   await page.screenshot({path:'artifacts/'+(route==='/'?'home':route.slice(1).replaceAll('/','-'))+'-'+width+'.png',fullPage:true});
  }
 }
 await page.goto('http://localhost:3002');
 await page.getByRole('button',{name:'Menu'}).click();
 await page.getByRole('link',{name:'Services',exact:true}).click();
 await page.waitForURL('**/services');
 await page.goto('http://localhost:3002/designers');
 await page.getByRole('button',{name:/ORA ORA/}).click();
 if(!await page.getByText(/A warm, expressive identity/).isVisible())throw new Error('Portfolio expansion');
 await page.goto('http://localhost:3002/dashboard/client');
 await page.getByLabel('Project name').fill('Test identity');
 await page.getByLabel('Your brief').fill('Create a thoughtful brand identity for our new studio.');
 await page.getByRole('button',{name:/Send demo brief/}).click();
 await page.getByRole('status').waitFor();
 await page.goto('http://localhost:3002/dashboard/designer');
 await page.getByRole('button',{name:/Submit concept/}).click();
 await page.getByText('Awaiting operator review',{exact:true}).waitFor();
 await page.goto('http://localhost:3002/dashboard/operator');
 await page.getByLabel('Assign designer').selectOption('Jamie Lee');
 await page.getByRole('button',{name:'Approve final delivery'}).click();
 await page.getByText('Approved for delivery',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Request changes'}).click();
 await page.getByText('Changes requested',{exact:true}).waitFor();
 for(const route of ['login','register']){
  await page.goto('http://localhost:3002/'+route);
  if(route==='register') await page.getByLabel('Name',{exact:true}).fill('Demo Person');
  await page.getByLabel('Email').fill('demo@example.com');
  await page.getByLabel('Password').fill('demo-only-password');
  await page.getByRole('button',{name:/workspace/}).click();
  await page.waitForURL('**/dashboard/client');
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://localhost:3002');
 if(await page.locator('.sculpture div').first().evaluate(el=>getComputedStyle(el).animationName)!=='none')throw new Error('Reduced motion failed');
 if(errors.length)throw new Error(errors.join('\n'));
 console.log('PASS: 18 responsive route checks, mobile navigation, portfolio expansion, brief, review, assignment, approval, login/register, reduced motion; no page errors.');
}
