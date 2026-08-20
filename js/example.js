import { fallbackExamples,fallbackTemplates } from "./data.js";
import { getLang,setLanguage } from "./i18n.js";
const slug=new URLSearchParams(location.search).get("slug")||fallbackExamples[0].slug;
const ex=fallbackExamples.find(x=>x.slug===slug)||fallbackExamples[0];
const tm=fallbackTemplates.find(x=>x.slug===ex.template_slug)||fallbackTemplates[0];
function render(){
 const lang=getLang(), names=lang==="ar"?`${ex.name1_ar} & ${ex.name2_ar}`:`${ex.name1_en} & ${ex.name2_en}`, venue=lang==="ar"?ex.venue_ar:ex.venue_en;
 document.title=`${names} — WEDORA`;
 const mount=document.querySelector("#exampleMount");
 mount.innerHTML=`
 <button class="inv-music" data-lang-toggle style="inset-inline-end:auto;inset-inline-start:16px">${lang==='ar'?'EN':'ع'}</button><main class="invite-main template-${tm.slug}">
  <section class="invite-hero" style="background-image:url('${tm.preview_image_url}')"><div class="invite-hero-copy"><small>WEDDING INVITATION</small><h1>${names}</h1><small>${new Date(ex.date).toLocaleDateString(lang==="ar"?"ar-EG":"en-GB",{dateStyle:"long"})}</small></div></section>
  <section class="invite-section"><small style="color:var(--accent)">COUNTDOWN TO THE DAY</small><h2>${lang==="ar"?"باقي على اليوم":"Countdown"}</h2><div class="inv-countdown"><div><b>45</b><span>${lang==="ar"?"يوم":"Days"}</span></div><div><b>08</b><span>${lang==="ar"?"ساعة":"Hours"}</span></div><div><b>22</b><span>${lang==="ar"?"دقيقة":"Min"}</span></div><div><b>10</b><span>${lang==="ar"?"ثانية":"Sec"}</span></div></div></section>
  <section class="invite-section alt"><div class="invite-section-inner"><small>💌 RSVP</small><h2>${lang==="ar"?"هتشرّفونا؟":"Will you join us?"}</h2><div class="rsvp-box"><div class="rsvp-options"><button class="rsvp-choice active">${lang==="ar"?"أكيد جايين 🤍":"We’ll be there 🤍"}</button><button class="rsvp-choice">${lang==="ar"?"نعتذر هذه المرة":"Sorry, can’t make it"}</button></div><p>${lang==="ar"?"124 ضيف أكدوا حضورهم":"124 guests have already RSVP’d"}</p></div></div></section>
  <section class="invite-section"><small>🤍</small><h2>${lang==="ar"?"تهاني الضيوف":"Guest wishes"}</h2><div class="wishes-list"><div class="wish-card"><p>${lang==="ar"?"مبروك لأجمل عروسين ❤️":"Congratulations to the loveliest couple ❤️"}</p><small>— Mona</small></div><div class="wish-card"><p>${lang==="ar"?"ربنا يسعدكم العمر كله":"Wishing you a lifetime of happiness"}</p><small>— The Kamel family</small></div></div></section>
  <section class="invite-section alt"><div class="invite-section-inner"><small>📸</small><h2>${lang==="ar"?"ألبوم صور الضيوف":"Guest photo album"}</h2><p>${lang==="ar"?"الضيوف يرفعوا الصور والعروسين يعتمدوا اللي يظهر.":"Guests upload their photos; the couple approves."}</p></div></section>
  <section class="invite-section"><small>🎙</small><h2>${lang==="ar"?"رسائل صوتية":"Audio guestbook"}</h2><p>${lang==="ar"?"كل رسالة صوتية تتحفظ كذكرى.":"Every voice message is saved as a memory."}</p><div class="audio-list"><div class="audio-item">▶ 0:32 · Aunt Samira</div><div class="audio-item">▶ 0:21 · Friends</div></div></section>
  <section class="invite-section alt"><div class="invite-section-inner"><h2>${venue}</h2><a class="btn btn-primary" href="builder.html?t=${tm.slug}">${lang==="ar"?"اعمل دعوتك بهذا التصميم":"Create yours with this template"}</a><br><br><a href="examples.html">${lang==="ar"?"← كل النماذج":"← All examples"}</a></div></section>
  <footer class="invite-footer">WEDORA ✦ DEMO INVITATION</footer>
 </main>`;
}
setLanguage(getLang());window.addEventListener('wedora:language',render);document.addEventListener('click',e=>{if(e.target.closest('[data-lang-toggle]')){const n=getLang()==='ar'?'en':'ar';setLanguage(n);render()}});render();
