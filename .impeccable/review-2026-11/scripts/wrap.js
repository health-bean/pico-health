const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const p = await (await b.newContext({ deviceScaleFactor: 4, viewport: { width: 340, height: 1000 } })).newPage();
  await p.goto("file://" + __dirname + "/../pdfbuild/wrap.html"); await p.waitForTimeout(800);
  for (const id of ["b", "c"]) await p.locator("#" + id).screenshot({ path: __dirname + `/../pdfbuild/old-${id}.png`, omitBackground: true });
  await b.close();
})();
