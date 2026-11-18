const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("file://" + __dirname + "/../gallery/index.html", { waitUntil: "load" });
  const phone = await page.$("#sp-phone");
  await page.click("#sp-open"); await page.waitForTimeout(800);
  await phone.screenshot({ path: "../shots/sheet-half.png" });
  await page.click("#sp-grab"); await page.waitForTimeout(800);
  await phone.screenshot({ path: "../shots/sheet-full.png" });
  console.log("errors", errs.length, await page.evaluate(() => document.getElementById("sp-phone").className));
  await b.close();
})();
