import { loadTemplates,currentDraft,saveLocalDraft,getSupabase,getUser,getProfile,uploadFile } from './supabase.js';
import { fallbackTemplates,featureLabels } from './data.js';
import { initI18n,getLang } from './i18n.js';
initI18n();

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let templates=fallbackTemplates,loggedIn=false;
const query=new URLSearchParams(location.search);
let editId=query.get('id');
let selectedPlan=query.get('plan');

const customPresets={
  schedule:{icon:'🕰',title_ar:'برنامج اليوم',title_en:'The schedule',body_ar:'٧:٠٠ م — استقبال الضيوف\n٨:٠٠ م — بداية الاحتفال',body_en:'7:00 PM — Guest arrival\n8:00 PM — Celebration begins'},
  dress_code:{icon:'✦',title_ar:'Dress Code',title_en:'Dress code',body_ar:'ألوان هادئة ورسمي بسيط',body_en:'Soft tones · smart formal'},
  transport:{icon:'↗',title_ar:'الوصول والمواصلات',title_en:'Getting there',body_ar:'اكتب نقطة التجمع أو تفاصيل المواصلات هنا.',body_en:'Add pickup points or transport details here.'},
  accommodation:{icon:'⌂',title_ar:'الإقامة',title_en:'Stay nearby',body_ar:'اكتب اسم الفندق أو تفاصيل الإقامة للضيوف.',body_en:'Add hotel or accommodation details for guests.'},
  gift:{icon:'♡',title_ar:'الهدايا',title_en:'Gifts',body_ar:'وجودكم هو أجمل هدية. ولو حابين تضيفوا ملاحظة خاصة اكتبوا هنا.',body_en:'Your presence is the best gift. Add any special note here.'},
  story:{icon:'∞',title_ar:'قصتنا',title_en:'Our story',body_ar:'اكتبوا سطرين صغيرين عن حكايتكم أو اللحظة اللي جمعتكم.',body_en:'Share a short note about your story or how it all began.'},
  note:{icon:'✉',title_ar:'ملاحظة للضيوف',title_en:'A note for our guests',body_ar:'اكتب أي معلومة مهمة للضيوف هنا.',body_en:'Add any important information for your guests here.'},
  link:{icon:'↗',title_ar:'لينك مهم',title_en:'Useful link',body_ar:'أضف وصفًا قصيرًا للينك.',body_en:'Add a short description for this link.',button_label_ar:'فتح الرابط',button_label_en:'Open link',url:'https://'}
};

let state={
  template_slug:query.get('t')||'classic-ivory',partner1_name:'أحمد',partner2_name:'سلمى',event_date:'2026-12-12T19:00',venue_name:'قاعة الاحتفال',city:'القاهرة',map_url:'',
  message:'نتشرف بمشاركتكم أجمل لحظاتنا، ويسعدنا وجودكم معنا في هذا اليوم.',slug:`invite-${Math.random().toString(36).slice(2,8)}`,accent:'#9b6f48',hero_image_url:'',gallery_urls:[],song_url:'',
  features_config:{song:true,countdown:true,rsvp:true,wishes:true,guest_photos:true,audio_guestbook:true,auto_scroll:true,auto_scroll_speed:48,custom_sections:[]}
};
const featureKeys=['song','countdown','rsvp','wishes','guest_photos','audio_guestbook','auto_scroll'];

