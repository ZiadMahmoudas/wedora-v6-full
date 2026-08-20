import { getSupabase,loadSettings } from "./supabase.js";
import { t } from "./i18n.js";
const form=document.querySelector("#contactForm"),status=document.querySelector("#contactStatus");
(async()=>{
 const s=await loadSettings();
 document.querySelector("#contactWhatsapp").textContent=s.support_whatsapp||"—";
 document.querySelector("#contactEmail").textContent=s.support_email||"—";
 const ig=document.querySelector("#contactInstagram");ig.textContent=s.instagram_url||"—";ig.href=s.instagram_url||"#";
 const ms=document.querySelector("#contactMessenger");ms.textContent=s.messenger_url||"—";ms.href=s.messenger_url||"#";
})();
form.addEventListener("submit",async e=>{
 e.preventDefault();status.textContent="";
 const payload=Object.fromEntries(new FormData(form));
 try{
   const sb=await getSupabase();
   if(!sb){
     const rows=JSON.parse(localStorage.getItem("wedora_demo_contacts")||"[]");rows.unshift({...payload,id:crypto.randomUUID(),created_at:new Date().toISOString()});localStorage.setItem("wedora_demo_contacts",JSON.stringify(rows));
   }else{
     const {error}=await sb.from("contact_messages").insert(payload);if(error)throw error;
   }
   status.className="message success";status.textContent=t("contact_success");form.reset();
 }catch(err){status.className="message error";status.textContent=err.message||"Error";}
});
