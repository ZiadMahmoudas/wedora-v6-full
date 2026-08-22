import {
  loadTemplates,currentDraft,saveLocalDraft,getSupabase,getUser,getProfile,getActiveSubscription,uploadFile,
  upsertDemoInvitation,getDemoInvitationById,updateDemoInvitation,listDemoInvitations,getPublicInvitationUrl
} from './supabase.js?v=20260822.6';
import { fallbackTemplates,featureLabels } from './data.js';
import { initI18n,getLang } from './i18n.js';
import {
  $, $$, escapeHtml, escapeAttr, cleanSlug, isTemplatePreviewAsset, mergeBySlug, activeSorted, randomId, formatDate, validateMediaFile, revokeObjectUrl
} from './utils.js';
import {
  CUSTOM_SECTION_PRESETS,STORY_COVER_STYLES,normalizeFeatures,createDefaultDraft
} from './invitation-config.js';
import { CONFIG } from './config.js';

initI18n();

let templates=fallbackTemplates,loggedIn=false,accountSubscription=null;
const query=new URLSearchParams(location.search);
let editId=query.get('id');
const selectedPlan=query.get('plan');
let state=createDefaultDraft(query.get('t')||'classic-ivory');
const featureKeys=['song','countdown','rsvp','wishes','guest_photos','audio_guestbook','auto_scroll'];
let bindingsReady=false;
let statusTimer=null;

function status(text,{error=false,sticky=false}={}){
  const el=$('#saveStatus');
  if(!el)return;
  clearTimeout(statusTimer);
  el.textContent=text||'';
  el.classList.toggle('is-error',!!error);
  if(text&&!sticky)statusTimer=setTimeout(()=>{el.textContent='';el.classList.remove('is-error')},3200);
}
function setBusy(btn,busy,label=''){
  if(!btn)return;
  if(busy){btn.dataset.oldText=btn.innerHTML;btn.disabled=true;btn.classList.add('loading');if(label)btn.textContent=label}
  else{btn.disabled=false;btn.classList.remove('loading');if(btn.dataset.oldText){btn.innerHTML=btn.dataset.oldText;delete btn.dataset.oldText}}
}
function normalizeDraftShape(raw,templateSlug=state.template_slug||'classic-ivory'){
  const base=createDefaultDraft(templateSlug);
  const next={...base,...(raw&&typeof raw==='object'?raw:{})};
  next.template_slug=String(next.template_slug||templateSlug||'classic-ivory');
  next.partner1_name=String(next.partner1_name||'');
  next.partner2_name=String(next.partner2_name||'');
  next.venue_name=String(next.venue_name||'');
  next.city=String(next.city||'');
  next.map_url=String(next.map_url||'');
  next.message=String(next.message||'');
  next.slug=cleanSlug(next.slug||base.slug);
  next.accent=/^#[0-9a-f]{6}$/i.test(String(next.accent||''))?next.accent:'#9b6f48';
  next.hero_image_url=typeof next.hero_image_url==='string'?next.hero_image_url:'';
  next.song_url=typeof next.song_url==='string'?next.song_url:'';
  next.gallery_urls=Array.isArray(next.gallery_urls)?next.gallery_urls.filter(x=>typeof x==='string').slice(0,8):[];
  next.features_config=normalizeFeatures(next.features_config||{});
  return next;
}
async function getBuilderUser({autoDemo=true}={}){
  let user=await getUser();
  if(!user&&autoDemo&&CONFIG.DEMO_MODE){
    try{
      localStorage.setItem('wedora_demo_auth','1');
      localStorage.setItem('wedora_demo_role','user');
      localStorage.setItem('wedora_demo_name','Demo Customer');
      user=await getUser();
    }catch{}
  }
  return user;
}

function serializable(){
  const copy={...state,features_config:normalizeFeatures(state.features_config)};
  delete copy._heroFile;delete copy._galleryFiles;delete copy._songFile;
  if(/^(blob:|data:)/i.test(String(copy.hero_image_url||'')))copy.hero_image_url='';
  copy.gallery_urls=(Array.isArray(copy.gallery_urls)?copy.gallery_urls:[]).filter(url=>!(/^(blob:|data:)/i.test(String(url))));
  if(/^(blob:|data:)/i.test(String(copy.song_url||'')))copy.song_url='';
  return copy;
}
function isDuplicateSlugError(err){return err?.code==='23505'&&String(err?.message||'').includes('invitations_slug_key')}
function customSections(){state.features_config=normalizeFeatures(state.features_config);return state.features_config.custom_sections}
function syncReturnedSlug(oldSlug){if($('#slug'))$('#slug').value=state.slug||'';if($('#slugStatus')){$('#slugStatus').textContent=state.slug!==oldSlug?(getLang()==='ar'?`الرابط كان مستخدمًا؛ اخترنا لك /${state.slug} تلقائيًا ✓`:`That link was taken; we changed it to /${state.slug} automatically ✓`):(getLang()==='ar'?`رابطك: /${state.slug}`:`Your link: /${state.slug}`);$('#slugStatus').className=state.slug!==oldSlug?'slug-status changed':'slug-status'}}
function persist(){
  try{saveLocalDraft(serializable());status(getLang()==='ar'?'محفوظ محليًا ✓':'Saved locally ✓');return true}
  catch(e){console.warn('Local draft save failed',e);status(getLang()==='ar'?'تعذر الحفظ المحلي — هنكمل الحفظ على الحساب':'Local save failed — continuing with account save',{error:true});return false}
}

