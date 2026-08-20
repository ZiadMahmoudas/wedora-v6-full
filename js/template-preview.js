import { fallbackTemplates } from "./data.js";
import { loadTemplates } from "./supabase.js";
import { getLang } from "./i18n.js";

const slug=new URLSearchParams(location.search).get("t")||"classic-ivory";
let item=fallbackTemplates.find(x=>x.slug===slug)||fallbackTemplates[0];

function render(){
 const lang=getLang(), mount=document.querySelector("#previewMount");
 document.querySelector("#previewTemplateName").textContent=lang==="ar"?item.name_ar:item.name_en;
 document.querySelector("#useTemplate").href=`builder.html?t=${encodeURIComponent(item.slug)}`;
 mount.innerHTML=`
   <article class="preview-invite" style="--invite-bg:${item.background||"#f3eadc"};--invite-fg:#3d2924">
    <section class="preview-cover" style="background-image:url('${item.preview_image_url||`assets/templates/${item.slug}.jpg`}')">
      <div><small>${lang==="ar"?"احتفالنا":"OUR CELEBRATION"}</small><h2>${lang==="ar"?"مريم<br>& يوسف":"Mariam<br>& Youssef"}</h2><small>12 · 09 · 2026</small></div>
    </section>
    <section class="preview-section"><small style="color:${item.accent||"#9b6f48"}">COUNTDOWN</small><h3>${lang==="ar"?"باقي على اليوم":"Countdown to the day"}</h3>
      <div class="preview-countdown"><div><b>45</b><span>${lang==="ar"?"يوم":"Days"}</span></div><div><b>08</b><span>${lang==="ar"?"ساعة":"Hours"}</span></div><div><b>22</b><span>${lang==="ar"?"دقيقة":"Min"}</span></div><div><b>10</b><span>${lang==="ar"?"ثانية":"Sec"}</span></div></div>
    </section>
    <section class="preview-section" style="background:rgba(255,255,255,.45)"><h3>${lang==="ar"?"هتشرّفونا؟":"Will you join us?"}</h3><button class="btn btn-primary">${lang==="ar"?"أكيد جايين 🤍":"We’ll be there 🤍"}</button></section>
   </article>`;
}
window.addEventListener("wedora:language",render);
(async()=>{try{const db=await loadTemplates();const found=db?.find(x=>x.slug===slug);if(found)item=found}catch(e){}render()})();
