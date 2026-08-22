export const DEFAULT_FEATURES = Object.freeze({
  song:true,
  countdown:true,
  rsvp:true,
  wishes:true,
  guest_photos:true,
  audio_guestbook:true,
  auto_scroll:true,
  auto_scroll_speed:38,
  story_cover_style:'photo-card',
  story_cover_position:50,
  story_cover_overlay:20,
  custom_sections:[]
});

export const STORY_COVER_STYLES = Object.freeze([
  {id:'photo-card',name_ar:'Photo Card',name_en:'Photo Card',desc_ar:'صورة كبيرة مدوّرة مع أسماء فوقها.',desc_en:'Rounded hero photo with elegant overlay.',icon:'▣'},
  {id:'arch-photo',name_ar:'Arch',name_en:'Arch',desc_ar:'قوس فاخر للصورة ولمسة كلاسيك.',desc_en:'Elegant arched photo frame.',icon:'⌒'},
  {id:'editorial-film',name_ar:'Editorial',name_en:'Editorial',desc_ar:'ستايل مجلة مع خطوط وتفاصيل جانبية.',desc_en:'Magazine-style composition with editorial lines.',icon:'E'},
  {id:'botanical-halo',name_ar:'Botanical',name_en:'Botanical',desc_ar:'إطار ناعم مستوحى من الزهور والأوراق.',desc_en:'Soft botanical halo around the image.',icon:'❦'},
  {id:'paper-frame',name_ar:'Paper',name_en:'Paper',desc_ar:'صورة داخل ورقة ناعمة وملمس هادئ.',desc_en:'Soft paper-frame treatment.',icon:'▱'},
  {id:'full-bleed',name_ar:'Full Photo',name_en:'Full Photo',desc_ar:'الصورة تملأ بداية الاستوري بالكامل.',desc_en:'Full-bleed cinematic opening.',icon:'◫'},
  {id:'blank-luxe',name_ar:'Blank',name_en:'Blank',desc_ar:'بدون صورة — Typography وزخرفة فقط.',desc_en:'No photo — typography and ornaments only.',icon:'✦'}
]);

export const CUSTOM_SECTION_PRESETS = Object.freeze({
  schedule:{icon:'🕰',title_ar:'برنامج اليوم',title_en:'The schedule',body_ar:'٧:٠٠ م — استقبال الضيوف\n٨:٠٠ م — بداية الاحتفال',body_en:'7:00 PM — Guest arrival\n8:00 PM — Celebration begins'},
  dress_code:{icon:'✦',title_ar:'Dress Code',title_en:'Dress code',body_ar:'ألوان هادئة ورسمي بسيط',body_en:'Soft tones · smart formal'},
  transport:{icon:'↗',title_ar:'الوصول والمواصلات',title_en:'Getting there',body_ar:'اكتب نقطة التجمع أو تفاصيل المواصلات هنا.',body_en:'Add pickup points or transport details here.'},
  accommodation:{icon:'⌂',title_ar:'الإقامة',title_en:'Stay nearby',body_ar:'اكتب اسم الفندق أو تفاصيل الإقامة للضيوف.',body_en:'Add hotel or accommodation details for guests.'},
  gift:{icon:'♡',title_ar:'الهدايا',title_en:'Gifts',body_ar:'وجودكم هو أجمل هدية. ولو حابين تضيفوا ملاحظة خاصة اكتبوا هنا.',body_en:'Your presence is the best gift. Add any special note here.'},
  story:{icon:'∞',title_ar:'قصتنا',title_en:'Our story',body_ar:'اكتبوا سطرين صغيرين عن حكايتكم أو اللحظة اللي جمعتكم.',body_en:'Share a short note about your story or how it all began.'},
  note:{icon:'✉',title_ar:'ملاحظة للضيوف',title_en:'A note for our guests',body_ar:'اكتب أي معلومة مهمة للضيوف هنا.',body_en:'Add any important information for your guests here.'},
  link:{icon:'↗',title_ar:'لينك مهم',title_en:'Useful link',body_ar:'أضف وصفًا قصيرًا للينك.',body_en:'Add a short description for this link.',button_label_ar:'فتح الرابط',button_label_en:'Open link',url:'https://'}
});

export function normalizeFeatures(config={}){
  const custom=Array.isArray(config?.custom_sections)?config.custom_sections:[];
  return {...DEFAULT_FEATURES,...(config||{}),custom_sections:custom};
}

export function createDefaultDraft(templateSlug='classic-ivory'){
  return {
    template_slug:templateSlug,
    partner1_name:'أحمد',
    partner2_name:'سلمى',
    event_date:'2026-12-12T19:00',
    venue_name:'قاعة الاحتفال',
    city:'القاهرة',
    map_url:'',
    message:'نتشرف بمشاركتكم أجمل لحظاتنا، ويسعدنا وجودكم معنا في هذا اليوم.',
    slug:`invite-${Math.random().toString(36).slice(2,8)}`,
    accent:'#9b6f48',
    hero_image_url:'',
    gallery_urls:[],
    song_url:'',
    features_config:normalizeFeatures()
  };
}
