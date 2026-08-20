import { fallbackTemplates, fallbackPlans, featureLabels } from "./data.js";
import { loadTemplates, loadPlans, loadSettings } from "./supabase.js";
import { getLang, t } from "./i18n.js";

let templates=fallbackTemplates,plans=fallbackPlans,settings=null;

function money(n,currency="EGP"){
  return `${Number(n||0).toLocaleString("en-US")} ${currency}`;
}

function render(){
  const lang=getLang(); const cats={wedding:{ar:"زفاف",en:"Wedding"},engagement:{ar:"خطوبة",en:"Engagement"},"katb-ketab":{ar:"كتب كتاب",en:"Katb Ketab"}};
  const templateMount=document.querySelector("#homeTemplates");
  templateMount.innerHTML=templates.slice(0,3).map(item=>`
    <a class="template-card" href="template-preview.html?t=${encodeURIComponent(item.slug)}">
      <img src="${item.preview_image_url || `assets/templates/${item.slug}.jpg`}" alt="">
      <div class="template-info">
        <div><small>${cats[item.category]?.[lang]||item.category||"Wedding"}</small><h3>${lang==="ar"?item.name_ar:item.name_en}</h3></div>
        <div class="template-actions"><span>↗</span></div>
      </div>
    </a>`).join("");

  const planMount=document.querySelector("#homePlans");
  planMount.innerHTML=plans.map(plan=>{
    const features=Array.isArray(plan.features)?plan.features:[];
    const reference=Number(plan.reference_price||0);
    return `<article class="plan-card ${plan.is_featured?"featured":""}">
      ${plan.is_featured?`<span class="plan-badge">${lang==="ar"?"الأكثر اختيارًا":"Most popular"}</span>`:""}
      <small>${plan.name_en||plan.slug}</small>
      <h3>${lang==="ar"?plan.name_ar:plan.name_en}</h3>
      <p>${lang==="ar"?plan.description_ar:plan.description_en}</p>
      <div class="plan-price"><strong>${money(plan.price,settings?.currency||"EGP")}</strong><span>${plan.is_lifetime?(lang==="ar"?"مرة واحدة":"one time"):(lang==="ar"?"لمدة سنة":"for one year")}</span></div>
      ${reference>0?`<div class="plan-reference">${money(reference,settings?.currency||"EGP")}</div>`:""}
      <ul class="plan-features">${features.map(f=>`<li>✓ ${featureLabels[f]?.[lang]||f}</li>`).join("")}</ul>
      <a class="btn ${plan.is_featured?"btn-light":"btn-primary"}" href="builder.html?plan=${encodeURIComponent(plan.slug)}">${t("pricing_choose",lang)}</a>
    </article>`
  }).join("");
}

async function boot(){
  try{
    const [dbTemplates,dbPlans,s]=await Promise.all([loadTemplates(),loadPlans(),loadSettings()]);
    if(dbTemplates?.length) templates=dbTemplates;
    if(dbPlans?.length) plans=dbPlans;
    settings=s;
  }catch(err){console.warn(err)}
  render();
}

window.addEventListener("wedora:language",render);
boot();
