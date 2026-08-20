import { fallbackExamples,fallbackTemplates } from "./data.js";
import { getLang,t } from "./i18n.js";
function render(){
 const lang=getLang();
 document.querySelector("#exampleGrid").innerHTML=fallbackExamples.map(x=>{
   const tm=fallbackTemplates.find(t=>t.slug===x.template_slug)||fallbackTemplates[0];
   return `<a class="example-card" href="example.html?slug=${x.slug}">
     <img src="${tm.preview_image_url}" alt="">
     <div class="example-info"><div><small>${lang==="ar"?x.city_ar:x.city_en}</small><h3>${lang==="ar"?`${x.name1_ar} & ${x.name2_ar}`:`${x.name1_en} & ${x.name2_en}`}</h3></div><span>↗</span></div>
   </a>`
 }).join("");
}
window.addEventListener("wedora:language",render);render();
