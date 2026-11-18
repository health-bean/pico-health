const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  await page.goto("file://" + __dirname + "/../gallery/index.html", { waitUntil: "load" });
  const phone = await page.$("#sp-phone");
  await phone.screenshot({ path: "../shots/sheet-closed.png" });
  await page.click("#sp-open"); await page.waitForTimeout(700);
  await phone.screenshot({ path: "../shots/sheet-open.png" });
  await page.click("#sp-close"); await page.waitForTimeout(700);
  const closed = await page.evaluate(() => !document.getElementById("sp-phone").classList.contains("open"));
  console.log("errors", errs.length, "closes", closed);
  await b.close();
})();
