import { renderShell } from "./site-shell.js";
import { initI18n } from "./i18n.js";

renderShell();
initI18n();

document.querySelectorAll("[data-year]").forEach(el=>el.textContent=new Date().getFullYear());

const header=document.querySelector(".site-header");
if(header){
  const onScroll=()=>header.classList.toggle("scrolled",scrollY>12);
  onScroll();addEventListener("scroll",onScroll,{passive:true});
}

document.addEventListener("click",e=>{
  if(e.target.closest("[data-menu-toggle]")) document.body.classList.add("menu-open");
  if(e.target.closest("[data-close-menu]")) document.body.classList.remove("menu-open");
  const faq=e.target.closest(".faq-question");
  if(faq){
    const item=faq.closest(".faq-item");
    item.classList.toggle("open");
  }
});

if("IntersectionObserver" in window){
  const io=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add("revealed");io.unobserve(entry.target);}
    });
  },{threshold:.08});
  document.querySelectorAll("[data-reveal]").forEach(el=>io.observe(el));
}else{
  document.querySelectorAll("[data-reveal]").forEach(el=>el.classList.add("revealed"));
}
