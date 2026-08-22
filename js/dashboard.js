import { getSupabase,requireCustomer,signOut,getActiveSubscription,getPublicInvitationUrl,copyText,nativeShare,listDemoInvitations } from './supabase.js';
import { initI18n,getLang,t } from './i18n.js';
import { $, $$, escapeHtml } from './utils.js';
initI18n();

let user,profile,invitations=[],selectedId=null,membership=null;
$('#logoutBtn').onclick=()=>signOut('index.html');

function fmtStatus(s){const l=getLang();const m={draft:['مسودة','Draft'],pending_review:['قيد المراجعة','Pending'],active:['منشورة','Live'],rejected:['مرفوضة','Rejected'],expired:['منتهية','Expired'],approved:['معتمد','Approved']};return (m[s]||[s,s])[l==='ar'?0:1]}
function invitationName(i){return `${i.partner1_name||'-'} & ${i.partner2_name||'-'}`}
function planName(){if(!membership)return '';const p=membership.plan||{};return getLang()==='ar'?(p.name_ar||membership.plan_name_ar||p.name_en):(p.name_en||membership.plan_name_en||p.name_ar)}

function renderMembership(){
  const l=getLang(),title=$('#membershipTitle'),text=$('#membershipText'),status=$('#membershipStatus'),cta=$('#membershipCta');
  if(!membership){
    title.textContent=l==='ar'?'مفيش اشتراك فعال':'No active membership';
    text.textContent=l==='ar'?'اختار خطة مرة واحدة للحساب. بعد اعتماد الدفع تقدر تنشر دعواتك من غير دفع جديد لكل دعوة.':'Choose one account plan. Once approved, publish invitations without paying again for each one.';
    status.className='status pending';status.textContent=l==='ar'?'غير فعال':'Inactive';
    cta.href='pricing.html';cta.innerHTML=l==='ar'?'اختار خطة':'Choose plan';
    return;
  }
  title.textContent=planName()||(l==='ar'?'اشتراك فعال':'Active membership');
  const end=membership.current_period_end?new Date(membership.current_period_end):null;
  text.textContent=membership.is_lifetime?(l==='ar'?'اشتراك مدى الحياة — انشر وشارك براحتك.':'Lifetime membership — publish and share anytime.'):(l==='ar'?`اشتراكك فعال حتى ${end?.toLocaleDateString('ar-EG')||'—'}.`:`Active until ${end?.toLocaleDateString('en-GB')||'—'}.`);
  status.className='status active';status.textContent=l==='ar'?'فعال ✓':'ACTIVE ✓';
  cta.href='builder.html?new=1';cta.innerHTML=l==='ar'?'＋ دعوة جديدة':'＋ New invitation';
}