function fill(){
  const map={partner1_name:'#partner1',partner2_name:'#partner2',event_date:'#eventDate',venue_name:'#venue',city:'#city',map_url:'#mapUrl',message:'#message',slug:'#slug',accent:'#accent'};
  for(const [k,s] of Object.entries(map))if($(s))$(s).value=state[k]||'';
  render();
}

function bind(){
  if(bindingsReady)return;
  bindingsReady=true;
  const on=(sel,event,handler)=>{const el=$(sel);if(el)el.addEventListener(event,handler);return el};
  const map={partner1_name:'#partner1',partner2_name:'#partner2',event_date:'#eventDate',venue_name:'#venue',city:'#city',map_url:'#mapUrl',message:'#message',slug:'#slug',accent:'#accent'};
  for(const [k,sel] of Object.entries(map))on(sel,'input',e=>{
    state[k]=k==='slug'?cleanSlug(e.target.value):e.target.value;
    if(k==='slug'&&e.target.value!==state[k])e.target.value=state[k];
    try{saveLocalDraft(serializable())}catch{}
    render();
  });
  on('#slug','blur',()=>{state.slug=cleanSlug(state.slug);const el=$('#slug');if(el)el.value=state.slug;syncReturnedSlug(state.slug);try{saveLocalDraft(serializable())}catch{}});
  on('#heroFile','change',e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{validateMediaFile(f,{kind:'image',maxMB:8});revokeObjectUrl(state.hero_image_url);state._heroFile=f;state.hero_image_url=URL.createObjectURL(f);if($('#heroName'))$('#heroName').textContent=f.name;render()}
    catch(err){e.target.value='';alert(err.message||err)}
  });
  on('#clearHero','click',()=>{revokeObjectUrl(state.hero_image_url);delete state._heroFile;state.hero_image_url='';if($('#heroFile'))$('#heroFile').value='';if($('#heroName'))$('#heroName').textContent=getLang()==='ar'?'بدون صورة — هنعرض الستايل السادة':'No photo — styled blank cover active';try{saveLocalDraft(serializable())}catch{};render()});
  on('#galleryFiles','change',e=>{
    try{const files=[...(e.target.files||[])].slice(0,8);files.forEach(f=>validateMediaFile(f,{kind:'image',maxMB:8}));(state.gallery_urls||[]).forEach(revokeObjectUrl);state._galleryFiles=files;state.gallery_urls=files.map(URL.createObjectURL);if($('#galleryName'))$('#galleryName').textContent=`${files.length} files`;render()}
    catch(err){e.target.value='';alert(err.message||err)}
  });
  on('#songFile','change',e=>{
    const f=e.target.files?.[0];if(!f)return;
    try{validateMediaFile(f,{kind:'audio',maxMB:15});revokeObjectUrl(state.song_url);state._songFile=f;state.song_url=URL.createObjectURL(f);if($('#songName'))$('#songName').textContent=f.name;render()}
    catch(err){e.target.value='';alert(err.message||err)}
  });

  on('#saveDraft','click',async e=>{
    const btn=e.currentTarget;setBusy(btn,true,getLang()==='ar'?'جاري الحفظ…':'Saving…');status(getLang()==='ar'?'جاري حفظ المسودة…':'Saving draft…',{sticky:true});
    try{await saveDraft()}catch(err){console.error(err);status(err.message||String(err),{error:true})}finally{setBusy(btn,false)}
  });
  on('#checkoutBtn','click',async e=>{const btn=e.currentTarget;setBusy(btn,true,getLang()==='ar'?'جاري المتابعة…':'Continuing…');try{await goCheckout()}finally{setBusy(btn,false)}});
  on('#topAction','click',async e=>{const btn=e.currentTarget;setBusy(btn,true,getLang()==='ar'?'جاري المتابعة…':'Continuing…');try{await goCheckout()}finally{setBusy(btn,false)}});
  on('#trialBtn','click',async e=>{const btn=e.currentTarget;setBusy(btn,true,getLang()==='ar'?'جاري تجهيز التجربة…':'Starting trial…');try{await startTrial()}finally{setBusy(btn,false)}});
  on('#generateCopy','click',generateCopy);
  on('#addCustomSection','click',()=>{addCustomSection($('#customSectionType')?.value||'note');status(getLang()==='ar'?'تمت إضافة القسم ✓':'Section added ✓')});
  on('#heroPosition','input',e=>{const v=Number(e.target.value);state.features_config={...coverConfig(),story_cover_position:v};if($('#heroPositionValue'))$('#heroPositionValue').textContent=`${v}%`;try{saveLocalDraft(serializable())}catch{};render()});
  on('#heroOverlay','input',e=>{const v=Number(e.target.value);state.features_config={...coverConfig(),story_cover_overlay:v};if($('#heroOverlayValue'))$('#heroOverlayValue').textContent=`${v}%`;try{saveLocalDraft(serializable())}catch{};render()});
  ['#heroFile','#galleryFiles','#songFile'].forEach(sel=>on(sel,'click',async e=>{if(!loggedIn&&!CONFIG.DEMO_MODE){e.preventDefault();persist();location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search)}}));
  on('#membershipRefreshBtn','click',refreshMembership);
  $$('[data-jump]').forEach(btn=>btn.addEventListener('click',()=>document.getElementById(btn.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'})));
  $$('[data-device]').forEach(btn=>btn.addEventListener('click',()=>{$$('[data-device]').forEach(x=>x.classList.toggle('active',x===btn));$('#builderDevice')?.classList.toggle('is-tablet',btn.dataset.device==='tablet')}));
}

function coverConfig(){state.features_config=normalizeFeatures(state.features_config);return state.features_config}

function renderStoryStyles(){
  const l=getLang(),cfg=coverConfig();
  const host=$('#storyStyleGrid');
  if(!host)return;
  host.innerHTML=STORY_COVER_STYLES.map(x=>`
    <button type="button" class="story-style-card ${cfg.story_cover_style===x.id?'active':''}" data-story-style="${x.id}">
      <span class="story-style-mini ${x.id}">
        <i></i><b>${x.icon}</b><em>♥</em>
      </span>
      <span class="story-style-copy">
        <b>${escapeHtml(l==='ar'?x.name_ar:x.name_en)}</b>
        <small>${escapeHtml(l==='ar'?x.desc_ar:x.desc_en)}</small>
      </span>
      <span class="story-style-check">✓</span>
    </button>
  `).join('');
  $$('[data-story-style]').forEach(btn=>btn.onclick=()=>{
    state.features_config={...coverConfig(),story_cover_style:btn.dataset.storyStyle};
    saveLocalDraft(serializable());
    renderStoryStyles();
    render();
  });
  if($('#heroPosition')){
    $('#heroPosition').value=Number(cfg.story_cover_position||50);
    $('#heroPositionValue').textContent=`${Number(cfg.story_cover_position||50)}%`;
  }
  if($('#heroOverlay')){
    $('#heroOverlay').value=Number(cfg.story_cover_overlay||20);
    $('#heroOverlayValue').textContent=`${Number(cfg.story_cover_overlay||20)}%`;
  }
}

function renderTemplates(){
  const l=getLang();
  $('#builderTemplates').innerHTML=templates.filter(x=>x.is_active!==false).slice(0,10).map(x=>`<button class="builder-template-option ${x.slug===state.template_slug?'active':''}" data-template="${x.slug}" data-label="${escapeHtml(l==='ar'?x.name_ar:x.name_en)}" title="${escapeHtml(l==='ar'?x.name_ar:x.name_en)}"><img src="${x.preview_image_url}" alt="${escapeHtml(l==='ar'?x.name_ar:x.name_en)}"></button>`).join('');
  $$('[data-template]').forEach(b=>b.onclick=()=>{
    const x=templates.find(t=>t.slug===b.dataset.template);if(!x)return;state.template_slug=x.slug;
    if(!state._heroFile&&isTemplatePreviewAsset(state.hero_image_url))state.hero_image_url='';
    state.accent=x.accent||state.accent;$('#accent').value=state.accent;
    saveLocalDraft(serializable());renderTemplates();render();
  });
}

function renderFeatures(){
  const l=getLang();
  $('#featureToggles').innerHTML=featureKeys.map(k=>`<label class="admin-row"><span>${featureLabels[k]?.[l]||k}</span><input type="checkbox" data-feature="${k}" ${state.features_config?.[k]!==false?'checked':''}></label>`).join('')+
  `<label class="admin-row scroll-speed-row">
    <span><b>${l==='ar'?'سرعة النزول التلقائي':'Auto-scroll speed'}</b><small>${l==='ar'?'تتغير فورًا في الدعوة بعد الحفظ':'Applied to the live invitation after save'}</small></span>
    <div class="scroll-speed-control"><input id="scrollSpeed" type="range" min="20" max="120" step="4" value="${Number(state.features_config?.auto_scroll_speed||38)}"><output id="scrollSpeedValue">${Number(state.features_config?.auto_scroll_speed||38)} px/s</output></div>
  </label>`;
  $$('[data-feature]').forEach(x=>x.onchange=()=>{state.features_config={...(state.features_config||{}),[x.dataset.feature]:x.checked};saveLocalDraft(serializable())});
  $('#scrollSpeed').oninput=e=>{
    const v=Number(e.target.value);
    state.features_config={...(state.features_config||{}),auto_scroll_speed:v};
    $('#scrollSpeedValue').textContent=`${v} px/s`;
    saveLocalDraft(serializable());
  };
}

function addCustomSection(type){
  const p=CUSTOM_SECTION_PRESETS[type]||CUSTOM_SECTION_PRESETS.note;
  customSections().push({id:randomId('section'),type,icon:p.icon||'✦',title_ar:p.title_ar,title_en:p.title_en,body_ar:p.body_ar,body_en:p.body_en,button_label_ar:p.button_label_ar||'',button_label_en:p.button_label_en||'',url:p.url||'',layout:'card',enabled:true});
  try{saveLocalDraft(serializable())}catch{}
  renderCustomEditor();render();
  requestAnimationFrame(()=>{
    const cards=$$('.custom-editor-card');
    const card=cards[cards.length-1];
    if(card){card.classList.add('just-added');card.scrollIntoView({behavior:'smooth',block:'nearest'});setTimeout(()=>card.classList.remove('just-added'),1400)}
  });
}

function moveCustom(index,dir){
  const rows=customSections(),next=index+dir;if(next<0||next>=rows.length)return;
  [rows[index],rows[next]]=[rows[next],rows[index]];saveLocalDraft(serializable());renderCustomEditor();render();
}
function removeCustom(index){customSections().splice(index,1);saveLocalDraft(serializable());renderCustomEditor();render()}
function updateCustom(index,key,value){const row=customSections()[index];if(!row)return;row[key]=value;saveLocalDraft(serializable());render()}

function renderCustomEditor(){
  const l=getLang(),rows=customSections();
  $('#customSectionsEditor').innerHTML=rows.length?rows.map((x,i)=>`<article class="custom-editor-card" data-custom-index="${i}">
    <div class="custom-editor-head">
      <div><span class="custom-editor-icon">${escapeHtml(x.icon||'✦')}</span><b>${escapeHtml(l==='ar'?(x.title_ar||x.title_en):(x.title_en||x.title_ar))}</b><small>${escapeHtml(x.type||'note')}</small></div>
      <div class="action-row"><button class="mini-btn" type="button" data-move-up="${i}">↑</button><button class="mini-btn" type="button" data-move-down="${i}">↓</button><button class="mini-btn reject" type="button" data-remove-custom="${i}">×</button></div>
    </div>
    <div class="custom-editor-grid">
      <div class="field"><label>العنوان AR</label><input data-custom-field="title_ar" data-index="${i}" value="${escapeAttr(x.title_ar||'')}"></div>
      <div class="field"><label>Title EN</label><input data-custom-field="title_en" data-index="${i}" value="${escapeAttr(x.title_en||'')}"></div>
      <div class="field full"><label>النص AR</label><textarea rows="3" data-custom-field="body_ar" data-index="${i}">${escapeHtml(x.body_ar||'')}</textarea></div>
      <div class="field full"><label>Text EN</label><textarea rows="3" data-custom-field="body_en" data-index="${i}">${escapeHtml(x.body_en||'')}</textarea></div>
      <div class="field"><label>${l==='ar'?'الشكل':'Layout'}</label><select data-custom-field="layout" data-index="${i}"><option value="card" ${x.layout!=='wide'?'selected':''}>Card</option><option value="wide" ${x.layout==='wide'?'selected':''}>Wide</option></select></div>
      <div class="field"><label>Icon</label><input data-custom-field="icon" data-index="${i}" value="${escapeAttr(x.icon||'✦')}" maxlength="4"></div>
      <div class="field"><label>Button AR</label><input data-custom-field="button_label_ar" data-index="${i}" value="${escapeAttr(x.button_label_ar||'')}"></div>
      <div class="field"><label>Button EN</label><input data-custom-field="button_label_en" data-index="${i}" value="${escapeAttr(x.button_label_en||'')}"></div>
      <div class="field full"><label>URL</label><input data-custom-field="url" data-index="${i}" value="${escapeAttr(x.url||'')}" placeholder="https://..."></div>
    </div>
  </article>`).join(''):`<div class="custom-editor-empty">${l==='ar'?'لسه مفيش أقسام إضافية. اختار نوع واضغط إضافة.':'No custom sections yet. Pick a type and add one.'}</div>`;
  $$('[data-custom-field]').forEach(el=>el.addEventListener('input',e=>updateCustom(Number(e.target.dataset.index),e.target.dataset.customField,e.target.value)));
  $$('[data-remove-custom]').forEach(b=>b.onclick=()=>removeCustom(Number(b.dataset.removeCustom)));
  $$('[data-move-up]').forEach(b=>b.onclick=()=>moveCustom(Number(b.dataset.moveUp),-1));
  $$('[data-move-down]').forEach(b=>b.onclick=()=>moveCustom(Number(b.dataset.moveDown),1));
}

function renderCustomPreview(){
  const l=getLang(),rows=customSections().filter(x=>x.enabled!==false);
  $('#previewCustomSections').innerHTML=rows.map(x=>`<article class="preview-custom-card ${x.layout==='wide'?'wide':''}"><span>${escapeHtml(x.icon||'✦')}</span><b>${escapeHtml(l==='ar'?(x.title_ar||x.title_en):(x.title_en||x.title_ar))}</b><p>${escapeHtml(l==='ar'?(x.body_ar||x.body_en):(x.body_en||x.body_ar)).replace(/\n/g,'<br>')}</p></article>`).join('');
}

function render(){
  const tmpl=templates.find(x=>x.slug===state.template_slug)||templates[0];
  $('#previewInvite').className=`preview-invite template-${state.template_slug}`;
  $('#previewInvite').style.setProperty('--invite-bg',tmpl?.background||'#f3eadc');
  $('#previewInvite').style.setProperty('--invite-fg',state.template_slug==='moonlight-navy'||state.template_slug==='royal-arabesque'?'#f7f1e8':'#3d2924');
  $('#previewInvite').style.setProperty('--accent',state.accent);
  const cfg=coverConfig();
  const customPhoto=state.hero_image_url&&!isTemplatePreviewAsset(state.hero_image_url)?state.hero_image_url:'';
  const previewCover=$('#previewCover');
  previewCover.className=`preview-cover-v2 story-cover-preview cover-${cfg.story_cover_style||'photo-card'} ${customPhoto?'has-photo':'no-photo'}`;
  previewCover.style.setProperty('--story-photo-position',`${Number(cfg.story_cover_position||50)}%`);
  previewCover.style.setProperty('--story-overlay',Number(cfg.story_cover_overlay||20)/100);
  $('#previewCoverArt').classList.toggle('has-user-photo',!!customPhoto);
  if(customPhoto){
    $('#previewCoverArt').style.setProperty('background-image',`linear-gradient(180deg,rgba(10,7,9,var(--story-overlay,.20)),rgba(10,7,9,calc(var(--story-overlay,.20) + .14))),url("${customPhoto}")`,'important');
    $('#previewCoverArt').style.setProperty('background-position',`center ${Number(cfg.story_cover_position||50)}%`,'important');
  }else{
    $('#previewCoverArt').style.removeProperty('background-image');
    $('#previewCoverArt').style.removeProperty('background-position');
  }
  $('#previewNames').textContent=`${state.partner1_name} & ${state.partner2_name}`;
  $('#previewNames2').textContent=`${state.partner1_name} & ${state.partner2_name}`;
  $('#previewDate').textContent=formatDate(state.event_date,getLang());
  $('#previewVenue').textContent=`${state.venue_name}${state.city?' — '+state.city:''}`;
  $('#previewMessage').textContent=state.message;
  $('#previewGallery').innerHTML=(state.gallery_urls||[]).map(u=>`<img src="${u}" alt="">`).join('');
  renderCustomPreview();
}

function subscriptionPlan(sub=accountSubscription){return sub?.plan||{id:sub?.plan_id,slug:sub?.plan_slug,name_ar:sub?.plan_name_ar,name_en:sub?.plan_name_en,is_lifetime:sub?.is_lifetime};}
function subscriptionLabel(){
  if(!accountSubscription)return '';
  const l=getLang(),p=subscriptionPlan(),name=(l==='ar'?(p?.name_ar||p?.name_en):(p?.name_en||p?.name_ar))||(l==='ar'?'خطة فعالة':'Active plan');
  if(accountSubscription.is_lifetime||p?.is_lifetime)return l==='ar'?`${name} · مدى الحياة ∞`:`${name} · Lifetime ∞`;
  const end=accountSubscription.current_period_end?new Date(accountSubscription.current_period_end):null;
  return end?(l==='ar'?`${name} · فعالة حتى ${end.toLocaleDateString('ar-EG')}`:`${name} · active until ${end.toLocaleDateString('en-GB')}`):name;
}
function refreshPublishUI(){
  const l=getLang(),top=$('#topAction'),bottom=$('#checkoutBtn'),trial=$('#trialBtn'),pill=$('#accountPlanPill'),notice=$('#accountPlanNotice');
  const alreadyLive=state.status==='active'&&!state.is_trial;
  if(alreadyLive){
    const text=l==='ar'?'فتح الدعوة':'Open invitation';top.textContent=text;bottom.textContent=text;trial.hidden=true;
    pill.hidden=false;pill.textContent=l==='ar'?'منشورة ✓':'LIVE ✓';pill.className='account-plan-pill live';
    notice.hidden=false;notice.className='account-plan-notice live';notice.innerHTML=l==='ar'?'<b>الدعوة منشورة بالفعل ✓</b><span>أي تعديل تحفظه هنا يظهر على نفس الرابط.</span>':'<b>Your invitation is already live ✓</b><span>Saved edits appear on the same link.</span>';
    return;
  }
  if(accountSubscription){
    const text=l==='ar'?'نشر الدعوة':'Publish invitation';top.textContent=text;bottom.textContent=text;trial.hidden=true;
    pill.hidden=false;pill.textContent=subscriptionLabel();pill.className='account-plan-pill active';
    notice.hidden=false;notice.className='account-plan-notice active';notice.innerHTML=l==='ar'?`<div><small>اشتراك الحساب</small><b>${subscriptionLabel()}</b><span>خلصت التصميم؟ اضغط نشر وهتفتح الدعوة فورًا.</span></div><span class="plan-ready-dot">جاهز للنشر</span>`:`<div><small>Account plan</small><b>${subscriptionLabel()}</b><span>Finished? Publish and open the invitation immediately.</span></div><span class="plan-ready-dot">Ready</span>`;
    return;
  }
  const text=l==='ar'?'اختار خطة':'Choose a plan';top.textContent=text;bottom.textContent=text;trial.hidden=false;pill.hidden=true;
  notice.hidden=false;notice.className='account-plan-notice needs-plan';notice.innerHTML=l==='ar'?`<div><small>حالة الحساب</small><b>مفيش اشتراك فعال ظاهر حاليًا</b><span>لو الدفع اتعمد بالفعل اضغط «تحديث حالة اشتراكي». غير كده اختار خطة مرة واحدة للحساب كله.</span></div>`:`<div><small>Account status</small><b>No active membership found yet</b><span>If your payment was already approved, press “Refresh my membership”. Otherwise choose one account plan.</span></div>`;
}

async function refreshMembership(){
  const btn=$('#membershipRefreshBtn');
  if(btn){btn.disabled=true;btn.classList.add('loading')}
  try{
    const user=await getBuilderUser();
    loggedIn=!!user;
    if(!user){persist();location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);return}
    accountSubscription=await getActiveSubscription(user);
    refreshPublishUI();
    status(accountSubscription?(getLang()==='ar'?'تم تحديث الاشتراك ✓':'Membership refreshed ✓'):(getLang()==='ar'?'لسه مفيش اشتراك فعال':'No active membership yet'));
  }catch(e){alert(e.message||e)}finally{if(btn){btn.disabled=false;btn.classList.remove('loading')}}
}

async function publishFromSubscription(){
  await saveDraft();if(!editId)return;
  if(state.status==='active'&&!state.is_trial){location.href=getPublicInvitationUrl(state.slug);return;}

  // Always re-check immediately before publishing. This removes the old problem
  // where an approved account stayed "unsubscribed" until a new browser session.
  await refreshMembership();
  if(!accountSubscription){
    const next=selectedPlan?`checkout.html?plan=${encodeURIComponent(selectedPlan)}&invitation=${editId}`:`pricing.html?invitation=${editId}`;
    location.href=next;return;
  }

  const sb=await getSupabase();
  if(!sb){
    state.status='active';state.is_trial=false;state.is_lifetime=!!accountSubscription.is_lifetime;state.active_until=accountSubscription.current_period_end||null;
    updateDemoInvitation(editId,{...serializable(),status:'active',is_trial:false,is_lifetime:state.is_lifetime,active_until:state.active_until});
    location.href=getPublicInvitationUrl(state.slug);return;
  }

  // V11 returns a JSON object instead of a RETURNS TABLE row. This avoids
  // PostgreSQL output-column name collisions such as `status is ambiguous`.
  let res=await sb.rpc('publish_invitation_v11',{p_invitation_id:editId});
  if(res.error&&/could not find the function|schema cache|publish_invitation_v11/i.test(String(res.error.message||''))){
    res=await sb.rpc('publish_invitation_v10',{p_invitation_id:editId});
  }
  if(res.error&&/could not find the function|schema cache|publish_invitation_v10/i.test(String(res.error.message||''))){
    res=await sb.rpc('publish_invitation_v9',{p_invitation_id:editId});
  }
  if(res.error&&/could not find the function|schema cache|publish_invitation_v9/i.test(String(res.error.message||''))){
    // Compatibility fallback for very old databases.
    res=await sb.rpc('publish_with_subscription',{p_invitation_id:editId});
  }
  if(res.error){
    const msg=String(res.error.message||'');
    if(/status.*ambiguous|ambiguous.*status/i.test(msg)){
      throw new Error(getLang()==='ar'?'قاعدة البيانات عندك عليها دالة نشر قديمة فيها تعارض status. شغّل sql/FIX-PUBLISH-FINAL.sql مرة واحدة ثم اضغط نشر الدعوة.':'Your database still has the old ambiguous publish function. Run sql/FIX-PUBLISH-FINAL.sql once, then publish again.');
    }
    if(/active account subscription|required|subscription/i.test(msg)){
      accountSubscription=null;refreshPublishUI();
      throw new Error(getLang()==='ar'?'الاشتراك ظاهر لكن دالة النشر في قاعدة البيانات محتاجة التحديث. شغّل sql/FIX-PUBLISH-NOW.sql مرة واحدة ثم اضغط نشر الدعوة.':'Your account plan is visible, but the publish function needs the current database hotfix. Run sql/FIX-PUBLISH-NOW.sql once, then publish again.');
    }
    throw res.error;
  }
  state.status='active';state.is_trial=false;saveLocalDraft(serializable());
  location.href=getPublicInvitationUrl(state.slug);
}

function generateCopy(){
  const l=getLang(),tone=$('#writerTone').value,n1=state.partner1_name||'',n2=state.partner2_name||'';
  const ar={romantic:`في ليلة كتبها الحب لقلوبنا، يسعد ${n1} و${n2} أن يشاركاكم بداية أجمل فصول حياتهما. وجودكم يكمل فرحتنا 🤍`,formal:`يتشرف ${n1} و${n2} بدعوتكم لحضور حفل زفافهما، ويسعدهما مشاركتكم هذه المناسبة السعيدة.`,warm:`فرحتنا ما تكملش غير بوجودكم 🤍 ${n1} و${n2} مستنيينكم تشاركونا اليوم اللي هنفتكره العمر كله.`};
  const en={romantic:`With hearts full of love, ${n1} and ${n2} invite you to share the beginning of their forever. Your presence will make the moment complete.`,formal:`${n1} and ${n2} request the pleasure of your company as they celebrate their wedding and begin their new chapter together.`,warm:`Our day would not feel complete without you. ${n1} and ${n2} would love to celebrate this unforgettable moment with you.`};
  state.message=(l==='ar'?ar:en)[tone];$('#message').value=state.message;saveLocalDraft(serializable());render();
}

async function startTrial(){
  try{
    await saveDraft();if(!editId)return;
    const sb=await getSupabase();
    if(!sb){state.status='active';state.is_trial=true;state.active_until=new Date(Date.now()+86400000).toISOString();updateDemoInvitation(editId,{...serializable(),status:'active',is_trial:true,active_until:state.active_until});location.href=`invitation.html?slug=${encodeURIComponent(state.slug)}`;return}
    const {error}=await sb.rpc('start_trial',{p_invitation_id:editId});if(error)throw error;location.href=`invitation.html?slug=${encodeURIComponent(state.slug)}`;
  }catch(e){alert(e.message||e)}
}

async function saveDraft(){
  persist();
  const user=await getBuilderUser();
  if(!user){location.href='auth.html?next='+encodeURIComponent(`builder.html${selectedPlan?'?plan='+selectedPlan:''}`);return}
  const p=await getProfile(user);
  if(p?.role==='admin'){alert(getLang()==='ar'?'استخدم حساب عميل لحفظ الدعوة.':'Use a customer account to save invitations.');return}
  const sb=await getSupabase();
  if(!sb){
    const requestedSlug=cleanSlug(state.slug);
    const existing=getDemoInvitationById(editId);
    const duplicate=listDemoInvitations().find(x=>x.slug===requestedSlug&&x.id!==editId);
    state.slug=duplicate?`${requestedSlug}-${Math.random().toString(36).slice(2,6)}`:requestedSlug;
    const saved=upsertDemoInvitation({...serializable(),id:existing?.id||editId||undefined,user_id:user.id,status:existing?.status||state.status||'draft'});
    editId=saved.id;Object.assign(state,saved);syncReturnedSlug(requestedSlug);saveLocalDraft(serializable());
    history.replaceState(null,'',`builder.html?id=${editId}${selectedPlan?'&plan='+selectedPlan:''}`);
    status(getLang()==='ar'?'تم حفظ المسودة ✓':'Draft saved ✓');refreshPublishUI();return saved;
  }
  try{
    let hero=state.hero_image_url,gallery=(state.gallery_urls||[]).filter(x=>!x.startsWith('blob:')),song=state.song_url?.startsWith('blob:')?'':state.song_url;
    if(isTemplatePreviewAsset(hero))hero='';
    if(state._heroFile)hero=await uploadFile('invitation-media',state._heroFile,`${user.id}/hero`);
    if(state._galleryFiles?.length){gallery=[];for(const f of state._galleryFiles)gallery.push(await uploadFile('invitation-media',f,`${user.id}/gallery`))}
    if(state._songFile)song=await uploadFile('invitation-media',state._songFile,`${user.id}/music`);
    const requestedSlug=cleanSlug(state.slug);
    const makePayload=(slug,{forceDraft=false}={})=>({
      user_id:user.id,template_slug:state.template_slug,slug,
      status:forceDraft?'draft':(editId?(state.status||'draft'):'draft'),
      language:getLang(),partner1_name:state.partner1_name,partner2_name:state.partner2_name,
      event_date:state.event_date,venue_name:state.venue_name,city:state.city,map_url:state.map_url||null,
      message:state.message,hero_image_url:hero||null,gallery_urls:gallery,song_url:song||null,
      theme_config:{accent:state.accent},features_config:normalizeFeatures(state.features_config)
    });

    const writeInvitationDirect=async slug=>{
      if(editId){
        const updated=await sb.from('invitations').update(makePayload(slug)).eq('id',editId).eq('user_id',user.id).select('*');
        if(updated.error)return updated;
        const row=Array.isArray(updated.data)?updated.data[0]:updated.data;
        if(row)return {data:row,error:null};
        editId=null;
      }
      const inserted=await sb.from('invitations').insert(makePayload(slug,{forceDraft:true})).select('*');
      if(inserted.error)return inserted;
      return {data:Array.isArray(inserted.data)?inserted.data[0]||null:inserted.data||null,error:null};
    };

    // Preferred V11 path: save through one SECURITY DEFINER RPC. It returns a
    // normal JSON object and never asks PostgREST to coerce a PATCH result into
    // a single object, which removes the recurring HTTP 406/PGRST116 failure.
    let res=await sb.rpc('save_invitation_v11',{
      p_invitation_id:editId||null,
      p_payload:makePayload(requestedSlug,{forceDraft:!editId})
    });
    if(!res.error){
      const row=Array.isArray(res.data)?res.data[0]||null:res.data||null;
      res={data:row,error:null};
    }else if(/could not find the function|schema cache|save_invitation_v11/i.test(String(res.error.message||''))){
      // Database has not received the hotfix yet. Keep a non-single direct
      // fallback so the UI remains usable on older installations.
      res=await writeInvitationDirect(requestedSlug);
    }
    if(res.error&&isDuplicateSlugError(res.error)){
      const fallbackSlug=`${requestedSlug}-${Math.random().toString(36).slice(2,6)}`;
      res=await writeInvitationDirect(fallbackSlug);
    }
    if(res.error)throw res.error;
    if(!res.data)throw new Error(getLang()==='ar'?'تعذر العثور على الدعوة بعد الحفظ. افتح الدعوة من لوحة التحكم وحاول مرة أخرى.':'The invitation could not be found after saving. Re-open it from the dashboard and try again.');
    editId=res.data.id;Object.assign(state,res.data);state.features_config=normalizeFeatures(state.features_config);
    delete state._heroFile;delete state._galleryFiles;delete state._songFile;
    $('#heroFile').value='';$('#galleryFiles').value='';$('#songFile').value='';
    syncReturnedSlug(requestedSlug);saveLocalDraft(serializable());
    history.replaceState(null,'',`builder.html?id=${editId}${selectedPlan?'&plan='+selectedPlan:''}`);status(getLang()==='ar'?'تم حفظ المسودة ✓':'Draft saved ✓');refreshPublishUI();return res.data;
  }catch(e){const friendly=isDuplicateSlugError(e)?(getLang()==='ar'?'الرابط مستخدم بالفعل. غيّر آخر جزء من رابط الدعوة وحاول تاني.':'That invitation link is already used. Change the final part and try again.'):(e.message||e);alert(friendly);throw e}
}

async function goCheckout(){
  try{await publishFromSubscription()}catch(e){alert(e.message||e)}
}

async function boot(){
  const bootUser=await getBuilderUser();loggedIn=!!bootUser;if(bootUser){try{accountSubscription=await getActiveSubscription(bootUser)}catch{accountSubscription=null}}
  const local=await currentDraft();if(local&&!editId&&!query.get('t')&&!query.get('new'))state=normalizeDraftShape(local,state.template_slug);else state=normalizeDraftShape(state,state.template_slug);
  try{saveLocalDraft(serializable())}catch{}
  try{const dbt=await loadTemplates();if(dbt?.length)templates=activeSorted(mergeBySlug(fallbackTemplates,dbt))}catch{}
  if(editId){const user=await getBuilderUser();if(!user){location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);return}const sb=await getSupabase();if(sb){const {data:rows,error}=await sb.from('invitations').select('*').eq('id',editId).eq('user_id',user.id).limit(1);if(error)throw error;const data=Array.isArray(rows)?rows[0]||null:rows||null;if(data)state=normalizeDraftShape({...state,...data},data.template_slug||state.template_slug);else editId=null}else{const demo=getDemoInvitationById(editId);if(demo)state=normalizeDraftShape({...state,...demo},demo.template_slug||state.template_slug)}}
  const qTemplate=query.get('t');if(qTemplate)state.template_slug=qTemplate;
  if(isTemplatePreviewAsset(state.hero_image_url))state.hero_image_url='';
  state.features_config=normalizeFeatures(state.features_config);
  renderTemplates();renderFeatures();renderStoryStyles();renderCustomEditor();fill();refreshPublishUI();
  // If the admin approves payment while this page is still open, the builder
  // notices automatically instead of forcing the customer to log out/in.
  if(loggedIn&&!accountSubscription){
    const watcher=setInterval(async()=>{try{const user=await getUser();const fresh=await getActiveSubscription(user);if(fresh){accountSubscription=fresh;refreshPublishUI();status(getLang()==='ar'?'تم تفعيل الباقة — تقدر تنشر دلوقتي ✓':'Plan activated — you can publish now ✓');clearInterval(watcher)}}catch{}},12000);
  }
}
window.addEventListener('focus',()=>{if(loggedIn&&!accountSubscription)refreshMembership().catch(()=>{})});
window.addEventListener('wedora:language',()=>{renderFeatures();renderStoryStyles();renderTemplates();renderCustomEditor();render();refreshPublishUI()});
bind();
boot().catch(e=>{console.error('Builder boot failed',e);status(getLang()==='ar'?'حصل خطأ في تحميل بعض البيانات، لكن الأزرار شغالة — جرّب الإجراء تاني.':'Some builder data failed to load, but actions are still available. Try again.',{error:true,sticky:true})});
