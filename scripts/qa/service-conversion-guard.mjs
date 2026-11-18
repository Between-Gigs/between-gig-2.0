// Isolated component fixture: actual CanvasHelp, live-edit warning and pure draft reducer; no live accounts/API.
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import tailwind from "@tailwindcss/postcss";
import { chromium } from "playwright-core";
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const esbuildDir = fs.readdirSync("node_modules/.pnpm").find(name => name.startsWith("esbuild@"));
const { build } = await import(pathToFileURL(path.resolve(`node_modules/.pnpm/${esbuildDir}/node_modules/esbuild/lib/main.js`)));
const entry = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {CanvasHelp} from './components/gigster/editor/canvas';
import {useLiveEditWarning} from './components/profile/LiveEditWarning';
import {serviceDraftReducer} from './lib/profile/service-choice';
const services=['Interior Styling','Event Styling','Hair Styling','Makeup Services','Photography & Portraits'];
const initial=()=>({services:[...services],serviceLines:Object.fromEntries(services.map(value=>[value,'Exact personal wording.'])),other:''});
function Fixture(){
 const [state,dispatch]=React.useReducer(serviceDraftReducer,{fields:initial(),conversion:null});
 const [message,setMessage]=React.useState('');
 const live=useLiveEditWarning('published',true),callbacks=React.useRef(new Map()),id=React.useRef(0);
 const d=state.fields;
 React.useEffect(()=>{const result=state.conversion,callback=result&&callbacks.current.get(result.id);if(!callback)return;callbacks.current.delete(result.id);if(result.succeeded){setMessage('Conversion applied');callback();}else setMessage('Your services changed. Choose Other again.');},[state.conversion]);
 const set=key=>value=>live.guard(key,()=>dispatch({type:'set',value:current=>({...current,[key]:value})}));
 const convert=(expected,index,applied)=>live.guard('services',()=>{if(callbacks.current.size)return;const next=++id.current;callbacks.current.set(next,applied);dispatch({type:'convert',id:next,expected,index});});
 React.useEffect(()=>{window.fixtureFields=d;window.fixtureQueueTwoConversions=()=>{convert(d,0,()=>{});convert(d,0,()=>{});};window.fixtureQueueNewer=()=>dispatch({type:'set',value:current=>({...current,serviceLines:{...current.serviceLines,'Interior Styling':'Newer concurrent answer.'}})});},[d]);
 return <><CanvasHelp d={d} set={set} errors={{}} onConvertToCustom={convert}/><p role='status'>{message}</p>{live.dialog}</>;
}
let generation=0;const root=createRoot(document.getElementById('root'));
window.fixtureReset=()=>root.render(<Fixture key={++generation}/>);window.fixtureReset();
`;
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "sample-data-only", setup(builder) {
  builder.onResolve({ filter: /^@\/lib\/data$/ }, args => ({ path: args.path, namespace: "fixture" }));
  builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const data={kind:"sample"};', resolveDir: process.cwd() }));
} }] });
const css = (await postcss([tailwind()]).process(fs.readFileSync("app/globals.css", "utf8"), { from: path.resolve("app/globals.css") })).css;
const doc = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Fictional service confirmation fixture</title><link rel="stylesheet" href="/fixture.css"><main class="mx-auto max-w-3xl p-4" id="root"></main><script src="/fixture.js"></script></html>';
const assets = new Map([["/", ["text/html", doc]], ["/fixture.js", ["text/javascript", bundle.outputFiles[0].text]], ["/fixture.css", ["text/css", css]]]);
const server = http.createServer((req, res) => {
  const file = req.url.match(/^\/(?:[\w-]+\/)*([\w-]+\.woff2)$/)?.[1], font = file && path.join("packages/design-system/fonts", file);
  if (font && fs.existsSync(font)) { res.writeHead(200, { "content-type": "font/woff2" }); return res.end(fs.readFileSync(font)); }
  const asset = assets.get(req.url); if (!asset) { res.writeHead(404); return res.end(); } res.writeHead(200, { "content-type": asset[0] }); res.end(asset[1]);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium" });
fs.mkdirSync("deliverables/service-conversion-guard", { recursive: true });
try { for (const width of [320, 1440]) for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme, reducedMotion: "reduce" }), external = [], errors = [];
  await context.route("**/*", route => new URL(route.request().url()).origin === url ? route.continue() : (external.push(route.request().url()), route.abort()));
  const page = await context.newPage(); page.setDefaultTimeout(10000); page.on("pageerror", error => errors.push(error.message));
  await page.goto(url); await page.waitForFunction(() => !!window.fixtureFields).catch(error => { console.error(JSON.stringify(errors)); throw error; }); await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
  const before = await page.evaluate(() => structuredClone(window.fixtureFields));
  const pick = async () => { await page.locator("#f-service-0").click(); await page.getByRole("option", { name: "Other — name your service", exact: true }).click(); await page.getByRole("heading", { name: "Edit your live profile?" }).waitFor(); };
  await pick(); await page.getByRole("button", { name: "Keep it live", exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.fixtureFields), before); assert.equal(await page.locator("#f-other").count(), 0); assert.equal(await page.locator("#sec-help > ol > li").count(), 5);
  await pick(); await page.getByRole("button", { name: "Edit my profile", exact: true }).click();
  await page.locator("#f-other").waitFor(); await page.waitForFunction(() => document.activeElement?.id === "f-other");
  const expectedLines = { ...before.serviceLines }; delete expectedLines["Interior Styling"];
  assert.deepEqual(await page.evaluate(() => window.fixtureFields), { ...before, services: before.services.slice(1), serviceLines: expectedLines, other: "Interior Styling\nExact personal wording." });
  assert.equal(await page.locator("#sec-help > ol > li").count(), 5);
  // A queued state update immediately before confirm must win over the earlier conversion snapshot.
  await page.evaluate(() => window.fixtureReset()); await page.waitForFunction(() => window.fixtureFields.services.length === 5 && !window.fixtureFields.other);
  await pick(); await page.evaluate(() => { window.fixtureQueueNewer(); document.querySelectorAll('dialog button').forEach(button => { if (button.textContent.trim() === 'Edit my profile') button.click(); }); });
  await page.getByText("Your services changed. Choose Other again.", { exact: true }).waitFor();
  assert.equal(await page.locator("#f-other").count(), 0); assert.equal(await page.locator("#sec-help > ol > li").count(), 5);
  assert.equal((await page.evaluate(() => window.fixtureFields)).serviceLines["Interior Styling"], "Newer concurrent answer.");
  await page.evaluate(() => window.fixtureReset()); await page.waitForFunction(() => window.fixtureFields.services.length === 5 && !window.fixtureFields.other);
  await page.evaluate(() => window.fixtureQueueTwoConversions()); await page.getByRole("button", { name: "Edit my profile", exact: true }).click();
  await page.getByText("Conversion applied", { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.fixtureFields), { ...before, services: before.services.slice(1), serviceLines: expectedLines, other: "Interior Styling\nExact personal wording." });
  await page.screenshot({ path: `deliverables/service-conversion-guard/LOCAL-FIXTURE-${width}-${theme}.png` });
  assert.deepEqual(errors, []); assert.deepEqual(external, []); await context.close(); console.log(`PASS ${width}/${theme}: real live-warning cancel/confirm/focus, exact atomic conversion, queued newer answer refusal, one-in-flight double request`);
}} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
