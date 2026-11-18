const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const p = await (await b.newContext({ deviceScaleFactor: 3, viewport: { width: 420, height: 1900 } })).newPage();
  await p.goto("file://" + __dirname + "/../pdfbuild/panels.html"); await p.waitForTimeout(1500);
  for (const id of ["a", "b", "c"]) await p.locator("#" + id).screenshot({ path: __dirname + `/../pdfbuild/panel-${id}.png`, omitBackground: true });
  await b.close();
})();
