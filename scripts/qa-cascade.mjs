// Plays a prepared 17-wave cascade on a QA build (NEXT_PUBLIC_QA=1 npm run build, serve out/) and reports frame pacing, DOM growth and heap.
//   node scripts/qa-cascade.mjs <dir with cascade.json> [W] [H] [cpuThrottle]   (BASE=http://localhost:4192/)
import { chromium } from "playwright-core";
import { readdirSync, readFileSync } from "node:fs"; import { homedir } from "node:os"; import { join } from "node:path";
const [S, W, H, CPU] = [process.argv[2], Number(process.argv[3]||393), Number(process.argv[4]||852), Number(process.argv[5]||1)];
const root = join(homedir(), ".cache/ms-playwright"); const dir = readdirSync(root).find(d=>d.startsWith("chromium-"));
const b = await chromium.launch({ executablePath: join(root,dir,"chrome-linux64/chrome"), args:["--use-gl=swiftshader","--ignore-gpu-blocklist","--enable-precise-memory-info","--autoplay-policy=no-user-gesture-required"] });
const ctx = await b.newContext({ viewport:{width:W,height:H}, deviceScaleFactor:W<800?2:1, hasTouch:W<800, isMobile:W<800, recordVideo: process.env.VIDEO?{dir:S+"/video",size:{width:W,height:H}}:undefined });
await ctx.addInitScript(()=>localStorage.setItem("budu:v1", JSON.stringify({v:1,lang:"pt",settings:{music:true,sfx:true,haptics:false,motion:"system"},progress:{unlocked:12,tutorialDone:true,levels:{}}})));
const page = await ctx.newPage(); const errs=[]; page.on("pageerror",e=>errs.push(e.message)); page.on("console",m=>m.type()==="error"&&errs.push(m.text()));
const cdp = await ctx.newCDPSession(page); if (CPU>1) await cdp.send("Emulation.setCPUThrottlingRate",{rate:CPU});
await page.goto((process.env.BASE ?? "http://localhost:4192/")); await page.waitForTimeout(1200);
await page.getByRole("button",{name:/^Jogar$|^Continuar/}).click(); await page.waitForTimeout(1800);
// open level 9 from the map
await page.getByRole("button",{name:/Fase 9/}).first().click().catch(async()=>{ console.log("no map button"); });
await page.waitForTimeout(2500);
const data = JSON.parse(readFileSync(S+"/cascade.json","utf8"));
const res = await page.evaluate(async ({data})=>{
  const {ctrl} = window.__qa; ctrl.qaLoad(data.state);
  await new Promise(r=>setTimeout(r,400));
  const frames=[]; let prev=performance.now(); let run=true; const lt=[];
  new PerformanceObserver(l=>l.getEntries().forEach(e=>lt.push(Math.round(e.duration)))).observe({type:"longtask"});
  (function loop(t){ frames.push(t-prev); prev=t; if(run) requestAnimationFrame(loop); })(prev);
  const nodes0=document.getElementsByTagName("*").length; const heap0=performance.memory?.usedJSHeapSize||0; let maxNodes=nodes0;
  const iv=setInterval(()=>{maxNodes=Math.max(maxNodes,document.getElementsByTagName("*").length)},100);
  const t0=performance.now();
  // the unlock gesture is not needed here: audio stays locked, only the visual/JS cost is measured
  ctrl.play(data.a, data.b);
  await new Promise(r=>setTimeout(r,300));
  while(ctrl.getView().phase==="busy" && performance.now()-t0<60000) await new Promise(r=>setTimeout(r,100));
  const dur=performance.now()-t0; run=false; clearInterval(iv);
  await new Promise(r=>setTimeout(r,600));
  const f=frames.slice(5).sort((a,b)=>a-b); const q=p=>f[Math.floor(f.length*p)];
  return { seconds:+(dur/1000).toFixed(1), frames:f.length, p50:+q(.5).toFixed(1), p95:+q(.95).toFixed(1), p99:+q(.99).toFixed(1), worst:+f[f.length-1].toFixed(1), over33:f.filter(x=>x>33.4).length, over50:f.filter(x=>x>50).length, longtasks:lt, nodes:[nodes0,maxNodes,document.getElementsByTagName("*").length], heapMB:[+(heap0/1e6).toFixed(1), +((performance.memory?.usedJSHeapSize||0)/1e6).toFixed(1)], score: ctrl.getView().score };
},{data});
console.log(`${W}x${H} cpu${CPU}x`, JSON.stringify(res)); console.log("errors:",errs);
if (process.env.SHOT) await page.screenshot({path:S+"/cascade-end.png"});
await ctx.close(); await b.close();
