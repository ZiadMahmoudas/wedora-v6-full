import { requireCustomer,getSupabase,getPublicInvitationUrl,copyText,nativeShare,getDemoInvitationBySlug } from './supabase.js';
import { initI18n,getLang } from './i18n.js';
import { $ } from './utils.js';
initI18n();
const q=new URLSearchParams(location.search), slug=q.get('slug');
let invite,url;
function toast(text){const el=$('#shareToast');el.textContent=text;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,1800)}
async function boot(){
  const {user}=await requireCustomer();
  if(!slug){location.href='dashboard.html';return}
  const sb=await getSupabase();
  if(!sb){invite=getDemoInvitationBySlug(slug)||{id:'demo',slug,status:'active',partner1_name:'Ahmed',partner2_name:'Salma'};}
  else{
    const {data,error}=await sb.from('invitations').select('id,user_id,slug,status,partner1_name,partner2_name').eq('slug',slug).eq('user_id',user.id).maybeSingle();
    if(error)throw error;if(!data){location.href='dashboard.html';return}invite=data;
  }
  if(invite.status!=='active'){location.href=`builder.html?id=${encodeURIComponent(invite.id)}`;return}
  url=getPublicInvitationUrl(invite.slug);
  $('#shareNames').textContent=`${invite.partner1_name} & ${invite.partner2_name}`;
  $('#shareLink').value=url;
  $('#openInvite').href=url;
  $('#editInvite').href=`builder.html?id=${encodeURIComponent(invite.id)}`;
  $('#whatsappShare').href=`https://wa.me/?text=${encodeURIComponent((getLang()==='ar'?'دعوتنا 🤍 ':'Our invitation 🤍 ')+url)}`;
  $('#qrImage').src=`https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(url)}`;
  $('#copyShare').onclick=async()=>{await copyText(url);toast(getLang()==='ar'?'تم نسخ الرابط ✓':'Link copied ✓')};
  $('#copyQrLink').onclick=async()=>{await copyText(url);toast(getLang()==='ar'?'تم نسخ الرابط ✓':'Link copied ✓')};
  $('#nativeShare').onclick=async()=>{try{await nativeShare({title:`${invite.partner1_name} & ${invite.partner2_name}`,text:getLang()==='ar'?'يسعدنا حضوركم 🤍':'We would love to celebrate with you 🤍',url})}catch(e){if(e.name!=='AbortError')toast(e.message||String(e))}};
}
window.addEventListener('wedora:language',()=>{if(invite&&url)$('#whatsappShare').href=`https://wa.me/?text=${encodeURIComponent((getLang()==='ar'?'دعوتنا 🤍 ':'Our invitation 🤍 ')+url)}`});
boot().catch(e=>{console.error(e);toast(e.message||String(e))});
