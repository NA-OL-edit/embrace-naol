import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({width:1280, height:800});
  await page.goto('http://localhost:8080/admin', {waitUntil:'networkidle0'});
  await page.type('#l-email', 'naolsamuel7@gmail.com');
  await page.type('#l-pwd', 'Ch@nge@Sabaktani7@');
  await page.click('button[type=submit]');
  await new Promise(r=>setTimeout(r,3000));
  await page.screenshot({path:'C:\\Users\\EICUSER\\Downloads\\Gold\\new_admin.png', fullPage:true});
  // Also screenshot products page
  await page.evaluate(()=>navigate('products'));
  await new Promise(r=>setTimeout(r,2000));
  await page.screenshot({path:'C:\\Users\\EICUSER\\Downloads\\Gold\\new_admin_products.png', fullPage:true});
  await browser.close();
  console.log('Done');
})();
