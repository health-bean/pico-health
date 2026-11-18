const { chromium } = require("playwright-core");
(async () => {
  const base = process.env.BASE;
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto(base + link, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(3000);
  for (const p of ["/log", "/chat", "/reflect", "/insights", "/settings", "/my-list", "/reintroductions"]) {
    await page.goto(base + p, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => {
      const h = document.querySelector("header");
      return { header: !!h, wordmark: !!h?.querySelector('svg[aria-label="Pico Health"]'), oldText: !!h && /Pico Health/.test(h.textContent || "") };
    });
    await page.screenshot({ path: `../shots/live${p.replace(/\//g, "_")}.png` });
    console.log(p, JSON.stringify(info));
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
