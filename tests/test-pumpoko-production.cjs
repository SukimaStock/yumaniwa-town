'use strict';
// Read-only production candidate gate; never writes or promotes by itself.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {buildPage,buildSitemap}=require('../tools/generate-work-search-pages.cjs');
const {readStandalonePages}=require('../tools/standalone-pages.cjs');
const {validate}=require('../tools/release-validator.cjs');
const {readRegistry,assertPublication,assertProductionSnapshot}=require('../tools/work-lifecycle.cjs');
const root=path.resolve(__dirname,'..');
const productionBaseline='ebd32c56b3c486545cec4531dd84f26ca425a1aa';
const originalStaging='70d2d0d27ead868f6ab623cb7d0e2eaf526e1588';
const published=["orbit","diorama-calendar","rojiura-masala","steamclock","dotweather","junkissa-dive","midnight-cola","yakitori-wars","rainy-window","pumpoko","coffee-factory"];
const articles=["31beb527cad14b72a2afdc57f4b986b4", "3fbab1d8a9b14123bfdb1461a94e8098", "5b5f9715572b4d8a894c06b220c9139c", "95d48e6613ce4037907364809ee3359f", "ea784083edc146d298ba5b7c33a1b7f1", "fac8492827054dd8a3922c8b8396198a", "note-20260717-153a44e0", "note-20260731-n6565e030d711", "note-20260807-n845da26b1b0b", "note-20260917-c12ade65", "note-20261009-n308001a6a00a", "note-n21f2389ac91d"];
const articleCatalog=require('../tools/shinpo-migrate.cjs').articleCatalog({env:'production',publishedArticles:articles,root});
const canonical={
  "works/pumpoko/index.html": "e03caabef14f374d0105f8c4997c8e1b19ff2ca7",
  "works/pumpoko/style.css": "b42d76baefa4f3b19d3efc79dd65db9cfe25c88b",
  "works/pumpoko/app.js": "eb1e021f792ff35339220ad1988c60f888a57107",
  "works/pumpoko/physics.js": "802a02b8312fadb04095055a02b7daa1f0b4fdd8",
  "works/pumpoko/world.js": "be733cc250b02d4b9d5d267ad9b2aee4fdb73900",
  "works/pumpoko/courses.js": "da2f86974fdeef38e55ecf507e1bd0ecf841e141",
  "works/pumpoko/material.js": "5c117fce0683f3c7848822eb84b97ae73c5b16fd",
  "works/pumpoko/draw.js": "70e21f98defd9101bafa57c38ce184f38648654e",
  "works/pumpoko/world-draw.js": "52e3d0e662e97fd98dfae6a36630a15b5bed5622",
  "works/pumpoko/prologue.js": "84dc92be6a2887672b79226f2f31856131e6450e",
  "works/pumpoko/title-draw.js": "c95631068b71ede91ce4e6d5fed73269f424bdd2",
  "works/pumpoko/opening.js": "55f1234d8797508fb0eb26b8f3d851d50d157fcb",
  "works/pumpoko/opening-draw.js": "97beb84a737c77ae03c16d354bffb7cb8f14b12d",
  "works/pumpoko/story.js": "01af7ddd3cc64778e3d551b6d28996af280b3677",
  "works/pumpoko/assets/pumpoko-logo.svg": "cdb2ad43ee29547a4721e0d50bf5a92820a5e61d",
  "works/pumpoko/audio/drum-don.wav": "ff971fffccb547d64954db94e5937766cfd58bb3",
  "works/pumpoko/audio/fiber.wav": "0556a84f23cdefc6ce64c1a0666c1fee8e0896a6",
  "works/pumpoko/audio/pumpoko-bgm.mp3": "940cb676e3d5a4e3c850668ae847ea379c618829",
  "works/pumpoko/audio/seed.wav": "0239eff9aa8d18512238306c68503fc4c885c083",
  "works/pumpoko/audio/shell.wav": "565ca003c1db1452bb663b138db92accbb96b4c1",
  "assets/works/pumpoko/icon.png": "309dff20bd722bc96d169ad299d8b932e8e2ad77",
  "assets/works/pumpoko/ogp.jpg": "0b634bff11abd2afd0b9a3d9afdc9332b0993c12",
  "engine/codea-lite.v1.0.0.js": "d618a94bc19ab2215f52ab227e6dfeb31b64c714",
  "engine/sukimastock-engine.v0.3.0.js": "4fc03b96205ab2fb6213e95f88a2880e9cd5b235"
};
const approval='Owner instruction 2026-10-11T12:11+02:00: はい、反映お願いします。';
function scriptVar(file,name){
  const context={window:{}};vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return JSON.parse(JSON.stringify(context[name]));
}
function decision(){
  const registry=readRegistry(root),entry=registry.works.find(w=>w.id==='pumpoko');
  assert.ok(entry,'pumpoko lifecycle entry required');
  assert.ok(['candidate','released'].includes(entry.status),'pumpoko must be selected candidate or released');
  const newlyPromoted=entry.status==='candidate';
  const opts={root,env:'production',ids:published,published,articles,promote:['coffee-factory'],productionInstruction:"User 2026-10-18T13:19+02:00: prepare unmerged CoffeeFactory Production PR only. This is candidate generation for review; no merge/deploy approval."};
  if(newlyPromoted)Object.assign(opts,{promote:['pumpoko','coffee-factory']});
  return {registry,entry,opts,newlyPromoted};
}
test('production publication set is exactly ten released works plus CoffeeFactory candidate',()=>{
  const {registry,entry,opts}=decision();
  assert.deepEqual(registry.works.map(w=>w.id).sort(),[...published].sort());
  assert.equal(entry.path,'works/pumpoko');
  const coffee=registry.works.find(w=>w.id==='coffee-factory');
  assert.equal(coffee.status,'candidate');
  assert.match(coffee.candidateDecision,/No merge\/deploy authorization/);
  for(const work of registry.works.filter(w=>w.id!=='pumpoko' && w.id!=='coffee-factory'))assert.equal(work.status,'released',work.id);
  assertPublication(registry,opts.published,opts.promote||[],opts.productionInstruction||'');
  assertProductionSnapshot(root,registry,published);
  const works=scriptVar('data/works.js','WORKS');
  assert.deepEqual(works.filter(w=>w.status==='open').map(w=>w.id).sort(),[...published].sort());
  assert.equal(works.find(w=>w.id==='pumpoko').launch,'embedded');
  assert.equal(works.find(w=>w.id==='pumpoko').venue,'leisure_center');
  assert.equal(works.find(w=>w.id==='pumpoko').entry,'./works/pumpoko/index.html');
});
test('PUMPOKO runtime stays byte-exact; only named SEO head fields may differ',()=>{
  for(const [name,expected] of Object.entries(canonical)){
    const full=path.join(root,name);
    assert.ok(fs.existsSync(full),'missing verified source: '+name);
    if(name==='works/pumpoko/index.html'){
      const baseline=execFileSync('git',['cat-file','blob',expected],{cwd:root,encoding:'utf8'});
      const allowed=baseline.replace('<meta name="robots" content="noindex,nofollow">','<meta name="robots" content="noindex,follow">').replace('<title>PUMPOKO 02</title>','<title>PUMPOKO</title>');
      assert.equal(fs.readFileSync(full,'utf8'),allowed,'only the two specified SEO head fields may change; all runtime markup/scripts must stay exact');
    }else assert.equal(execFileSync('git',['hash-object',full],{cwd:root,encoding:'utf8'}).trim(),expected,'different blob: '+name);
  }
  const actual=fs.readdirSync(path.join(root,'works/pumpoko'),{withFileTypes:true});
  assert.ok(actual.length>0);
  let n=0;function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isDirectory())walk(path.join(dir,entry.name));else if(entry.isFile())n++;else assert.fail('unapproved symlink/special file');}}
  walk(path.join(root,'works/pumpoko'));
  assert.equal(n,20,'work runtime must contain exactly 20 canonical files');
});
test('eleven Search / Share pages and sitemap match production generator',()=>{
  const works=scriptVar('data/works.js','WORKS'),meta=scriptVar('data/work-search-meta.js','WORK_SEARCH_META');
  assert.equal(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),buildSitemap(published,readStandalonePages(root),articleCatalog,'production'));
  for(const id of published)for(const [locale,folder] of [['ja','w'],['en','en/w']]){
    const work=works.find(w=>w.id===id);
    const actual=fs.readFileSync(path.join(root,folder,id,'index.html'),'utf8');
    const expected=buildPage(id,work,meta[id],locale,'production',articleCatalog);
    assert.equal(actual,expected,'non-canonical Search/Share page '+id+' '+locale);
    assert.match(actual,/index,follow,max-image-preview:large/);
  }
  const rootHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
  for(const id of published)assert.ok(rootHtml.includes('./w/'+id+'/'),'root lacks static discovery of '+id);
  for(const id of ['pumpoko-01','pumpoko-02','orbit-02'])assert.ok(!rootHtml.includes('./w/'+id+'/'));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'w/pumpoko/manifest.webmanifest'),'utf8'));
  assert.equal(manifest.icons[0].src,'../../assets/works/pumpoko/icon.png');
});
test('full read-only Release Validator checks the actual eleven-work production snapshot',()=>{
  const {opts}=decision();
  const result=validate(opts);
  const blockers=result.results.filter(x=>x.status==='FAIL'||x.status==='HQ_REQUIRED');
  assert.equal(result.exitCode,0,JSON.stringify(blockers.slice(0,16),null,2));
  assert.equal(result.releaseComplete,false,'external production verifications must remain explicit');
});
