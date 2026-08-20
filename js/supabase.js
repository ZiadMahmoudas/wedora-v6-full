import { CONFIG } from "./config.js";

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

  // Backward-compatible fallback for projects that have not run V6.1 yet.
  const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if (error) {
    if (String(error.message||"").toLowerCase().includes("permission denied")) {
      throw new Error("Profile access is not configured. Run sql/FIX-PROFILES-PERMISSION-NOW.sql in Supabase SQL Editor.");
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
  const path=`${pathPrefix}/${crypto.randomUUID()}.${ext}`;
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
  const {data,error}=await sb.from("site_settings").select("*").eq("id",1).maybeSingle();
  if (error){console.warn(error);return fallback;}
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

export async function getInvitationBySlug(slug,{allowOwner=false}={}){
  const sb=await getSupabase();
  if (!sb) return null;
  let q=sb.from("invitations").select("*").eq("slug",slug);
  if (!allowOwner) q=q.eq("status","active");
  const {data,error}=await q.maybeSingle();
  if (error) throw error;
  return data;
}

export async function currentDraft(){
  try{
    return JSON.parse(localStorage.getItem("wedora_draft")||"null");
  }catch{return null}
}

export function saveLocalDraft(draft){
  localStorage.setItem("wedora_draft",JSON.stringify(draft));
}

export function clearLocalDraft(){
  localStorage.removeItem("wedora_draft");
}
