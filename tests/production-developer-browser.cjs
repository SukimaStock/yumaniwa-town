// Real Chromium checks; local server only, external traffic blocked. No repository writes.
// PLAYWRIGHT_MODULE=/path/to/playwright [STAGING_ROOT=/path/to/staging] node tests/production-developer-browser.cjs
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const viewport=process.env.WIDE_VIEWPORT ? {width:1100,height:850} : {width:390,height:844};
const stagingRoot=process.env.STAGING_ROOT&&path.resolve(process.env.STAGING_ROOT);
const prefix='/yumaniwa-town/',stagePrefix='/yumaniwa-town-staging/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://localhost');
    const stage=url.pathname.startsWith(stagePrefix);
    const base=stage&&stagingRoot?stagingRoot:root;
    const relative=decodeURIComponent(url.pathname.slice((stage?stagePrefix:prefix).length))||'index.html';
    const file=path.resolve(base,relative);
    if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
    let data=fs.readFileSync(file);
    // Hold an ordinary load-blocking image to observe the parsed page before window.onload.
    if(relative==='index.html'&&url.searchParams.has('slowLoad'))data=Buffer.from(data.toString().replace('</body>','<img alt="" src="./__slow_image.png"></body>'));
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const origin='http://127.0.0.1:'+server.address().port;
    const browser=await chromium.launch({headless:true});const results=[];
    const errors=[];
    async function page(options={}){
        const p=await browser.newPage({viewport,...options});
        p.on('pageerror',e=>errors.push(e.message));
        await p.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
        return p;
    }
    async function off(p){
        assert.equal(await p.locator('#btn-debug-toggle').count(),0);
        assert.deepEqual(await p.evaluate(()=>({enabled:DEV_MODE_ENABLED,debug:debugMode,edit:isEditMode})),{enabled:false,debug:false,edit:false});
        assert.equal(await p.locator('#editor-panel').isVisible(),false);
    }
    try {
        const nojs=await page({javaScriptEnabled:false});await nojs.goto(origin+prefix);
        assert.equal(await nojs.locator('#btn-debug-toggle').count(),0);await nojs.close();results.push('initial HTML / JavaScript disabled: PASS');
        const blocked=await page();let releaseMain,mainRequested;
        const heldMain=new Promise(r=>releaseMain=r),requestedMain=new Promise(r=>mainRequested=r);
        await blocked.route('**/main.js?*',async route=>{mainRequested();await heldMain;await route.continue();});
        const navigation=blocked.goto(origin+prefix+'?dev=1');await requestedMain;
        assert.equal(await blocked.locator('#btn-debug-toggle').count(),0);
        releaseMain();await navigation;await off(blocked);await blocked.close();results.push('main.js delayed: no initial entry / no query entry: PASS');
        for(const query of ['', '?dev=1']) {
            const p=await page();await p.goto(origin+prefix+query);await off(p);
            await p.waitForFunction(()=>window.YUMANIWA_ARRIVAL_READY);
            if(await p.evaluate(()=>isMessageOpen))await p.locator('#message-window').click();
            await p.keyboard.press('g');await p.keyboard.press('G');await p.keyboard.press('d');await p.keyboard.press('D');
            await p.evaluate(()=>toggleDebugMode());await off(p);
            const before=await p.evaluate(()=>player.x);await p.keyboard.down('ArrowRight');await p.waitForTimeout(200);await p.keyboard.up('ArrowRight');
            assert.notEqual(await p.evaluate(()=>player.x),before,'normal movement works');
            await p.close();results.push('production '+(query||'normal')+' / keyboard and toggle disabled / movement: PASS');
        }
        const slow=await page();let releaseImage,requestedImage;
        const heldImage=new Promise(r=>releaseImage=r),requested=new Promise(r=>requestedImage=r);
        await slow.route('**/__slow_image.png',async route=>{requestedImage();await heldImage;await route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});});
        await slow.goto(origin+prefix+'?dev=1&slowLoad=1',{waitUntil:'domcontentloaded'});await requested;
        assert.notEqual(await slow.evaluate(()=>document.readyState),'complete');await off(slow);
        releaseImage();await slow.waitForLoadState('load');await off(slow);await slow.close();results.push('window.onload delayed by image: no entry before/after load: PASS');
        const stage=await page();stage.on('dialog',d=>d.accept());await stage.goto(origin+stagePrefix);
        await stage.waitForFunction(()=>window.YUMANIWA_ARRIVAL_READY);
        if(await stage.evaluate(()=>isMessageOpen))await stage.locator('#message-window').click();
        assert.equal(await stage.evaluate(()=>DEV_MODE_ENABLED),true);
        assert.equal(await stage.locator('#btn-debug-toggle').count(),1);
        await stage.locator('#btn-debug-toggle').click();assert.equal(await stage.locator('#editor-panel').isVisible(),true);
        assert.equal(await stage.evaluate(()=>isEditMode),true);
        await stage.locator('#btn-close-editor').click();await stage.keyboard.press('g');
        assert.equal(await stage.locator('#editor-panel').isVisible(),true);
        await stage.locator('#edit-target').selectOption('props');
        assert((await stage.locator('#part-asset-select option').count())>0);
        await stage.close();results.push('staging '+(stagingRoot?'unchanged source':'candidate gate')+' / button, keyboard, Editor candidates: PASS');
        assert.deepEqual(errors,[]);
        console.log(JSON.stringify({browser:await browser.version(),viewport,results,pageErrors:errors},null,2));
    } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
