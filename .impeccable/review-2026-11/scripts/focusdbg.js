const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log("console", m.text().slice(0, 200)); });
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.evaluate(() => localStorage.setItem("pico:insights-range", "180"));
  await page.goto("http://localhost:3100/insights?focus=histamine", { waitUntil: "load" });
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000);
    const st = await page.evaluate(() => ({ el: !!document.getElementById("watch-histamine"), ids: [...document.querySelectorAll("article[id]")].map((a) => a.id), y: Math.round(window.scrollY) }));
    console.log(i, JSON.stringify(st));
    if (st.el) break;
  }
  await page.waitForTimeout(1500);
  console.log("after", await page.evaluate(() => Math.round(window.scrollY)));
  await b.close();
})();
