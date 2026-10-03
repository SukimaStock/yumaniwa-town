'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createDOM}=require('./editor-dom.cjs');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const gate=fs.readFileSync(path.join(root,'developer-access.js'),'utf8');
const main=fs.readFileSync(path.join(root,'main.js'),'utf8');
function boot(pathname,search='',source=html) {
    const {document}=createDOM(source);
    const getTriggerFormValues=()=>({id:'new_trigger'});
    const c={document,location:{pathname,search},URLSearchParams,DEV_MODE_ENABLED:true,
        addEventListener(){},getTriggerFormValues,currentScene:'station_plaza',triggers:[]};
    c.window=c;vm.createContext(c);vm.runInContext(gate,c);
    return {c,document,original:getTriggerFormValues};
}
test('initial production HTML has no developer entry even before JavaScript',()=>{
    const {document}=createDOM(html);
    assert.equal(document.getElementById('btn-debug-toggle'),null);
    assert(!/\bid\s*=\s*["']btn-debug-toggle["']/.test(html));
    assert.match(main,/var DEV_MODE_ENABLED = false;/);
    assert(html.indexOf('./developer-access.js?')>html.indexOf('./main.js?'));
});
for(const pathname of ['/yumaniwa-town','/yumaniwa-town/','/','/yumaniwa-town-staging-other/','/nested/yumaniwa-town-staging/']) {
    for(const search of ['','?dev=1','?dev=1&debug=1','?dev=0&dev=1']) {
        test('production entry disabled: '+pathname+search,()=>{
            const {c,document,original}=boot(pathname,search);
            assert.equal(c.DEV_MODE_ENABLED,false);
            assert.equal(document.getElementById('btn-debug-toggle'),null);
            assert.equal(c.getTriggerFormValues,original,'no editor wrapper on production');
            // Exercise the real public toggle entry, whose disabled guard precedes all UI/state access.
            const start=main.indexOf('function toggleDebugMode()');
            const end=main.indexOf('\nfunction setupDeveloperToggleButton()',start);
            vm.runInContext(main.slice(start,end),c);
            assert.doesNotThrow(()=>c.toggleDebugMode());
        });
    }
}
for(const pathname of ['/yumaniwa-town-staging','/yumaniwa-town-staging/','/yumaniwa-town-staging/sub/']) {
    for(const search of ['','?dev=0','?dev=1']) {
        test('staging remains enabled: '+pathname+search,()=>{
            const {c,document}=boot(pathname,search);
            assert.equal(c.DEV_MODE_ENABLED,true);
            const button=document.getElementById('btn-debug-toggle');
            assert(button);assert.equal(button.textContent,'開発');
            assert.equal(c.getTriggerFormValues().id,'station_plaza_trigger_1');
            vm.runInContext(gate,c);
            assert.equal(document.querySelectorAll('#btn-debug-toggle').length,1);
            assert.equal(document.getElementById('btn-debug-toggle'),button);
        });
    }
}
test('existing staging button is preserved',()=>{
    const source=html.replace('<div id="editor-panel"','<button id="btn-debug-toggle" type="button">開発</button><div id="editor-panel"');
    const {document}=boot('/yumaniwa-town-staging/','',source);
    assert.equal(document.querySelectorAll('#btn-debug-toggle').length,1);
});
test('shared close handles missing production entry without reopening development',()=>{
    const {c,document}=boot('/yumaniwa-town/','?dev=1');
    Object.assign(c,{finishPartEditorDrag(){},YUMANIWA_TOWN_INTERACTION:{cancel(){}},
        refreshTownPartDerivedData(){},updatePartEditorSelectionUi(){},updateInteractionHint(){},updateControlVisibility(){}});
    const start=main.indexOf('function closeTownEditor()');
    vm.runInContext(main.slice(start,main.indexOf('\nfunction openTownEditorSession()',start)),c);
    assert.doesNotThrow(()=>c.closeTownEditor());
    assert.equal(c.debugMode,false);assert.equal(c.isEditMode,false);
    assert.equal(document.getElementById('editor-panel').style.display,'none');
});
test('changed script cache revisions match exact source',()=>{
    for(const file of ['main.js','developer-access.js']) {
        const text=fs.readFileSync(path.join(root,file),'utf8');let hash=0x811c9dc5;
        for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),0x01000193)>>>0;
        const revision='auto-'+hash.toString(16).padStart(8,'0');
        assert(html.includes('./'+file+'?rev='+revision),file);
    }
});
