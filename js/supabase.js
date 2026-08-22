import { CONFIG } from "./config.js";
import { randomId,readJson,writeJson } from "./utils.js";

let client = null;

export async function getSupabase(){
  if (CONFIG.DEMO_MODE) return null;
  if (client) return client;
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  client = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return client;
}

export async function getUser(){
  const sb = await getSupabase();
  if (!sb) {
    return localStorage.getItem("wedora_demo_auth")
      ? {id:"demo-user",email:"demo@wedora.local"}
      : null;
  }
  const {data,error}=await sb.auth.getUser();
  if (error && error.message !== "Auth session missing!") console.warn(error);
  return data?.user || null;
}

export async function getProfile(user=null){
  user = user || await getUser();
  if (!user) return null;
  const sb=await getSupabase();
  if (!sb) {
    return {
      id:user.id,email:user.email,
      full_name:localStorage.getItem("wedora_demo_name")||"Demo User",
      phone:"",role:localStorage.getItem("wedora_demo_role")||"user"
    };
  }

  // Preferred path: SECURITY DEFINER RPC returns only auth.uid() profile.
  // This avoids direct-table privilege mistakes while RLS still protects
  // all admin/customer list queries elsewhere in the app.
  const rpc = await sb.rpc("get_my_profile");
  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    if (row) return row;
  }

  // Compatibility fallback for databases that have not run the current migration yet.
  const {data:profileRows,error}=await sb.from("profiles").select("*").eq("id",user.id).limit(1);
  const data=Array.isArray(profileRows)?profileRows[0]||null:profileRows||null;
  if (error) {
    if (String(error.message||"").toLowerCase().includes("permission denied")) {
      throw new Error("Profile access is not configured. Run sql/MIGRATE-EXISTING.sql in Supabase SQL Editor.");
    }
    throw error;
  }
  return data;
}

export async function requireCustomer(){
  const user=await getUser();
  if (!user){
    const next=location.pathname.split("/").pop()+location.search;
    location.href="auth.html?next="+encodeURIComponent(next||"dashboard.html");
    throw new Error("customer auth required");
  }
  const profile=await getProfile(user);
  if (profile?.role==="admin"){
    location.href="admin.html";
    throw new Error("admin account");
  }
  return {user,profile};
}

export async function requireAdmin(){
  const user=await getUser();
  if (!user){
    location.href="admin-login.html";
    throw new Error("admin auth required");
  }
  const profile=await getProfile(user);
  if (profile?.role!=="admin"){
    await signOut("admin-login.html?error=not-admin");
    throw new Error("admin only");
  }
  return {user,profile};
}

export async function signOut(destination="index.html"){
  const sb=await getSupabase();
  if (!sb){
    localStorage.removeItem("wedora_demo_auth");
    localStorage.removeItem("wedora_demo_role");
    location.href=destination;
    return;
  }
  await sb.auth.signOut();
  location.href=destination;
}

