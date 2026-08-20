import { CONFIG } from './config.js';
import { getSupabase,getInvitationBySlug,uploadFile } from './supabase.js';
import { fallbackExamples,fallbackTemplates } from './data.js';
import { initI18n,getLang,t } from './i18n.js';
initI18n();

const $=s=>document.querySelector(s);
const q=new URLSearchParams(location.search);
const slug=q.get('slug')||'ahmed-salma';
let invite=null,recorder,chunks=[],recordTimer=null,recordTicker=null,memoryChannel=null,memoryPoll=null;
let autoScrollRaf=null,autoScrollActive=false,autoScrollResumeTimer=null,gateOpened=false,autoScrollCompleted=false,autoScrollManuallyDisabled=false,autoScrollPosition=0;

function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function safeUrl(v=''){try{const u=new URL(v,location.href);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}}
function isTemplatePreviewAsset(url=''){return /(?:^|\/)assets\/templates\//i.test(String(url))}
function customSections(){return Array.isArray(invite?.features_config?.custom_sections)?invite.features_config.custom_sections.filter(x=>x&&x.enabled!==false):[]}

function demoInvite(){
  const ex=fallbackExamples.find(x=>x.slug===slug)||fallbackExamples[0];
  const tmpl=fallbackTemplates.find(x=>x.slug===ex.template_slug)||fallbackTemplates[0];
  return {
    id:'demo',slug:ex.slug,status:'active',template_slug:ex.template_slug,
    partner1_name:ex.name1_ar,partner2_name:ex.name2_ar,event_date:ex.date,
    venue_name:ex.venue_ar,city:ex.city_ar,map_url:'https://maps.google.com',
    message:'نتشرف بمشاركتكم أجمل لحظاتنا، ويسعدنا وجودكم معنا في هذا اليوم.',
    hero_image_url:'',gallery_urls:[],song_url:'',theme_config:{accent:tmpl.accent},
    features_config:{song:true,countdown:true,rsvp:true,wishes:true,guest_photos:true,audio_guestbook:true,auto_scroll:true,custom_sections:[
      {id:'demo-1',type:'schedule',icon:'🕰',title_ar:'برنامج اليوم',title_en:'The schedule',body_ar:'٧:٠٠ م — استقبال الضيوف\n٨:٠٠ م — بداية الاحتفال',body_en:'7:00 PM — Guest arrival\n8:00 PM — Celebration begins',layout:'card',enabled:true},
      {id:'demo-2',type:'dress_code',icon:'✦',title_ar:'Dress Code',title_en:'Dress code',body_ar:'ألوان هادئة ورسمي بسيط',body_en:'Soft tones · smart formal',layout:'card',enabled:true}
    ]}
  };
}

function applyTemplateVisuals(){
  const cls=`template-${invite.template_slug||'classic-ivory'}`;
  $('#inviteMain').className=`invite-main ${cls}`;
  $('#gate').className=`invitation-gate ${cls}${gateOpened?' open':''}`;
  $('#inviteMain').style.setProperty('--accent',invite.theme_config?.accent||'#9b6f48');

  const customPhoto=invite.hero_image_url&&!isTemplatePreviewAsset(invite.hero_image_url)?invite.hero_image_url:'';
  const heroArt=$('#inviteHeroArt'),gateArt=$('#gateArt');
  [heroArt,gateArt].forEach(el=>{
    el.classList.toggle('has-user-photo',!!customPhoto);
    el.style.backgroundImage=customPhoto?`linear-gradient(180deg,rgba(10,7,9,.08),rgba(10,7,9,.32)),url("${customPhoto}")`:'';
  });
}

function renderCustomSections(){
  const rows=customSections();
  const host=$('#customSectionsHost'),section=$('#customSectionsSection');
  if(!rows.length){section.hidden=true;host.innerHTML='';return}
  section.hidden=false;
  const lang=getLang();
  host.innerHTML=rows.map((x,index)=>{
    const title=lang==='ar'?(x.title_ar||x.title_en):(x.title_en||x.title_ar);
    const body=lang==='ar'?(x.body_ar||x.body_en):(x.body_en||x.body_ar);
    const button=lang==='ar'?(x.button_label_ar||x.button_label_en):(x.button_label_en||x.button_label_ar);
    const url=safeUrl(x.url||'');
    const lines=escapeHtml(body||'').replace(/\n/g,'<br>');
    return `<article class="invite-custom-card ${x.layout==='wide'?'wide':''}" data-custom-type="${escapeHtml(x.type||'note')}">
      <div class="invite-custom-icon">${escapeHtml(x.icon||'✦')}</div>
      <small>${String(index+1).padStart(2,'0')}</small>
      <h3>${escapeHtml(title||'')}</h3>
      <p>${lines}</p>
      ${url&&button?`<a class="invite-custom-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(button)} ↗</a>`:''}
    </article>`;
  }).join('');
}

function render(){
  const names=`${invite.partner1_name} & ${invite.partner2_name}`;
  document.title=`${names} — WEDORA`;
  document.querySelectorAll('[data-names]').forEach(x=>x.textContent=names);
  document.querySelectorAll('[data-date]').forEach(x=>x.textContent=new Date(invite.event_date).toLocaleString(getLang()==='ar'?'ar-EG':'en-GB',{dateStyle:'long',timeStyle:'short'}));
  $('[data-message]').textContent=invite.message||'';
  $('[data-venue]').textContent=invite.venue_name||'';
  $('[data-city]').textContent=invite.city||'';
  applyTemplateVisuals();
  renderCustomSections();
  $('#mapLink').hidden=!invite.map_url;if(invite.map_url)$('#mapLink').href=invite.map_url;
  const f=invite.features_config||{};
  $('#countdown').hidden=f.countdown===false;
  $('#rsvpSection').hidden=f.rsvp===false;
  $('#wishesSection').hidden=f.wishes===false;
  $('#photosSection').hidden=f.guest_photos===false;
  $('#audioSection').hidden=f.audio_guestbook===false;
  $('#musicBtn').hidden=!invite.song_url||f.song===false;
  if(invite.song_url)$('#inviteAudio').src=invite.song_url;
  startCountdown();loadMemories();
}

function startCountdown(){
  clearInterval(window.__cd);
  const tick=()=>{
    const diff=Math.max(0,new Date(invite.event_date).getTime()-Date.now());
    $('#cdDays').textContent=Math.floor(diff/86400000);
    $('#cdHours').textContent=Math.floor(diff/3600000)%24;
    $('#cdMinutes').textContent=Math.floor(diff/60000)%60;
    $('#cdSeconds').textContent=Math.floor(diff/1000)%60;
  };
  tick();window.__cd=setInterval(tick,1000);
}

function setAutoScrollUi(mode){
  const pill=$('#autoScrollState'),text=$('#autoScrollText');
  if(!gateOpened||invite?.features_config?.auto_scroll===false){pill.hidden=true;return}
  pill.hidden=false;
  pill.dataset.state=mode;
  text.textContent=mode==='active'?'AUTO ↓':mode==='paused'?(getLang()==='ar'?'متوقف مؤقتًا':'PAUSED'):(getLang()==='ar'?'تشغيل النزول':'AUTO ↓');
}
function clearResumeTimer(){if(autoScrollResumeTimer){clearTimeout(autoScrollResumeTimer);autoScrollResumeTimer=null}}
function stopAutoScroll({resume=false,delay=3000}={}){
  autoScrollActive=false;
  if(autoScrollRaf){cancelAnimationFrame(autoScrollRaf);autoScrollRaf=null}
  clearResumeTimer();
  if(gateOpened&&!autoScrollCompleted&&!autoScrollManuallyDisabled)setAutoScrollUi('paused');
  if(resume&&gateOpened&&!autoScrollCompleted&&!autoScrollManuallyDisabled){
    autoScrollResumeTimer=setTimeout(()=>{
      if(!document.querySelector('input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus'))startGentleAutoScroll();
    },delay);
  }
}
function startGentleAutoScroll(){
  if(!gateOpened||autoScrollCompleted||autoScrollManuallyDisabled)return;
  if(invite?.features_config?.auto_scroll===false||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(document.querySelector('input:focus,textarea:focus,select:focus,[contenteditable="true"]:focus'))return;

  stopAutoScroll();
  autoScrollActive=true;
  autoScrollPosition=Math.max(0,window.scrollY||document.documentElement.scrollTop||0);
  setAutoScrollUi('active');

  let last=performance.now();
  const configured=Number(invite?.features_config?.auto_scroll_speed||48);
  const speed=Math.min(Math.max(configured,20),120);

  const frame=now=>{
    if(!autoScrollActive)return;

    const dt=Math.min((now-last)/1000,.06);
    last=now;

    const end=Math.max(0,document.documentElement.scrollHeight-innerHeight-24);
    if(autoScrollPosition>=end-2){
      autoScrollCompleted=true;
      scrollTo({top:end,behavior:'auto'});
      stopAutoScroll();
      setAutoScrollUi('idle');
      return;
    }

    // Keep a floating-point position. Using scrollY directly loses sub-pixel
    // movement at calm speeds and can make the page look completely stuck.
    autoScrollPosition=Math.min(end,autoScrollPosition+(speed*dt));
    window.scrollTo(0,autoScrollPosition);
    autoScrollRaf=requestAnimationFrame(frame);
  };

  autoScrollRaf=requestAnimationFrame(frame);
}
function userInterrupted(delay=1800){
  if(!gateOpened)return;
  autoScrollPosition=window.scrollY||document.documentElement.scrollTop||0;
  stopAutoScroll({resume:true,delay});
}
['wheel','touchstart','touchmove','pointerdown','keydown'].forEach(evt=>addEventListener(evt,e=>{
  if(e.target?.closest?.('#autoScrollState'))return;
  const interactive=e.target?.closest?.('input,textarea,select,button,a,audio,label');
  userInterrupted(interactive?4800:1800);
},{passive:true}));
addEventListener('focusin',e=>{
  if(e.target.matches?.('input,textarea,select,[contenteditable="true"]')){
    autoScrollPosition=window.scrollY||document.documentElement.scrollTop||0;
    stopAutoScroll();
  }
});
addEventListener('focusout',e=>{
  if(e.target.matches?.('input,textarea,select,[contenteditable="true"]'))userInterrupted(2200)
});

$('#autoScrollState').onclick=e=>{
  e.stopPropagation();
  if(autoScrollActive){autoScrollManuallyDisabled=true;stopAutoScroll();setAutoScrollUi('idle')}
  else{autoScrollManuallyDisabled=false;autoScrollCompleted=false;startGentleAutoScroll()}
};

$('#gateOpen').onclick=async()=>{
  gateOpened=true;document.body.classList.add('invite-opened');$('#gate').classList.add('open');
  try{if($('#inviteAudio').src)await $('#inviteAudio').play()}catch{}
  setTimeout(startGentleAutoScroll,650);
};
$('#musicBtn').onclick=async()=>{const a=$('#inviteAudio');if(a.paused)await a.play();else a.pause()};

document.querySelectorAll('[data-response]').forEach(b=>b.onclick=()=>{
  userInterrupted(4500);
  document.querySelectorAll('[data-response]').forEach(x=>x.classList.toggle('active',x===b));
  $('#rsvpForm').response.value=b.dataset.response;
});
$('#rsvpForm').onsubmit=async e=>{
  e.preventDefault();userInterrupted(6000);
  const form=e.currentTarget,msg=e.currentTarget.querySelector('[data-rsvp-msg]');
  try{
    const sb=await getSupabase();
    if(sb){const {error}=await sb.from('rsvps').insert({invitation_id:invite.id,guest_name:form.guest_name.value.trim(),response:form.response.value,guest_count:Number(form.guest_count.value||1),message:form.message.value.trim()||null});if(error)throw error}
    msg.className='success';msg.textContent=getLang()==='ar'?'وصل تأكيدك 🤍':'RSVP received 🤍';form.reset();form.response.value='yes';
  }catch(err){msg.className='error';msg.textContent=err.message}
};

const wishText=$('#wishForm textarea[name="message"]');
if(wishText)wishText.addEventListener('input',()=>{$('#wishCount').textContent=wishText.value.length});
$('#wishForm').onsubmit=async e=>{
  e.preventDefault();userInterrupted(6000);
  const form=e.currentTarget,status=$('#wishStatus'),message=form.message.value.trim();if(!message)return;
  try{
    const sb=await getSupabase();
    const guestName=form.guest_name.value.trim()||(getLang()==='ar'?'ضيف':'Guest');
    if(sb){const {error}=await sb.from('guest_memories').insert({invitation_id:invite.id,type:'wish',guest_name:guestName,message,approved:true});if(error)throw error}
    status.className='success';status.textContent=getLang()==='ar'?'كلمتك نزلت تحت فورًا 🤍':'Your note is live below 🤍';
    form.reset();$('#wishCount').textContent='0';await loadMemories({scrollToEnd:true});
  }catch(err){status.className='error';status.textContent=err.message}
};

$('#guestPhoto').onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;userInterrupted(6500);
  const name=$('#photoGuestName').value.trim()||(getLang()==='ar'?'ضيف':'Guest');
  try{
    const sb=await getSupabase();if(!sb){$('#photoMsg').textContent='Demo upload ✓';return}
    const url=await uploadFile('guest-media',f,`${invite.id}/photos`);
    const {error}=await sb.from('guest_memories').insert({invitation_id:invite.id,type:'photo',guest_name:name,media_url:url,approved:false});if(error)throw error;
    $('#photoMsg').textContent=getLang()==='ar'?'اترفعت وهتظهر بعد الاعتماد ✓':'Uploaded — it will appear after approval ✓';
  }catch(err){$('#photoMsg').textContent=err.message}
};

function resetRecordUi(){clearTimeout(recordTimer);clearInterval(recordTicker);recordTimer=recordTicker=null;$('#recordBtn').textContent=t('invite_record',getLang())}
$('#recordBtn').onclick=async()=>{
  userInterrupted(8000);
  try{
    if(recorder&&recorder.state==='recording'){recorder.stop();return}
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];let remaining=20;
    recorder=new MediaRecorder(stream);
    recorder.ondataavailable=e=>chunks.push(e.data);
    recorder.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());resetRecordUi();
      const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'}),file=new File([blob],`voice-${Date.now()}.webm`,{type:blob.type});
      $('#recordStatus').textContent=getLang()==='ar'?'جاري الإرسال…':'Sending…';
      try{
        const sb=await getSupabase();
        if(sb){const url=await uploadFile('guest-media',file,`${invite.id}/audio`);const {error}=await sb.from('guest_memories').insert({invitation_id:invite.id,type:'audio',guest_name:$('#audioGuestName').value.trim()||(getLang()==='ar'?'ضيف':'Guest'),media_url:url,approved:false});if(error)throw error}
        $('#recordStatus').textContent=getLang()==='ar'?'وصلت ✓ وهتظهر بعد اعتماد الأدمن':'Received ✓ Pending moderation';
      }catch(e){$('#recordStatus').textContent=e.message}
    };
    recorder.start();$('#recordBtn').textContent=t('invite_stop',getLang());$('#recordStatus').textContent=getLang()==='ar'?`جاري التسجيل… ${remaining} ثانية`:`Recording… ${remaining}s`;
    recordTicker=setInterval(()=>{remaining-=1;$('#recordStatus').textContent=getLang()==='ar'?`جاري التسجيل… ${Math.max(remaining,0)} ثانية`:`Recording… ${Math.max(remaining,0)}s`},1000);
    recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop()},20000);
  }catch(err){resetRecordUi();$('#recordStatus').textContent=err.message}
};

async function loadMemories({scrollToEnd=false}={}){
  const sb=await getSupabase();
  if(!sb){$('#wishesList').innerHTML='<article class="wish-card"><p>ربنا يسعدكم ويكمل لكم على خير 🤍</p><small>Guest</small></article>';return}
  const {data,error}=await sb.from('guest_memories').select('*').eq('invitation_id',invite.id).eq('approved',true).order('created_at',{ascending:true});if(error)return;
  const rows=data||[],wishes=rows.filter(x=>x.type==='wish');
  $('#wishesList').innerHTML=wishes.length?wishes.map(x=>`<article class="wish-card"><p>${escapeHtml(x.message||'')}</p><small>${escapeHtml(x.guest_name||(getLang()==='ar'?'ضيف':'Guest'))}</small></article>`).join(''):`<div class="guest-wall-empty">${getLang()==='ar'?'اكتب أول كلمة 🤍':'Be the first to leave a note 🤍'}</div>`;
  $('#guestGallery').innerHTML=rows.filter(x=>x.type==='photo').map(x=>`<img src="${escapeHtml(x.media_url||'')}" alt="">`).join('');
  $('#audioList').innerHTML=rows.filter(x=>x.type==='audio').map(x=>`<div class="audio-item"><small>${escapeHtml(x.guest_name||(getLang()==='ar'?'ضيف':'Guest'))}</small><audio controls preload="metadata" src="${escapeHtml(x.media_url||'')}"></audio></div>`).join('');
  if(scrollToEnd&&wishes.length){const last=$('#wishesList').lastElementChild;last?.scrollIntoView({behavior:'smooth',block:'nearest'})}
}

async function subscribeMemories(){
  const sb=await getSupabase();if(!sb||!invite?.id||invite.id==='demo')return;
  try{
    memoryChannel=sb.channel(`guest-wall-${invite.id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'guest_memories',filter:`invitation_id=eq.${invite.id}`},payload=>{if(payload.new?.approved)loadMemories({scrollToEnd:true})})
      .subscribe(status=>{if($('#wishLiveState'))$('#wishLiveState').textContent=status==='SUBSCRIBED'?'● LIVE':'●';});
  }catch{}
  clearInterval(memoryPoll);memoryPoll=setInterval(()=>loadMemories(),12000);
}

async function boot(){
  try{
    invite=await getInvitationBySlug(slug);
    if(!invite&&CONFIG.DEMO_MODE)invite=demoInvite();
    if(!invite){document.body.innerHTML=`<div style="text-align:center;padding:20vh 20px;font-family:system-ui"><h1>${getLang()==='ar'?'الدعوة غير متاحة':'Invitation unavailable'}</h1><p>${getLang()==='ar'?'قد تكون ما زالت قيد مراجعة الدفع أو انتهت مدتها.':'It may still be pending payment review or has expired.'}</p></div>`;return}
    invite.features_config={auto_scroll:true,custom_sections:[],...(invite.features_config||{})};
    render();subscribeMemories();
  }catch(e){console.error(e)}
}
window.addEventListener('wedora:language',()=>{render();setAutoScrollUi(autoScrollActive?'active':'paused')});
boot();
