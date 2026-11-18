const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), Math.round(b.height)]; };
    const q = (s) => document.querySelector(s);
    const byText = (t) => [...document.querySelectorAll("span,p,h2,h3,button")].find((e) => e.textContent.trim().startsWith(t));
    const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
    const chipFace = document.querySelector("#symptom-now-heading")?.parentElement?.querySelector("button span");
    return {
      header: r(q("header")),
      banner: r(byText("Welcome back")?.closest("div")),
      strip: r(byText("60 days")?.closest("button") || byText("60 days")),
      dayNav: r(q('[aria-label="Previous day"]')),
      feelHeading: r(q("#symptom-now-heading")),
      chips: r(q("#symptom-now-heading")?.nextElementSibling),
      empty: r(byText("Nothing logged yet today")?.closest("div")?.parentElement),
      capture: r(q("#capture-input")?.closest("form") || q("#capture-input")),
      tabbar: r(q("nav")),
      chipFace: chipFace ? [cs(chipFace, "height"), cs(chipFace, "borderColor"), cs(chipFace, "backgroundColor"), cs(chipFace, "fontSize")] : null,
      bannerBg: cs(byText("Welcome back")?.closest("div"), "backgroundColor"),
      body: cs(document.body, "backgroundColor"),
      viewportH: innerHeight,
    };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
