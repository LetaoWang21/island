const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('offline HTML includes valid application and no remote asset references',()=>{const html=fs.readFileSync(__dirname+'/../dist/index.html','utf8');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);assert.equal(scripts.length,2);for(const s of scripts)assert.doesNotThrow(()=>new vm.Script(s));assert.ok(!/<script[^>]+src=|<link[^>]+href=|@import\s/.test(html));});

test('one-click original view retains the saved application and links back to refinement',()=>{
 const original=fs.readFileSync(__dirname+'/../snapshots/before-art.html','utf8');
 const baseline=fs.readFileSync(__dirname+'/../dist/baseline.html','utf8');
 const refined=fs.readFileSync(__dirname+'/../dist/index.html','utf8');
 const scripts=s=>[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
 assert.deepEqual(scripts(baseline),scripts(original));
 assert.ok(refined.includes('href="baseline.html"'));
 assert.ok(baseline.includes('href="index.html"'));
});
