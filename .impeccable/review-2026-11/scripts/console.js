const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  let navs = 0;
  page.on("console", (m) => { console.log("console", m.type(), m.text().slice(0, 300)); });
  page.on("pageerror", (e) => console.log("pageerror", e.message.slice(0, 300)));
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) navs++; });
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(10000);
  console.log("navigations", navs, page.url());
  await b.close();
})();