export async function uploadFile(bucket,file,pathPrefix,{publicFile=true}={}){
  const sb=await getSupabase();
  if (!sb) return URL.createObjectURL(file);
  const ext=(file.name.split(".").pop()||"bin").toLowerCase();
  const path=`${pathPrefix}/${randomId("file")}.${ext}`;
  const {error}=await sb.storage.from(bucket).upload(path,file,{
    cacheControl:"3600",upsert:false,contentType:file.type||undefined
  });
  if (error) throw error;
  if (!publicFile) return path;
  const {data}=sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function signedUrl(bucket,path,seconds=300){
  if (!path) return "#";
  if (/^https?:\/\//i.test(path)) return path;
  const sb=await getSupabase();
  if (!sb) return path;
  const {data,error}=await sb.storage.from(bucket).createSignedUrl(path,seconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function loadSettings(){
  const sb=await getSupabase();
  const fallback={
    brand_name:CONFIG.BRAND,
    currency:CONFIG.CURRENCY,
    undercut_amount:CONFIG.UNDERCUT_AMOUNT,
    vodafone_cash_number:CONFIG.VODAFONE_CASH_NUMBER,
    instapay_handle:CONFIG.INSTAPAY_HANDLE,
    support_whatsapp:CONFIG.SUPPORT_WHATSAPP,
    support_email:CONFIG.SUPPORT_EMAIL,
    instagram_url:"",
    messenger_url:"",
    hero_video_url:"assets/wedding.mp4",
    tutorial_video_url:"assets/wedding-scroll.mp4",
    trial_hours:24
  };
  if (!sb) return fallback;
  const {data:rows,error}=await sb.from("site_settings").select("*").eq("id",1).limit(1);
  if (error){console.warn(error);return fallback;}
  const data=Array.isArray(rows)?rows[0]||null:rows||null;
  return {...fallback,...(data||{})};
}

export async function loadPlans({all=false}={}){
  const sb=await getSupabase();
  if (!sb) return null;
  let q=sb.from("plans").select("*").order("sort_order");
  if (!all) q=q.eq("is_active",true);
  const {data,error}=await q;
  if (error) throw error;
  return data||[];
}

export async function loadTemplates({all=false}={}){
  const sb=await getSupabase();
  if (!sb) return null;
  let q=sb.from("templates").select("*").order("sort_order");
  if (!all) q=q.eq("is_active",true);
  const {data,error}=await q;
  if (error) throw error;
  return data||[];
}



const DEMO_INVITATIONS_KEY="wedora_demo_invitations";

export function listDemoInvitations(){
  const rows=readJson(DEMO_INVITATIONS_KEY,[]);
  return Array.isArray(rows)?rows:[];
}

export function getDemoInvitationById(id){
  return listDemoInvitations().find(row=>String(row.id)===String(id))||null;
}

export function getDemoInvitationBySlug(slug,{activeOnly=false}={}){
  const row=listDemoInvitations().find(item=>item.slug===slug)||null;
  if(!row)return null;
  return activeOnly&&row.status!=="active"?null:row;
}

function compactDemoInvitation(row={}){
  const next={...row};
  if(/^(blob:|data:)/i.test(String(next.hero_image_url||'')))next.hero_image_url='';
  if(/^(blob:|data:)/i.test(String(next.song_url||'')))next.song_url='';
  next.gallery_urls=(Array.isArray(next.gallery_urls)?next.gallery_urls:[]).filter(x=>!(/^(blob:|data:)/i.test(String(x)))).slice(0,8);
  return next;
}

export function upsertDemoInvitation(invitation){
  let rows=listDemoInvitations().map(compactDemoInvitation);
  const now=new Date().toISOString();
  const next=compactDemoInvitation({...invitation,id:invitation.id||randomId("invite"),updated_at:now,created_at:invitation.created_at||now});
  const index=rows.findIndex(row=>row.id===next.id);
  if(index>=0)rows[index]=next;else rows.unshift(next);
  try{writeJson(DEMO_INVITATIONS_KEY,rows)}catch(err){
    // Keep recent demo invitations if an old local test filled the browser quota.
    rows=rows.slice(0,20);
    try{localStorage.removeItem(DEMO_INVITATIONS_KEY);writeJson(DEMO_INVITATIONS_KEY,rows)}catch(e){console.warn('WEDORA demo storage is full',e)}
  }
  return next;
}

export function updateDemoInvitation(id,patch={}){
  const current=getDemoInvitationById(id);
  if(!current)return null;
  return upsertDemoInvitation({...current,...patch,id:current.id});
}

export async function getActiveSubscription(user=null){
  user=user||await getUser();
  if(!user)return null;
  const sb=await getSupabase();
  if(!sb){
    const demo=readJson("wedora_demo_subscription",null);
    if(!demo)return null;
    const active=demo.is_lifetime||(demo.current_period_end&&new Date(demo.current_period_end)>new Date());
    return active?demo:null;
  }

  // Current entitlement endpoint. V10 deliberately avoids the old repair path
  // so an already-active account can publish even when a legacy subscriptions
  // table was created without the newer UNIQUE(user_id) constraint.
  for(const rpcName of ["get_my_entitlement_v11","get_my_entitlement_v10","get_my_entitlement_v9"]){
    try{
      const rpc=await sb.rpc(rpcName);
      if(!rpc.error){
        const row=Array.isArray(rpc.data)?rpc.data[0]:rpc.data;
        if(row){
          return {
            id:row.subscription_id,
            user_id:row.user_id,
            plan_id:row.plan_id,
            status:row.subscription_status||"active",
            started_at:row.started_at,
            current_period_end:row.current_period_end,
            is_lifetime:!!row.is_lifetime,
            plan_slug:row.plan_slug,
            plan_name_ar:row.plan_name_ar,
            plan_name_en:row.plan_name_en,
            plan_features:row.plan_features||[],
            plan:{
              id:row.plan_id,
              slug:row.plan_slug,
              name_ar:row.plan_name_ar,
              name_en:row.plan_name_en,
              features:row.plan_features||[],
              is_lifetime:!!row.is_lifetime
            }
          };
        }
      }
    }catch{}
  }

  // Legacy endpoint fallback for older databases.
  try{
    const rpc=await sb.rpc("get_active_subscription");
    if(!rpc.error){
      const row=Array.isArray(rpc.data)?rpc.data[0]:rpc.data;
      if(row)return row;
    }
  }catch{}

  try{
    const {data:rows,error}=await sb.from("subscriptions")
      .select("*,plan:plans(id,slug,name_ar,name_en,duration_months,is_lifetime,features)")
      .eq("user_id",user.id).eq("status","active")
      .order("is_lifetime",{ascending:false}).order("updated_at",{ascending:false}).limit(5);
    if(!error){
      const data=(Array.isArray(rows)?rows:rows?[rows]:[]).find(row=>row?.is_lifetime||(row?.current_period_end&&new Date(row.current_period_end)>new Date()));
      if(data)return data;
    }
  }catch{}

  return null;
}

export function getPublicInvitationUrl(slug){
  const safe=encodeURIComponent(String(slug||'').trim());
  const host=location.hostname;
  const local=location.protocol==='file:'||host==='localhost'||host==='127.0.0.1';
  if(!local)return `${location.origin}/w/${safe}`;
  const folder=location.pathname.replace(/[^/]*$/,'');
  return `${location.origin}${folder}invitation.html?slug=${safe}`;
}

export async function copyText(text){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true;}
  const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
  const ok=document.execCommand('copy');ta.remove();return ok;
}

export async function nativeShare({title='WEDORA',text='',url}={}){
  if(navigator.share){await navigator.share({title,text,url});return true;}
  await copyText(url||text);return false;
}

export async function getInvitationBySlug(slug,{allowOwner=false}={}){
  const sb=await getSupabase();
  if(!sb)return getDemoInvitationBySlug(slug,{activeOnly:!allowOwner});
  let q=sb.from("invitations").select("*").eq("slug",slug);
  if(!allowOwner)q=q.eq("status","active");
  const {data:rows,error}=await q.order("updated_at",{ascending:false}).limit(1);
  if(error)throw error;
  return Array.isArray(rows)?rows[0]||null:rows||null;
}

export async function currentDraft(){
  return readJson("wedora_draft",null);
}

export function saveLocalDraft(draft){
  try{return writeJson("wedora_draft",draft)}catch(err){
    // Old builder versions could leave very large data/blob URLs in localStorage.
    // Keep the editable text/config instead of letting one quota error kill all buttons.
    const compact={...draft};
    if(String(compact.hero_image_url||'').startsWith('data:'))compact.hero_image_url='';
    if(String(compact.song_url||'').startsWith('data:'))compact.song_url='';
    compact.gallery_urls=(Array.isArray(compact.gallery_urls)?compact.gallery_urls:[]).filter(x=>!String(x).startsWith('data:')).slice(0,8);
    try{localStorage.removeItem("wedora_draft");return writeJson("wedora_draft",compact)}catch(e){console.warn('WEDORA local draft storage is full',e);return false}
  }
}

export function clearLocalDraft(){
  localStorage.removeItem("wedora_draft");
}
