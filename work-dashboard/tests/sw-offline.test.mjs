import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

// A Service Worker event/cache model. No browser process or real network.
const code = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://workspace.example.test';
const absolute = value => new URL(typeof value === 'string' ? value : value.url, origin).href;
const html = version => `<!doctype html><html><head><meta name="work-dashboard-shell" content="1"><script type="module" src="/assets/app-${version}.js"></script><link rel="stylesheet" href="/assets/app-${version}.css"></head><body><div id="root"></div></body></html>`;
const response = (body, type = 'text/html', status = 200, extra = {}) => {
  const result = new Response(body, {status, headers:{'Content-Type':type}});
  for (const [key,value] of Object.entries(extra)) Object.defineProperty(result,key,{value});
  return result;
};

function harness() {
  const listeners = new Map(), stores = new Map(), routes = new Map(), requests = [];
  let offline = false, writeFailure = null, claimed = 0;
  const caches = {
    keys:async()=>[...stores.keys()],
    delete:async name=>stores.delete(name),
    open:async name=>{
      if(!stores.has(name))stores.set(name,new Map());
      const entries=stores.get(name);
      return {
        put:async(key,value)=>{if(writeFailure?.(absolute(key)))throw new Error('Fixture cache write failed');entries.set(absolute(key),value.clone());},
        match:async key=>entries.get(absolute(key))?.clone(),
        delete:async key=>entries.delete(absolute(key)),
        keys:async()=>[...entries.keys()].map(url=>new Request(url))
      };
    }
  };
  const fetch=async request=>{
    const url=absolute(request);requests.push(url);
    if(offline)throw new TypeError('Fixture network is unavailable');
    const route=routes.get(url);
    if(!route)return response('Fixture route not found','text/plain',404);
    return typeof route==='function'?route():route.clone();
  };
  vm.runInNewContext(code,{
    self:{location:{origin},addEventListener:(type,handler)=>listeners.set(type,handler),clients:{claim:async()=>{claimed+=1;}}},
    caches,fetch,Response,Request,URL,AbortController,TextEncoder,Uint8Array,crypto:webcrypto,setTimeout,clearTimeout,Date,console
  },{filename:'public/sw.js'});
  const install=async()=>{let pending;listeners.get('install')({waitUntil:promise=>{pending=promise;}});return pending;};
  const activate=async()=>{let pending;listeners.get('activate')({waitUntil:promise=>{pending=promise;}});return pending;};
  const request=async(path,options={})=>{
    let result;const waits=[];
    listeners.get('fetch')({request:{url:absolute(path),method:options.method||'GET',mode:options.mode||'navigate'},respondWith:promise=>{result=promise;},waitUntil:promise=>waits.push(promise)});
    if(!result)return undefined;
    const answer=await result;await Promise.all(waits);return answer;
  };
  const setRoute=(path,body,type='text/html',status=200,extra={})=>routes.set(absolute(path),()=>response(body,type,status,extra));
  const version=number=>{
    setRoute('/',html(number));setRoute('/index.html',html(number));
    setRoute(`/assets/app-${number}.js`,`import './lazy-${number}.js'; const lazy = ['assets/chart-${number}.js'];`,'text/javascript');
    setRoute(`/assets/app-${number}.css`,`@font-face{font-family:fixture;src:url('./font-${number}.woff2')} body{color:#123}`,'text/css');
    setRoute(`/assets/lazy-${number}.js`,'export const fixture = true;','application/javascript');
    setRoute(`/assets/chart-${number}.js`,'export const chart = true;','application/javascript');
    setRoute(`/assets/font-${number}.woff2`,'fixture-font','font/woff2');
    setRoute('/manifest.webmanifest','{"name":"Your workspace"}','application/manifest+json');
    setRoute('/icons/icon.svg','<svg></svg>','image/svg+xml');
    for(const name of ['icon-192.png','icon-512.png','icon-maskable-512.png'])setRoute(`/icons/${name}`,'fixture-png','image/png');
  };
  return {install,activate,request,version,setRoute,routes,requests,stores,caches,setOffline:value=>{offline=value;},failWrites:fn=>{writeFailure=fn;},claimed:()=>claimed};
}

async function readyFixture() {const h=harness();h.version(1);await h.install();await h.activate();return h;}

test('installation commits a complete shell and its static/lazy JS, CSS and font dependencies',async()=>{
  const h=await readyFixture();assert.equal(h.claimed(),1);assert.equal(h.stores.size,1);
  const entries=[...h.stores.values()][0];
  for(const path of ['/index.html','/assets/app-1.js','/assets/app-1.css','/assets/lazy-1.js','/assets/chart-1.js','/assets/font-1.woff2','/manifest.webmanifest'])assert.ok(entries.has(absolute(path)),path);
  assert.ok(!h.requests.some(url=>url.includes('/assets/assets/')));
});

test('a previously loaded device reopens the cached shell and every app dependency with no network',async()=>{
  const h=await readyFixture();h.setOffline(true);
  assert.equal(await (await h.request('/')).text(),html(1));
  const before=h.requests.length;
  for(const path of ['/assets/app-1.js','/assets/app-1.css','/assets/lazy-1.js','/assets/font-1.woff2'])assert.equal((await h.request(path,{mode:'cors'})).status,200);
  assert.equal(h.requests.length,before,'cached assets do not require a network request');
});

test('Cloudflare tunnel 5xx responses reuse the last complete shell without caching error HTML',async()=>{
  const h=await readyFixture();
  for(const status of [502,503,504,520,522,530]){
    h.setRoute('/','<html>Cloudflare tunnel is unavailable</html>','text/html',status);
    assert.equal(await (await h.request('/')).text(),html(1));
    assert.equal(h.stores.size,1);
  }
});

