const TTL = 7 * 86400;
const cookieName = '__Host-strava_session';
const json = (value, status=200) => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const cookie = (name,value,age) => `${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x=>x.toString(16).padStart(2,'0')).join('');
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
function cookies(req){ return Object.fromEntries((req.headers.get('Cookie')||'').split(';').map(x=>x.trim().split('='))); }
function redirect(url, values=[]){const h=new Headers({'Location':url,'Cache-Control':'no-store'});for(const v of values)h.append('Set-Cookie',v);return new Response(null,{status:302,headers:h});}
async function token(env,params){
 const r=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:env.STRAVA_CLIENT_ID,client_secret:env.STRAVA_CLIENT_SECRET,...params})});
 const d=await r.json(); if(!r.ok||!d.access_token||!d.refresh_token||!d.expires_at)throw new Error('Strava authorization failed. Please sign in again.');return d;
}
async function access(env,user){
 if(user.expires_at>Math.floor(Date.now()/1000)+60)return user.access_token;
 const d=await token(env,{grant_type:'refresh_token',refresh_token:user.refresh_token});
 await env.DB.prepare('UPDATE users SET access_token=?,refresh_token=?,expires_at=? WHERE id=?').bind(d.access_token,d.refresh_token,d.expires_at,user.id).run();return d.access_token;
}
export function findDuplicates(activities){
 activities.sort((a,b)=>Date.parse(a.start_date)-Date.parse(b.start_date));const groups=[],seen=new Set();
 for(let i=0;i<activities.length;i++){const a=activities[i];if(seen.has(a.id))continue;const group=[a];for(let j=i+1;j<activities.length;j++){const b=activities[j];if(seen.has(b.id))continue;const delta=Date.parse(b.start_date)-Date.parse(a.start_date);if(delta<900000){group.push(b);seen.add(b.id);}else if(delta>900000)break;}if(group.length>1){seen.add(a.id);groups.push({startTime:a.start_date,activities:group,durationDifference:0});}}
 return {scannedCount:activities.length,duplicatesFound:groups.reduce((n,g)=>n+g.activities.length,0),groups};
}
export default {async fetch(req,env){
 const url=new URL(req.url), path=url.pathname, now=Math.floor(Date.now()/1000), c=cookies(req);
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
 try{
 if(['POST','DELETE','PUT','PATCH'].includes(req.method)&&req.headers.get('Origin')!==url.origin)return json({message:'Invalid request origin'},403);
 if(path==='/api/auth/strava/login'&&req.method==='GET'){
 if(!env.STRAVA_CLIENT_ID||!env.STRAVA_CLIENT_SECRET)return json({message:'Strava credentials have not been configured'},503);
 const state=random();const params=new URLSearchParams({client_id:env.STRAVA_CLIENT_ID,redirect_uri:url.origin+'/api/auth/strava/callback',response_type:'code',approval_prompt:'force',scope:'activity:read_all,activity:write',state});
 return redirect('https://www.strava.com/oauth/authorize?'+params,[cookie('__Host-strava_state',state,600)]);
 }
 if(path==='/api/auth/strava/callback'&&req.method==='GET'){
 const clear=cookie('__Host-strava_state','',0);
 if(!c['__Host-strava_state']||url.searchParams.get('state')!==c['__Host-strava_state'])return redirect('/?error=invalid_state',[clear]);
 if(url.searchParams.has('error')||!url.searchParams.get('code'))return redirect('/?error=authorization_denied',[clear]);
 const scopes=(url.searchParams.get('scope')||'').split(',');if(!scopes.includes('activity:read_all')||!scopes.includes('activity:write'))return redirect('/?error=missing_permissions',[clear]);
 const d=await token(env,{grant_type:'authorization_code',code:url.searchParams.get('code')});if(!d.athlete?.id)throw new Error('Missing Strava athlete');
 const a=d.athlete;await env.DB.prepare('INSERT INTO users (strava_id,display_name,access_token,refresh_token,scope,expires_at) VALUES (?,?,?,?,?,?) ON CONFLICT(strava_id) DO UPDATE SET display_name=excluded.display_name,access_token=excluded.access_token,refresh_token=excluded.refresh_token,scope=excluded.scope,expires_at=excluded.expires_at').bind(a.id,`${a.firstname||''} ${a.lastname||''}`.trim(),d.access_token,d.refresh_token,scopes.join(','),d.expires_at).run();
 const u=await env.DB.prepare('SELECT id FROM users WHERE strava_id=?').bind(a.id).first();
 if(c[cookieName])await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(await hash(c[cookieName])).run();
 await env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now).run();const sid=random();await env.DB.prepare('INSERT INTO sessions (id,user_id,expires_at) VALUES (?,?,?)').bind(await hash(sid),u.id,now+TTL).run();
 return redirect('/',[clear,cookie(cookieName,sid,TTL)]);
 }
 const sid=c[cookieName]?await hash(c[cookieName]):null;
 const user=sid?await env.DB.prepare('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.id=? AND s.expires_at>?').bind(sid,now).first():null;
 if(path==='/api/auth/status'&&req.method==='GET')return json(user?{isAuthenticated:true,user:{stravaId:user.strava_id,displayName:user.display_name}}:{isAuthenticated:false});
 if(path==='/api/auth/logout'&&req.method==='POST'){if(sid)await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(sid).run();const r=json({success:true});r.headers.append('Set-Cookie',cookie(cookieName,'',0));return r;}
 if(!user)return json({message:'Not authenticated'},401);
 if(path==='/api/activities/scan'&&req.method==='GET'){
 const before=url.searchParams.has('before')?Math.floor(Date.parse(url.searchParams.get('before'))/1000):now;
 const after=url.searchParams.has('after')?Math.floor(Date.parse(url.searchParams.get('after'))/1000):now-30*86400;
 if(!Number.isFinite(before)||!Number.isFinite(after)||after>=before)return json({message:'Invalid date range'},400);
 const bearer=await access(env,user),all=[];for(let page=1;page<=5;page++){const r=await fetch(`https://www.strava.com/api/v3/athlete/activities?before=${before}&after=${after}&page=${page}&per_page=200`,{headers:{Authorization:`Bearer ${bearer}`}});if(!r.ok)return json({message:r.status===429?'Strava rate limit reached. Try again later.':'Unable to fetch activities from Strava'},r.status===429?429:502);const rows=await r.json();all.push(...rows);if(rows.length<200)break;}return json(findDuplicates(all));
 }
 const match=path.match(/^\/api\/activities\/(\d+)$/);
 if(match&&req.method==='DELETE'){
 const bearer=await access(env,user);const r=await fetch('https://www.strava.com/api/v3/activities/'+match[1],{method:'DELETE',headers:{Authorization:`Bearer ${bearer}`}});
 if(!r.ok)return json({message:'Strava could not delete this activity. Check permissions and try again.'},[401,403,404,429].includes(r.status)?r.status:502);return json({success:true});
 }
 return json({message:'Not found'},404);
 }catch{if(path==='/api/auth/strava/callback')return redirect('/?error=auth_failed',[cookie('__Host-strava_state','',0)]);return json({message:'Request failed. Please try signing in again.'},502);}
}};