function renderInvites(){
  const l=getLang(),mount=$('#inviteCards');
  if(!invitations.length){
    mount.innerHTML=`<div class="dashboard-empty-card"><b>${l==='ar'?'ابدأ أول دعوة':'Start your first invitation'}</b><p>${l==='ar'?'اختار قالب، عدّل البيانات، وبعدها انشر وشارك من نفس الحساب.':'Choose a template, edit it, then publish and share from the same account.'}</p><a class="btn btn-wine" href="builder.html?new=1">＋ ${l==='ar'?'دعوة جديدة':'New invitation'}</a></div>`;
    renderTabs();return;
  }

  mount.innerHTML=invitations.map(i=>{
    const live=i.status==='active';
    const url=live?getPublicInvitationUrl(i.slug):'';
    const date=new Date(i.event_date).toLocaleDateString(l==='ar'?'ar-EG':'en-GB');
    const expiry=i.is_lifetime?'∞ Lifetime':i.active_until?`${l==='ar'?'حتى':'until'} ${new Date(i.active_until).toLocaleDateString(l==='ar'?'ar-EG':'en-GB')}`:'';
    return `<article class="dashboard-invite-card ${live?'is-live':''}">
      <div class="dashboard-invite-cover template-${escapeHtml(i.template_slug||'classic-ivory')}"><span>${escapeHtml(i.partner1_name||'')}</span><i>&</i><span>${escapeHtml(i.partner2_name||'')}</span></div>
      <div class="dashboard-invite-body">
        <div class="dashboard-invite-top"><div><small>/${escapeHtml(i.slug)}</small><h3>${escapeHtml(invitationName(i))}</h3></div><span class="status ${escapeHtml(i.status)}">${escapeHtml(fmtStatus(i.status))}</span></div>
        <p>${escapeHtml(date)} · ${escapeHtml(i.venue_name||'')}</p>
        ${expiry?`<small class="invite-expiry">${escapeHtml(expiry)}</small>`:''}
        <div class="dashboard-invite-actions">
          <a class="mini-btn" href="builder.html?id=${encodeURIComponent(i.id)}">✎ ${l==='ar'?'تعديل':'Edit'}</a>
          ${live?`
            <a class="mini-btn primary" target="_blank" rel="noopener" href="${escapeHtml(url)}">↗ ${l==='ar'?'فتح':'Open'}</a>
            <button class="mini-btn" data-copy-url="${escapeHtml(url)}">⧉ ${l==='ar'?'نسخ الرابط':'Copy link'}</button>
            <button class="mini-btn" data-share-url="${escapeHtml(url)}" data-share-title="${escapeHtml(invitationName(i))}">⌁ ${l==='ar'?'مشاركة':'Share'}</button>
            <a class="mini-btn whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent((l==='ar'?'دعوتنا 🤍 ':'Our invitation 🤍 ')+url)}">WhatsApp</a>
            <a class="mini-btn" href="share.html?slug=${encodeURIComponent(i.slug)}">▦ ${l==='ar'?'صفحة الشير':'Share center'}</a>
          `:membership?`<a class="mini-btn primary" href="builder.html?id=${encodeURIComponent(i.id)}#publishSection">✓ ${l==='ar'?'كمّل وانشر':'Finish & publish'}</a>`:`<a class="mini-btn primary" href="pricing.html?invitation=${encodeURIComponent(i.id)}">${l==='ar'?'فعّل خطة':'Activate plan'}</a>`}
        </div>
      </div>
    </article>`;
  }).join('');

  $$('[data-copy-url]').forEach(b=>b.onclick=async()=>{try{await copyText(b.dataset.copyUrl);const old=b.textContent;b.textContent='✓ '+(l==='ar'?'اتنسخ':'Copied');setTimeout(()=>b.textContent=old,1400)}catch(e){alert(e.message||e)}});
  $$('[data-share-url]').forEach(b=>b.onclick=async()=>{try{await nativeShare({title:b.dataset.shareTitle,text:l==='ar'?'دعوتنا 🤍':'Our invitation 🤍',url:b.dataset.shareUrl})}catch(e){if(e.name!=='AbortError')alert(e.message||e)}});
  renderTabs();
}

function renderTabs(){
  const l=getLang(),mount=$('#guestInviteTabs');
  const list=invitations.filter(i=>['active','draft','pending_review'].includes(i.status));
  if(!selectedId&&list[0])selectedId=list[0].id;
  mount.innerHTML=list.map(i=>`<button class="tab-btn ${i.id===selectedId?'active':''}" data-invite="${i.id}">${escapeHtml(invitationName(i))}</button>`).join('');
  mount.querySelectorAll('[data-invite]').forEach(b=>b.onclick=()=>{selectedId=b.dataset.invite;renderTabs();loadGuests()});
  if(!list.length)$('#guestSummary').innerHTML=`<div class="empty">${l==='ar'?'أنشئ دعوة أولًا.':'Create an invitation first.'}</div>`;
}

async function loadGuests(){
  if(!selectedId)return;
  const sb=await getSupabase();
  if(!sb){$('#guestSummary').innerHTML='<div class="stat"><small>RSVP</small><strong>3</strong></div><div class="stat"><small>Memories</small><strong>4</strong></div>';$('#memoryGrid').innerHTML='';return}
  const [{data:r,error:rError},{data:m,error:mError}]=await Promise.all([
    sb.from('rsvps').select('*').eq('invitation_id',selectedId).order('created_at',{ascending:false}),
    sb.from('guest_memories').select('*').eq('invitation_id',selectedId).order('created_at',{ascending:false})
  ]);
  if(rError)throw rError;if(mError)throw mError;
  const yes=(r||[]).filter(x=>x.response==='yes').reduce((n,x)=>n+Number(x.guest_count||1),0);
  $('#guestSummary').innerHTML=`<div class="stat"><small>RSVP</small><strong>${(r||[]).length}</strong></div><div class="stat"><small>${getLang()==='ar'?'حضور مؤكد':'Confirmed guests'}</small><strong>${yes}</strong></div>`;
  $('#memoryGrid').innerHTML=(m||[]).length?(m||[]).map(x=>`<article class="memory-card">${x.type==='photo'?`<img src="${escapeHtml(x.media_url)}" alt="">`:x.type==='audio'?`<audio controls src="${escapeHtml(x.media_url)}"></audio>`:`<p>${escapeHtml(x.message||'')}</p>`}<b>${escapeHtml(x.guest_name||'Guest')}</b><br><span class="status ${x.approved?'active':'pending'}">${x.approved?(getLang()==='ar'?'معتمد':'Approved'):(getLang()==='ar'?'بانتظار الاعتماد':'Pending')}</span>${!x.approved?`<button class="mini-btn approve" data-approve="${x.id}" style="margin-top:8px">✓ ${getLang()==='ar'?'اعتماد':'Approve'}</button>`:''}</article>`).join(''):`<div class="empty">${getLang()==='ar'?'لا توجد ذكريات بعد.':'No guest memories yet.'}</div>`;
  $$('[data-approve]').forEach(b=>b.onclick=async()=>{await sb.from('guest_memories').update({approved:true}).eq('id',b.dataset.approve);loadGuests()});
}

