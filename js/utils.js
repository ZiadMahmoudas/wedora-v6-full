export const $ = (selector, root=document) => root.querySelector(selector);
export const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);
}

export function escapeAttr(value=''){
  return escapeHtml(value).replace(/\r?\n/g,' ');
}

export function safeUrl(value=''){
  try{
    const url=new URL(value,location.href);
    return ['http:','https:'].includes(url.protocol)?url.href:'';
  }catch{return ''}
}

export function cleanSlug(value=''){
  const cleaned=String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff\s_-]/g,'')
    .replace(/[\s_]+/g,'-')
    .replace(/-+/g,'-')
    .replace(/^-|-$/g,'');
  return cleaned||`invite-${Math.random().toString(36).slice(2,8)}`;
}

export function randomId(prefix='id'){
  return globalThis.crypto?.randomUUID?.()||`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}

export function readJson(key,fallback=null){
  try{
    const raw=localStorage.getItem(key);
    return raw==null?fallback:JSON.parse(raw);
  }catch{return fallback}
}

export function writeJson(key,value){
  localStorage.setItem(key,JSON.stringify(value));
  return value;
}

export function isTemplatePreviewAsset(url=''){
  return /(?:^|\/)assets\/templates\//i.test(String(url));
}

export function mergeBySlug(fallback=[],remote=[]){
  const remoteBySlug=new Map((remote||[]).filter(Boolean).map(item=>[item.slug,item]));
  const fallbackSlugs=new Set(fallback.map(item=>item.slug));
  return [
    ...fallback.map(item=>({...item,...(remoteBySlug.get(item.slug)||{})})),
    ...(remote||[]).filter(item=>item?.slug&&!fallbackSlugs.has(item.slug))
  ];
}

export function activeSorted(items=[]){
  return items.filter(item=>item?.is_active!==false).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0));
}

export function formatDate(value,lang='ar',options={dateStyle:'long',timeStyle:'short'}){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  return date.toLocaleString(lang==='ar'?'ar-EG':'en-GB',options);
}

export function validateMediaFile(file,{kind="file",maxMB=10}={}){
  if(!file)throw new Error("No file selected.");
  const type=String(file.type||"").toLowerCase();
  if(kind==="image"&&!type.startsWith("image/"))throw new Error("Please choose an image file.");
  if(kind==="audio"&&!type.startsWith("audio/"))throw new Error("Please choose an audio file.");
  const maxBytes=maxMB*1024*1024;
  if(Number(file.size||0)>maxBytes)throw new Error(`File is too large. Maximum ${maxMB} MB.`);
  return file;
}

export function revokeObjectUrl(url){
  if(String(url||"").startsWith("blob:")){try{URL.revokeObjectURL(url)}catch{}}
}

export function clamp(value,min,max){
  return Math.min(Math.max(Number(value)||0,min),max);
}
