import { CONFIG } from './config.js';
import { getSupabase,getProfile,signOut } from './supabase.js';
import { initI18n,getLang } from './i18n.js';initI18n();
const form=document.querySelector('#adminForm'),msg=document.querySelector('#adminMsg'),btn=document.querySelector('#adminSubmit');
const err=new URLSearchParams(location.search).get('error');if(err)msg.textContent=getLang()==='ar'?'الحساب ده مش حساب إدارة.':'This account is not an admin account.';
form.addEventListener('submit',async e=>{e.preventDefault();msg.textContent='';btn.disabled=true;try{
 if(CONFIG.DEMO_MODE){localStorage.setItem('wedora_demo_auth','1');localStorage.setItem('wedora_demo_role','admin');localStorage.setItem('wedora_demo_name','Demo Admin');location.href='admin.html';return}
 const sb=await getSupabase();const {data,error}=await sb.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});if(error)throw error;const p=await getProfile(data.user);if(p?.role!=='admin'){await signOut('admin-login.html?error=not-admin');return}location.href='admin.html';
}catch(e){msg.className='error';msg.textContent=e.message||String(e)}finally{btn.disabled=false}});