function status(text){$('#saveStatus').textContent=text;setTimeout(()=>{$('#saveStatus').textContent=''},2200)}
function serializable(){let x={...state};delete x._heroFile;delete x._galleryFiles;delete x._songFile;return x}
function cleanSlug(value){let v=String(value||'').trim().toLowerCase().replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');return v||`invite-${Math.random().toString(36).slice(2,8)}`}
function isDuplicateSlugError(err){return err?.code==='23505'&&String(err?.message||'').includes('invitations_slug_key')}
function isTemplatePreviewAsset(url=''){return /(?:^|\/)assets\/templates\//i.test(String(url))}
function customSections(){state.features_config={...(state.features_config||{})};if(!Array.isArray(state.features_config.custom_sections))state.features_config.custom_sections=[];return state.features_config.custom_sections}
function syncReturnedSlug(oldSlug){if($('#slug'))$('#slug').value=state.slug||'';if($('#slugStatus')){$('#slugStatus').textContent=state.slug!==oldSlug?(getLang()==='ar'?`الرابط كان مستخدمًا؛ اخترنا لك /${state.slug} تلقائيًا ✓`:`That link was taken; we changed it to /${state.slug} automatically ✓`):(getLang()==='ar'?`رابطك: /${state.slug}`:`Your link: /${state.slug}`);$('#slugStatus').className=state.slug!==oldSlug?'slug-status changed':'slug-status'}}
function persist(){saveLocalDraft(serializable());status(getLang()==='ar'?'محفوظ محليًا ✓':'Saved locally ✓')}

function fill(){
  const map={partner1_name:'#partner1',partner2_name:'#partner2',event_date:'#eventDate',venue_name:'#venue',city:'#city',map_url:'#mapUrl',message:'#message',slug:'#slug',accent:'#accent'};
  for(const [k,s] of Object.entries(map))if($(s))$(s).value=state[k]||'';
  render();
}

function bind(){
  const map={partner1_name:'#partner1',partner2_name:'#partner2',event_date:'#eventDate',venue_name:'#venue',city:'#city',map_url:'#mapUrl',message:'#message',slug:'#slug',accent:'#accent'};
  for(const [k,s] of Object.entries(map))$(s).addEventListener('input',e=>{
    state[k]=k==='slug'?cleanSlug(e.target.value):e.target.value;
    if(k==='slug'&&e.target.value!==state[k])e.target.value=state[k];
    saveLocalDraft(serializable());render();
  });
  $('#slug').addEventListener('blur',()=>{state.slug=cleanSlug(state.slug);$('#slug').value=state.slug;syncReturnedSlug(state.slug);saveLocalDraft(serializable())});
  $('#heroFile').onchange=e=>{const f=e.target.files?.[0];if(!f)return;state._heroFile=f;state.hero_image_url=URL.createObjectURL(f);$('#heroName').textContent=f.name;render()};
  $('#clearHero').onclick=()=>{delete state._heroFile;state.hero_image_url='';$('#heroFile').value='';$('#heroName').textContent=getLang()==='ar'?'خلفية القالب مفعلة':'Template background active';saveLocalDraft(serializable());render()};
  $('#galleryFiles').onchange=e=>{const files=[...(e.target.files||[])].slice(0,8);state._galleryFiles=files;state.gallery_urls=files.map(URL.createObjectURL);$('#galleryName').textContent=`${files.length} files`;render()};
  $('#songFile').onchange=e=>{const f=e.target.files?.[0];if(!f)return;state._songFile=f;state.song_url=URL.createObjectURL(f);$('#songName').textContent=f.name;render()};
  $('#saveDraft').onclick=saveDraft;$('#checkoutBtn').onclick=goCheckout;$('#topAction').onclick=goCheckout;$('#trialBtn').onclick=startTrial;$('#generateCopy').onclick=generateCopy;
  $('#addCustomSection').onclick=()=>addCustomSection($('#customSectionType').value);
  ['#heroFile','#galleryFiles','#songFile'].forEach(sel=>$(sel).addEventListener('click',e=>{if(!loggedIn){e.preventDefault();persist();location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search)}}));
  $$('[data-device]').forEach(btn=>btn.onclick=()=>{
    $$('[data-device]').forEach(x=>x.classList.toggle('active',x===btn));
    $('#builderDevice').classList.toggle('is-tablet',btn.dataset.device==='tablet');
  });
}

function renderTemplates(){
  const l=getLang();
  $('#builderTemplates').innerHTML=templates.slice(0,6).map(x=>`<button class="builder-template-option ${x.slug===state.template_slug?'active':''}" data-template="${x.slug}" title="${l==='ar'?x.name_ar:x.name_en}"><img src="${x.preview_image_url}" alt=""></button>`).join('');
  $$('[data-template]').forEach(b=>b.onclick=()=>{
    const x=templates.find(t=>t.slug===b.dataset.template);state.template_slug=x.slug;
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
    <div class="scroll-speed-control"><input id="scrollSpeed" type="range" min="20" max="120" step="4" value="${Number(state.features_config?.auto_scroll_speed||48)}"><output id="scrollSpeedValue">${Number(state.features_config?.auto_scroll_speed||48)} px/s</output></div>
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
  const p=customPresets[type]||customPresets.note;
  customSections().push({id:crypto.randomUUID?.()||`section-${Date.now()}`,type,icon:p.icon||'✦',title_ar:p.title_ar,title_en:p.title_en,body_ar:p.body_ar,body_en:p.body_en,button_label_ar:p.button_label_ar||'',button_label_en:p.button_label_en||'',url:p.url||'',layout:'card',enabled:true});
  saveLocalDraft(serializable());renderCustomEditor();render();
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
      <div><span class="custom-editor-icon">${x.icon||'✦'}</span><b>${l==='ar'?(x.title_ar||x.title_en):(x.title_en||x.title_ar)}</b><small>${x.type||'note'}</small></div>
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
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v=''){return escapeHtml(v).replace(/\n/g,' ')}

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
  const customPhoto=state.hero_image_url&&!isTemplatePreviewAsset(state.hero_image_url)?state.hero_image_url:'';
  $('#previewCoverArt').classList.toggle('has-user-photo',!!customPhoto);
  $('#previewCoverArt').style.backgroundImage=customPhoto?`linear-gradient(180deg,rgba(10,7,9,.06),rgba(10,7,9,.2)),url("${customPhoto}")`:'';
  $('#previewNames').textContent=`${state.partner1_name} & ${state.partner2_name}`;
  $('#previewNames2').textContent=`${state.partner1_name} & ${state.partner2_name}`;
  $('#previewDate').textContent=new Date(state.event_date).toLocaleString(getLang()==='ar'?'ar-EG':'en-GB',{dateStyle:'long',timeStyle:'short'});
  $('#previewVenue').textContent=`${state.venue_name}${state.city?' — '+state.city:''}`;
  $('#previewMessage').textContent=state.message;
  $('#previewGallery').innerHTML=(state.gallery_urls||[]).map(u=>`<img src="${u}" alt="">`).join('');
  renderCustomPreview();
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
    if(!sb){state.status='active';state.is_trial=true;state.active_until=new Date(Date.now()+86400000).toISOString();const rows=JSON.parse(localStorage.getItem('wedora_demo_invitations')||'[]');rows.unshift({...serializable(),id:editId,status:'active',is_trial:true});localStorage.setItem('wedora_demo_invitations',JSON.stringify(rows));location.href=`invitation.html?slug=${encodeURIComponent(state.slug)}`;return}
    const {error}=await sb.rpc('start_trial',{p_invitation_id:editId});if(error)throw error;location.href=`invitation.html?slug=${encodeURIComponent(state.slug)}`;
  }catch(e){alert(e.message||e)}
}

async function saveDraft(){
  persist();
  const user=await getUser();
  if(!user){location.href='auth.html?next='+encodeURIComponent(`builder.html${selectedPlan?'?plan='+selectedPlan:''}`);return}
  const p=await getProfile(user);
  if(p?.role==='admin'){alert(getLang()==='ar'?'استخدم حساب عميل لحفظ الدعوة.':'Use a customer account to save invitations.');return}
  const sb=await getSupabase();if(!sb)return;
  try{
    let hero=state.hero_image_url,gallery=(state.gallery_urls||[]).filter(x=>!x.startsWith('blob:')),song=state.song_url?.startsWith('blob:')?'':state.song_url;
    if(isTemplatePreviewAsset(hero))hero='';
    if(state._heroFile)hero=await uploadFile('invitation-media',state._heroFile,`${user.id}/hero`);
    if(state._galleryFiles?.length){gallery=[];for(const f of state._galleryFiles)gallery.push(await uploadFile('invitation-media',f,`${user.id}/gallery`))}
    if(state._songFile)song=await uploadFile('invitation-media',state._songFile,`${user.id}/music`);
    const requestedSlug=cleanSlug(state.slug);
    const makePayload=slug=>({user_id:user.id,template_slug:state.template_slug,slug,status:editId?(state.status||'draft'):'draft',language:getLang(),partner1_name:state.partner1_name,partner2_name:state.partner2_name,event_date:state.event_date,venue_name:state.venue_name,city:state.city,map_url:state.map_url||null,message:state.message,hero_image_url:hero||null,gallery_urls:gallery,song_url:song||null,theme_config:{accent:state.accent},features_config:{auto_scroll:true,auto_scroll_speed:48,custom_sections:[],...(state.features_config||{})}});
    let res=editId?await sb.from('invitations').update(makePayload(requestedSlug)).eq('id',editId).select('*').single():await sb.from('invitations').insert(makePayload(requestedSlug)).select('*').single();
    if(res.error&&isDuplicateSlugError(res.error)){
      const fallbackSlug=`${requestedSlug}-${Math.random().toString(36).slice(2,6)}`;
      res=editId?await sb.from('invitations').update(makePayload(fallbackSlug)).eq('id',editId).select('*').single():await sb.from('invitations').insert(makePayload(fallbackSlug)).select('*').single();
    }
    if(res.error)throw res.error;
    editId=res.data.id;Object.assign(state,res.data);state.features_config={custom_sections:[],...(state.features_config||{})};syncReturnedSlug(requestedSlug);saveLocalDraft(serializable());
    history.replaceState(null,'',`builder.html?id=${editId}${selectedPlan?'&plan='+selectedPlan:''}`);status(getLang()==='ar'?'تم حفظ المسودة ✓':'Draft saved ✓');return res.data;
  }catch(e){const friendly=isDuplicateSlugError(e)?(getLang()==='ar'?'الرابط مستخدم بالفعل. غيّر آخر جزء من رابط الدعوة وحاول تاني.':'That invitation link is already used. Change the final part and try again.'):(e.message||e);alert(friendly);throw e}
}

async function goCheckout(){
  try{await saveDraft();if(!editId)return;if(state.status==='active'&&!state.is_trial){alert(getLang()==='ar'?'تم حفظ تعديلات الدعوة المنشورة.':'Live invitation changes saved.');return}const next=selectedPlan?`checkout.html?plan=${encodeURIComponent(selectedPlan)}&invitation=${editId}`:`pricing.html?invitation=${editId}`;location.href=next}catch{}
}

async function boot(){
  loggedIn=!!(await getUser());
  const local=await currentDraft();if(local&&!editId&&!query.get('t')&&!query.get('new'))Object.assign(state,local);
  try{const dbt=await loadTemplates();if(dbt?.length)templates=dbt}catch{}
  if(editId){const user=await getUser();if(!user){location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);return}const sb=await getSupabase();if(sb){const {data,error}=await sb.from('invitations').select('*').eq('id',editId).maybeSingle();if(error)throw error;if(data)Object.assign(state,data)}}
  const qTemplate=query.get('t');if(qTemplate)state.template_slug=qTemplate;
  if(isTemplatePreviewAsset(state.hero_image_url))state.hero_image_url='';
  state.features_config={song:true,countdown:true,rsvp:true,wishes:true,guest_photos:true,audio_guestbook:true,auto_scroll:true,auto_scroll_speed:48,custom_sections:[],...(state.features_config||{})};
  renderTemplates();renderFeatures();renderCustomEditor();fill();bind();
}
window.addEventListener('wedora:language',()=>{renderFeatures();renderTemplates();renderCustomEditor();render()});
boot().catch(e=>alert(e.message));