test('Access redirects, sign-in HTML and denials remain authentication responses and never replace the shell',async()=>{
  const h=await readyFixture();
  for(const [status,extra] of [[302,{}],[200,{redirected:true,url:'https://team.cloudflareaccess.com/login'}],[403,{}],[200,{}]]){
    h.setRoute('/','<html>Cloudflare Access sign in</html>','text/html',status,extra);
    const result=await h.request('/');assert.equal(result.status,status);assert.match(await result.text(),/Cloudflare Access/);
  }
  h.setOffline(true);assert.equal(await (await h.request('/')).text(),html(1));
});

test('a first installation rejects a 200 login page and leaves no usable cache',async()=>{
  const h=harness();h.version(1);h.setRoute('/index.html','<html>Cloudflare Access sign in</html>');
  await assert.rejects(h.install(),/verified dashboard shell/);assert.equal(h.stores.size,0);
  h.setOffline(true);const result=await h.request('/');assert.equal(result.status,503);assert.match(await result.text(),/no saved dashboard/);
});

test('failed upgrades retain the old complete shell when CSS or a lazy chunk cannot be cached',async()=>{
  for(const broken of ['/assets/app-2.css','/assets/lazy-2.js']){
    const h=await readyFixture();h.version(2);h.setRoute(broken,'<html>Unavailable</html>','text/html',503);
    assert.equal(await (await h.request('/')).text(),html(1));
    assert.equal(h.stores.size,1);h.setOffline(true);
    assert.equal(await (await h.request('/assets/app-1.js',{mode:'cors'})).text(),"import './lazy-1.js'; const lazy = ['assets/chart-1.js'];");
  }
});

test('a successful upgrade publishes new assets together and retains earlier assets for open tabs',async()=>{
  const h=await readyFixture();h.version(2);
  assert.equal(await (await h.request('/')).text(),html(2));assert.equal(h.stores.size,2);
  h.setOffline(true);assert.equal(await (await h.request('/')).text(),html(2));
  assert.equal((await h.request('/assets/app-1.js',{mode:'cors'})).status,200);
  assert.equal((await h.request('/assets/app-2.css',{mode:'cors'})).status,200);
});

test('a cache write failure cannot publish an incomplete upgrade or remove a working shell',async()=>{
  const h=await readyFixture();h.version(2);h.failWrites(url=>url.endsWith('/assets/app-2.css'));
  assert.equal(await (await h.request('/')).text(),html(1));assert.equal(h.stores.size,1);
});

test('an evicted required asset disqualifies that shell so reopening uses an earlier complete version',async()=>{
  const h=await readyFixture();h.version(2);await h.request('/');
  for(const entries of h.stores.values())if(entries.has(absolute('/assets/app-2.js')))entries.delete(absolute('/assets/app-2.js'));
  h.setOffline(true);assert.equal(await (await h.request('/')).text(),html(1));
});

test('HTML masquerading as a JS asset cannot complete an installation',async()=>{
  const h=harness();h.version(1);h.setRoute('/assets/app-1.js','<!doctype html><html>Sign in</html>','application/javascript');
  await assert.rejects(h.install(),/HTML is not an app asset/);assert.equal(h.stores.size,0);
});

test('old unvalidated caches are not trusted and are removed only after a valid installation',async()=>{
  const h=harness();const old=await h.caches.open('work-dashboard-shell-v2');await old.put('/index.html',response('<html>Untrusted old page</html>'));
  h.setOffline(true);assert.equal((await h.request('/')).status,503);assert.ok(h.stores.has('work-dashboard-shell-v2'));
  h.setOffline(false);h.version(1);await h.install();await h.activate();assert.ok(!h.stores.has('work-dashboard-shell-v2'));
});

test('API, source details, Access endpoints, writes, and foreign origins bypass the worker',async()=>{
  const h=await readyFixture();const before=h.requests.length;
  for(const [url,options] of [['/api/state',{}],['/api/sources/private',{}],['/cdn-cgi/access/login',{}],['/cdn-cgi/access/logout',{}],['/',{method:'POST'}],['https://other.example.test/',{}],['/sw.js',{mode:'cors'}]])assert.equal(await h.request(url,options),undefined,url);
  assert.equal(h.requests.length,before);
  for(const entries of h.stores.values())for(const url of entries.keys())assert.ok(!/\/api\/|\/cdn-cgi\//.test(url));
});

test('cached shells retain security policy headers while shells and assets omit authentication headers',async()=>{
  const h=harness();h.version(1);
  const policy="default-src 'self'; object-src 'none'";
  const security={'Content-Security-Policy':policy,'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
  const privateHeaders={'Set-Cookie':'CF_Authorization=PRIVATE_COOKIE','CF-Access-Jwt-Assertion':'PRIVATE_JWT','Authorization':'Bearer PRIVATE_TOKEN'};
  h.routes.set(absolute('/index.html'),()=>new Response(html(1),{headers:{'Content-Type':'text/html',...security,...privateHeaders}}));
  h.routes.set(absolute('/assets/app-1.js'),()=>new Response('export const safe = true;',{headers:{'Content-Type':'text/javascript',...security,...privateHeaders}}));
  await h.install();await h.activate();h.setOffline(true);
  for(const result of [await h.request('/'),await h.request('/assets/app-1.js',{mode:'cors'})]){
    for(const [key,value] of Object.entries(security))assert.equal(result.headers.get(key),value);
    for(const key of Object.keys(privateHeaders))assert.equal(result.headers.get(key),null);
  }
});