async function refreshMembership(){
  const btn=$('#membershipRefresh');if(btn)btn.disabled=true;
  try{membership=await getActiveSubscription(user);renderMembership();renderInvites()}finally{if(btn)btn.disabled=false}
}

async function load(){
  ({user,profile}=await requireCustomer());
  $('#userName').textContent=profile?.full_name||user.email;
  $('#welcomeName').textContent=profile?.full_name||user.email.split('@')[0];
  $('#membershipRefresh').onclick=refreshMembership;
  membership=await getActiveSubscription(user);
  renderMembership();

  const sb=await getSupabase();
  if(!sb){
    invitations=listDemoInvitations();
    $('#statTotal').textContent=invitations.length;$('#statLive').textContent=invitations.filter(x=>x.status==='active').length;$('#statRsvp').textContent='0';$('#statPending').textContent='0';
    renderInvites();$('#paymentRows').innerHTML='<tr><td colspan="5"><div class="empty">Demo mode</div></td></tr>';return;
  }

  const [{data:inv,error:e1},{data:orders,error:e2}]=await Promise.all([
    sb.from('invitations').select('*,plan:plans(id,slug,name_ar,name_en)').eq('user_id',user.id).order('created_at',{ascending:false}),
    sb.from('orders').select('*,plan:plans(name_ar,name_en)').eq('user_id',user.id).order('created_at',{ascending:false})
  ]);
  if(e1)throw e1;if(e2)throw e2;
  invitations=inv||[];
  let rsvpCount=0;
  const invitationIds=invitations.map(x=>x.id).filter(Boolean);
  if(invitationIds.length){
    const {count,error:rsvpError}=await sb.from('rsvps').select('*',{count:'exact',head:true}).in('invitation_id',invitationIds);
    if(rsvpError)throw rsvpError;
    rsvpCount=count||0;
  }
  $('#statTotal').textContent=invitations.length;
  $('#statLive').textContent=invitations.filter(x=>x.status==='active').length;
  $('#statRsvp').textContent=rsvpCount;
  $('#statPending').textContent=(orders||[]).filter(x=>x.status==='pending_review').length;
  renderInvites();

  const l=getLang();
  $('#paymentRows').innerHTML=(orders||[]).length?(orders||[]).map(o=>`<tr><td><b>${String(o.id).slice(0,8).toUpperCase()}</b></td><td>${escapeHtml(o.plan?.[l==='ar'?'name_ar':'name_en']||'—')}</td><td>${Number(o.amount).toLocaleString('en-US')} ${escapeHtml(o.currency||'EGP')}</td><td><span class="status ${escapeHtml(o.status)}">${escapeHtml(fmtStatus(o.status))}</span>${o.admin_notes?`<br><small>${escapeHtml(o.admin_notes)}</small>`:''}</td><td>${new Date(o.created_at).toLocaleDateString(l==='ar'?'ar-EG':'en-GB')}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty">${l==='ar'?'لا توجد مدفوعات بعد.':'No payments yet.'}</div></td></tr>`;
  loadGuests();
}

$('#refreshGuests').onclick=loadGuests;
window.addEventListener('wedora:language',()=>{renderMembership();renderInvites();loadGuests()});
load().catch(e=>{console.error(e);$('.app-content').insertAdjacentHTML('afterbegin',`<div class="panel error">${escapeHtml(e.message)}</div>`)});
