import { getLang, t } from "./i18n.js";
import { getUser, getProfile, loadSettings } from "./supabase.js";

export function renderShell(){
  const headerMount=document.querySelector("[data-site-header]");
  const footerMount=document.querySelector("[data-site-footer]");
  const lang=getLang();

  if (headerMount){
    headerMount.outerHTML=`
    <header class="site-header">
      <div class="container nav">
        <a class="logo" href="index.html">WED<em>O</em>RA</a>
        <nav class="nav-links">
          <a href="index.html" data-i18n="nav_home">${t("nav_home",lang)}</a>
          <a href="templates.html" data-i18n="nav_templates">${t("nav_templates",lang)}</a>
          <a href="examples.html" data-i18n="nav_examples">${t("nav_examples",lang)}</a>
          <a href="pricing.html" data-i18n="nav_pricing">${t("nav_pricing",lang)}</a>
          <a href="contact.html" data-i18n="nav_contact">${t("nav_contact",lang)}</a>
        </nav>
        <div class="nav-actions">
          <button class="lang-btn" data-lang-toggle>${lang==="ar"?"EN":"ع"}</button>
          <a class="account-link" data-account-link href="auth.html">${t("nav_login",lang)}</a>
          <a class="btn btn-primary nav-start" href="builder.html" data-i18n="nav_start">${t("nav_start",lang)}</a>
          <button class="menu-btn" data-menu-toggle aria-label="Menu">☰</button>
        </div>
      </div>
    </header>
    <div class="mobile-menu" data-mobile-menu>
      <button class="mobile-close" data-close-menu>×</button>
      <a href="index.html" data-close-menu data-i18n="nav_home">${t("nav_home",lang)}</a>
      <a href="templates.html" data-close-menu data-i18n="nav_templates">${t("nav_templates",lang)}</a>
      <a href="examples.html" data-close-menu data-i18n="nav_examples">${t("nav_examples",lang)}</a>
      <a href="pricing.html" data-close-menu data-i18n="nav_pricing">${t("nav_pricing",lang)}</a>
      <a href="contact.html" data-close-menu data-i18n="nav_contact">${t("nav_contact",lang)}</a>
      <a href="auth.html" data-mobile-account data-close-menu>${t("nav_login",lang)}</a>
    </div>`;
  }

  if (footerMount){
    footerMount.outerHTML=`
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <a class="logo" href="index.html">WED<em>O</em>RA</a>
          <p data-i18n="footer_desc">${t("footer_desc",lang)}</p>
        </div>
        <div class="footer-col">
          <strong data-i18n="footer_site">${t("footer_site",lang)}</strong>
          <a href="templates.html" data-i18n="footer_templates">${t("footer_templates",lang)}</a>
          <a href="examples.html" data-i18n="footer_examples">${t("footer_examples",lang)}</a>
          <a href="pricing.html" data-i18n="footer_pricing">${t("footer_pricing",lang)}</a>
          <a href="contact.html" data-i18n="footer_contact">${t("footer_contact",lang)}</a>
        </div>
        <div class="footer-col">
          <strong data-i18n="footer_legal">${t("footer_legal",lang)}</strong>
          <a href="privacy.html" data-i18n="footer_privacy">${t("footer_privacy",lang)}</a>
          <a href="terms.html" data-i18n="footer_terms">${t("footer_terms",lang)}</a>
          <a href="refund.html" data-i18n="footer_refund">${t("footer_refund",lang)}</a>
        </div>
        <div class="footer-col">
          <strong data-i18n="footer_support">${t("footer_support",lang)}</strong>
          <a href="auth.html" data-i18n="nav_account">${t("nav_account",lang)}</a>
          <a href="admin-login.html" data-i18n="nav_admin">${t("nav_admin",lang)}</a>
          <a href="contact.html" data-i18n="nav_contact">${t("nav_contact",lang)}</a>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© <span data-year></span> WEDORA · <span data-i18n="footer_rights">${t("footer_rights",lang)}</span></span>
        <span>Digital celebration studio ✦</span>
      </div>
    </footer>`;
  }

  hydrateAccount();
  hydrateBrand();
}

async function hydrateBrand(){
  try{const s=await loadSettings();const name=(s?.brand_name||"WEDORA").trim();document.querySelectorAll(".logo").forEach(el=>{if(name!=="WEDORA")el.textContent=name;});}catch{}
}

async function hydrateAccount(){
  try{
    const user=await getUser();
    if(!user) return;
    const profile=await getProfile(user);
    const desktop=document.querySelector("[data-account-link]");
    const mobile=document.querySelector("[data-mobile-account]");
    const href=profile?.role==="admin"?"admin.html":"dashboard.html";
    const label=profile?.role==="admin"?t("nav_admin"):t("nav_account");
    if(desktop){desktop.href=href;desktop.textContent=label;}
    if(mobile){mobile.href=href;mobile.textContent=label;}
  }catch(err){console.warn(err)}
}
