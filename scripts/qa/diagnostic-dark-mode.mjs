// Browser simulations, NOT Gmail/Outlook client certification. No network or mail sends.
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const [backend = "../os-diagnostic", output = "/tmp/diagnostic-dark-mode"] = process.argv.slice(2);
const html = readFileSync(resolve(backend, "deploy/recipes/between-gigs/emails/diagnostic.html"), "utf8").replaceAll("{{links.base}}", "https://between-gigs.com");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
const results = [];
try {
  for (const width of [320, 390, 640]) for (const mode of ["light", "dark", "outlook-selector", "css-stripped", "inverted-colors", "images-blocked"]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: mode === "dark" ? "dark" : "light" });
    await page.route("**/*", async route => {
      const url = new URL(route.request().url());
      if (mode !== "images-blocked" && url.hostname === "between-gigs.com" && /^\/email\/[\w.-]+$/.test(url.pathname)) {
        return route.fulfill({ body: readFileSync(resolve("public", `.${url.pathname}`)), contentType: url.pathname.endsWith(".png") ? "image/png" : "image/jpeg" });
      }
      return route.abort();
    });
    await page.setContent(mode === "css-stripped" ? html.replace(/<style>[\s\S]*?<\/style>/, "") : html);
    if (mode === "outlook-selector") await page.evaluate(() => document.documentElement.setAttribute("data-ogsc", ""));
    if (mode === "inverted-colors") await page.evaluate(() => {
      // Stress test only: invert computed HTML foreground/background colors, leave image pixels and gradients alone.
      const snapshots = [...document.querySelectorAll("body,body *")].map(el => ({ el, color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
      const invert = color => color.replace(/rgba?\((\d+), (\d+), (\d+)([^)]*)\)/, (_, r, g, b, rest) => `rgba(${255-r},${255-g},${255-b}${rest || ", 1"})`);
      for (const { el, color, bg } of snapshots) { el.style.setProperty("color", invert(color), "important"); el.style.setProperty("background-color", invert(bg), "important"); }
    });
    const checks = await page.evaluate(() => {
      const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
      const luminance = c => c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((a, x, i) => a + x * [.2126, .7152, .0722][i], 0);
      const text = [...document.querySelectorAll("p,h1,a")].filter(el => el.getBoundingClientRect().height > 0).map(el => {
        let parent = el, background;
        while (parent) { background = rgb(getComputedStyle(parent).backgroundColor); if (background.length === 3 || background[3] > .99) break; parent = parent.parentElement; }
        const fg = luminance(rgb(getComputedStyle(el).color)), bg = luminance(background || [255,255,255]);
        return { text: el.textContent.slice(0, 45), contrast: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
      });
      return { overflow: document.body.scrollWidth > innerWidth + 1, text, images: [...document.images].map(img => ({ loaded: img.complete && img.naturalWidth > 0, alt: img.alt })) };
    });
    if (checks.overflow || checks.text.some(item => item.contrast < 4.5)) throw new Error(JSON.stringify({ width, mode, checks }));
    if (mode !== "images-blocked" && checks.images.some(img => !img.loaded)) throw new Error(`Broken image ${width}/${mode}`);
    await page.screenshot({ path: resolve(output, `${mode}-${width}.png`), fullPage: true });
    results.push({ width, mode, minimumContrast: Math.min(...checks.text.map(item => item.contrast)), imagesLoaded: checks.images.every(img => img.loaded), overflow: checks.overflow });
    await page.close();
  }
  writeFileSync(resolve(output, "results.json"), JSON.stringify({ simulationOnly: true, results }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
