import { fallbackTemplates } from './data.js';
import { loadTemplates } from './supabase.js';
import { getLang } from './i18n.js';
import { activeSorted,mergeBySlug } from './utils.js';

const slug=new URLSearchParams(location.search).get('t')||'classic-ivory';
let item=fallbackTemplates.find(x=>x.slug===slug)||fallbackTemplates[0];

function render(){
  const lang=getLang(),mount=document.querySelector('#previewMount');
  const names=lang==='ar'?'مريم & يوسف':'Mariam & Youssef';
  const date=lang==='ar'?'١٢ سبتمبر ٢٠٢٦':'12 September 2026';
  document.querySelector('#previewTemplateName').textContent=lang==='ar'?item.name_ar:item.name_en;
  document.querySelector('#useTemplate').href=`builder.html?t=${encodeURIComponent(item.slug)}`;
  mount.innerHTML=`
    <article class="preview-invite template-${item.slug}" style="--invite-bg:${item.background||'#f4eee5'};--invite-fg:#302821;--accent:${item.accent||'#9c7751'}">
      <section class="preview-cover-v2">
        <div class="preview-cover-art"></div>
        <div class="preview-cover-meta">
          <small>OUR CELEBRATION</small>
          <h2>${names}</h2>
          <small>${date}</small>
        </div>
      </section>
      <section class="preview-section">
        <small style="color:var(--accent)">COUNTDOWN</small>
        <h3>${lang==='ar'?'باقي على اليوم':'Countdown to the day'}</h3>
        <div class="preview-countdown"><div><b>45</b><span>${lang==='ar'?'يوم':'Days'}</span></div><div><b>08</b><span>${lang==='ar'?'ساعة':'Hours'}</span></div><div><b>22</b><span>${lang==='ar'?'دقيقة':'Min'}</span></div><div><b>10</b><span>${lang==='ar'?'ثانية':'Sec'}</span></div></div>
      </section>
      <section class="preview-section" style="background:rgba(255,255,255,.08)"><small>RSVP</small><h3>${lang==='ar'?'هتشرّفونا؟':'Will you join us?'}</h3><button class="btn btn-primary">${lang==='ar'?'أكيد جايين 🤍':'We’ll be there 🤍'}</button></section>
    </article>`;
}

window.addEventListener('wedora:language',render);
(async()=>{try{const db=await loadTemplates();if(db?.length){const merged=activeSorted(mergeBySlug(fallbackTemplates,db));item=merged.find(x=>x.slug===slug)||merged[0]||item}}catch{}render()})();
