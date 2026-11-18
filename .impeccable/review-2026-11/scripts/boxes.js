const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const p = await (await b.newContext({ deviceScaleFactor: 3, viewport: { width: 360, height: 2800 } })).newPage();
  await p.goto("file://" + __dirname + "/../boxes/boxes.html", { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  console.log("font:", await p.evaluate(() => document.fonts.check('500 13px "Source Sans 3"')));
  for (const id of ["b1", "b2", "b3", "b2n", "b3n"]) await p.locator("#" + id).screenshot({ path: __dirname + `/../boxes/${id}.png`, omitBackground: true });
  await b.close();
})();
