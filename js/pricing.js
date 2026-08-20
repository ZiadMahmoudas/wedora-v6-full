import { fallbackPlans,featureLabels } from "./data.js";
import { loadPlans,loadSettings } from "./supabase.js";
import { getLang,t } from "./i18n.js";
let plans=fallbackPlans,settings={currency:"EGP"};
function money(n){return `${Number(n||0).toLocaleString("en-US")} ${settings.currency||"EGP"}`}
function render(){
 const lang=getLang();
 document.querySelector("#pricingPlans").innerHTML=plans.map(plan=>{
   const features=Array.isArray(plan.features)?plan.features:[];
   return `<article class="plan-card ${plan.is_featured?"featured":""}">
    ${plan.is_featured?`<span class="plan-badge">${lang==="ar"?"الأكثر اختيارًا":"Most popular"}</span>`:""}
    <small>${plan.name_en||plan.slug}</small>
    <h3>${lang==="ar"?plan.name_ar:plan.name_en}</h3>
    <p>${lang==="ar"?plan.description_ar:plan.description_en}</p>
    <div class="plan-price"><strong>${money(plan.price)}</strong><span>${plan.is_lifetime?(lang==="ar"?"مرة واحدة":"one time"):(lang==="ar"?"سنة كاملة":"one year")}</span></div>
    ${Number(plan.reference_price||0)>0?`<div class="plan-reference">${money(plan.reference_price)}</div>`:""}
    <ul class="plan-features">${features.map(k=>`<li>✓ ${featureLabels[k]?.[lang]||k}</li>`).join("")}</ul>
    <a class="btn ${plan.is_featured?"btn-light":"btn-primary"}" href="${new URLSearchParams(location.search).get('invitation')?`checkout.html?plan=${plan.slug}&invitation=${encodeURIComponent(new URLSearchParams(location.search).get('invitation'))}`:`builder.html?plan=${plan.slug}`}">${t("pricing_choose",lang)}</a>
   </article>`
 }).join("");
}
window.addEventListener("wedora:language",render);
(async()=>{try{const [db,s]=await Promise.all([loadPlans(),loadSettings()]);if(db?.length)plans=db;settings=s||settings}catch(e){console.warn(e)}render()})();
