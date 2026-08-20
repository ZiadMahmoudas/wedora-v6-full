import { CONFIG } from "./config.js";
import { getSupabase,getProfile,signOut } from "./supabase.js";
import { initI18n,getLang,t } from "./i18n.js";
initI18n();
const form=document.querySelector('#authForm'), fields=document.querySelector('#signupFields'), title=document.querySelector('#authTitle'), submit=document.querySelector('#authSubmit'), sw=document.querySelector('#authSwitch'), msg=document.querySelector('#authMessage');
let mode='login';
function draw(){const l=getLang(), signup=mode==='signup';fields.hidden=!signup;title.textContent=t(signup?'auth_title_signup':'auth_title_login',l);submit.textContent=t(signup?'auth_signup':'auth_login',l);sw.textContent=t(signup?'auth_switch_login':'auth_switch_signup',l)}
window.addEventListener('wedora:language',draw);sw.onclick=()=>{mode=mode==='login'?'signup':'login';msg.textContent='';draw()};
form.addEventListener('submit',async e=>{e.preventDefault();msg.className='';msg.textContent='';submit.disabled=true;try{
 const email=form.email.value.trim(),password=form.password.value,full_name=form.full_name.value.trim(),phone=form.phone.value.trim();
 if(CONFIG.DEMO_MODE){localStorage.setItem('wedora_demo_auth','1');localStorage.setItem('wedora_demo_role','user');localStorage.setItem('wedora_demo_name',full_name||'Demo Customer');location.href=new URLSearchParams(location.search).get('next')||'dashboard.html';return}
 const sb=await getSupabase();
 if(mode==='signup'){
   const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name,phone}}}); if(error)throw error;
   if(data.session){location.href=new URLSearchParams(location.search).get('next')||'dashboard.html'} else {msg.className='success';msg.textContent=getLang()==='ar'?'الحساب اتعمل. افتح بريدك لتأكيد الإيميل ثم سجل دخول.':'Account created. Confirm your email, then sign in.'}
 }else{
   const {data,error}=await sb.auth.signInWithPassword({email,password}); if(error)throw error;
   const p=await getProfile(data.user); if(p?.role==='admin'){await signOut('admin-login.html?error=use-admin');return}
   location.href=new URLSearchParams(location.search).get('next')||'dashboard.html';
 }
}catch(err){msg.className='error';msg.textContent=err.message||String(err)}finally{submit.disabled=false}});draw();
