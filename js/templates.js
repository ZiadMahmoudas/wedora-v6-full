import { fallbackTemplates } from "./data.js";
import { loadTemplates } from "./supabase.js";
import { getLang, t } from "./i18n.js";

let items=fallbackTemplates,filter="all";

function render(){
 const lang=getLang(); const cats={wedding:{ar:"زفاف",en:"Wedding"},engagement:{ar:"خطوبة",en:"Engagement"},"katb-ketab":{ar:"كتب كتاب",en:"Katb Ketab"}};
 const filtered=filter==="all"?items:items.filter(x=>x.category===filter);
 document.querySelector("#templateGrid").innerHTML=filtered.map(item=>`
  <article class="template-card">
   <img src="${item.preview_image_url||`assets/templates/${item.slug}.jpg`}" alt="">
   <div class="template-info">
    <div><small>${cats[item.category]?.[lang]||item.category||"Wedding"}</small><h3>${lang==="ar"?item.name_ar:item.name_en}</h3></div>
    <div class="template-actions">
      <a title="${t("templates_preview",lang)}" href="template-preview.html?t=${encodeURIComponent(item.slug)}">◉</a>
      <a title="${t("templates_use",lang)}" href="builder.html?t=${encodeURIComponent(item.slug)}">＋</a>
    </div>
   </div>
  </article>`).join("");
}

document.addEventListener("click",e=>{
 const b=e.target.closest("[data-filter]"); if(!b)return;
 filter=b.dataset.filter;
 document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));
 render();
});
window.addEventListener("wedora:language",render);

(async()=>{
 try{const db=await loadTemplates();if(db?.length)items=db}catch(e){console.warn(e)}
 render();
})();
