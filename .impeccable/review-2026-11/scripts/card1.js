const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const p = await (await b.newContext({ deviceScaleFactor: 4, viewport: { width: 340, height: 480 } })).newPage();
  await p.goto("file://" + __dirname + "/../pdfbuild/card1.html", { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  console.log("Source Sans loaded:", await p.evaluate(() => ["400","600"].map(w => document.fonts.check(`${w} 12px "Source Sans 3"`))));
  await p.locator("#c1").screenshot({ path: __dirname + "/../pdfbuild/card1.png", omitBackground: true });
  await b.close();
})();
