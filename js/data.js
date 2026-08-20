export const fallbackTemplates = [
  {slug:'classic-ivory',name_ar:'العاج الكلاسيكي',name_en:'Classic Ivory',category:'wedding',preview_image_url:'assets/templates/classic-ivory.jpg',accent:'#9b6f48',background:'#f3eadc',is_active:true,sort_order:10},
  {slug:'editorial-noir',name_ar:'نوير التحريري',name_en:'Editorial Noir',category:'wedding',preview_image_url:'assets/templates/editorial-noir.jpg',accent:'#781f37',background:'#f4f0e8',is_active:true,sort_order:20},
  {slug:'botanical-sage',name_ar:'حديقة السيج',name_en:'Botanical Sage',category:'engagement',preview_image_url:'assets/templates/botanical-sage.jpg',accent:'#8a6c45',background:'#e9eddf',is_active:true,sort_order:30},
  {slug:'moonlight-navy',name_ar:'ليلة كحلية',name_en:'Moonlight Navy',category:'katb-ketab',preview_image_url:'assets/templates/moonlight-navy.jpg',accent:'#bfc8d8',background:'#0f203a',is_active:true,sort_order:40},
  {slug:'royal-arabesque',name_ar:'أرابيسك ملكي',name_en:'Royal Arabesque',category:'wedding',preview_image_url:'assets/templates/royal-arabesque.jpg',accent:'#d6a750',background:'#5b0017',is_active:true,sort_order:50},
  {slug:'minimal-blush',name_ar:'بلَش مينيمال',name_en:'Minimal Blush',category:'engagement',preview_image_url:'assets/templates/minimal-blush.jpg',accent:'#b8767c',background:'#f0e1df',is_active:true,sort_order:60}
];

export const fallbackPlans = [
  {
    slug:'silver',name_ar:'الفضية',name_en:'Silver',
    description_ar:'رابط دعوتك يفضل شغال سنة كاملة مع أهم أدوات إدارة الضيوف.',
    description_en:'Your invitation stays live for one full year with the essential guest tools.',
    reference_price:null,price:750,duration_months:12,is_lifetime:false,is_featured:false,is_active:true,sort_order:10,
    features:['custom_link','song','countdown','rsvp','wishes','guest_photos','edit_anytime']
  },
  {
    slug:'golden',name_ar:'الذهبية',name_en:'Golden',
    description_ar:'كل المميزات بدون تاريخ انتهاء، مع الرسائل الصوتية وألبوم الذكريات الكامل.',
    description_en:'Every feature with no expiry, including audio guestbook and the full memories album.',
    reference_price:null,price:1250,duration_months:null,is_lifetime:true,is_featured:true,is_active:true,sort_order:20,
    features:['custom_link','song','countdown','rsvp','wishes','guest_photos','audio_guestbook','edit_anytime','lifetime']
  }
];

export const fallbackExamples = [
 {slug:'ahmed-salma',template_slug:'classic-ivory',name1_ar:'أحمد',name2_ar:'سلمى',name1_en:'Ahmed',name2_en:'Salma',city_ar:'القاهرة',city_en:'Cairo',venue_ar:'قاعة النيل الكبرى',venue_en:'Grand Nile Hall',date:'2026-09-12T19:30:00'},
 {slug:'omar-nour',template_slug:'editorial-noir',name1_ar:'عمر',name2_ar:'نور',name1_en:'Omar',name2_en:'Nour',city_ar:'الإسكندرية',city_en:'Alexandria',venue_ar:'سان ستيفانو',venue_en:'San Stefano',date:'2026-10-05T19:00:00'},
 {slug:'youssef-mariam',template_slug:'botanical-sage',name1_ar:'يوسف',name2_ar:'مريم',name1_en:'Youssef',name2_en:'Mariam',city_ar:'الجيزة',city_en:'Giza',venue_ar:'حديقة الأندلس',venue_en:'Al Andalus Garden',date:'2026-11-20T18:30:00'},
 {slug:'khaled-farah',template_slug:'moonlight-navy',name1_ar:'خالد',name2_ar:'فرح',name1_en:'Khaled',name2_en:'Farah',city_ar:'الغردقة',city_en:'Hurghada',venue_ar:'شاطئ السهرة',venue_en:'Sahra Beach',date:'2026-12-03T20:00:00'},
 {slug:'tarek-hana',template_slug:'royal-arabesque',name1_ar:'طارق',name2_ar:'هنا',name1_en:'Tarek',name2_en:'Hana',city_ar:'القاهرة الجديدة',city_en:'New Cairo',venue_ar:'قصر النخيل',venue_en:'Palm Palace',date:'2026-12-18T20:30:00'},
 {slug:'seif-jana',template_slug:'minimal-blush',name1_ar:'سيف',name2_ar:'جنى',name1_en:'Seif',name2_en:'Jana',city_ar:'المنصورة',city_en:'Mansoura',venue_ar:'دار الضيافة',venue_en:'The Guest House',date:'2027-01-09T19:00:00'}
];

export const featureLabels = {
  custom_link:{ar:'رابط مخصص',en:'Custom invitation link'},
  song:{ar:'أغنية على الدعوة',en:'Invitation song'},
  countdown:{ar:'عد تنازلي',en:'Countdown'},
  rsvp:{ar:'تأكيد حضور RSVP',en:'RSVP'},
  wishes:{ar:'تهاني الضيوف',en:'Guest wishes'},
  guest_photos:{ar:'ألبوم صور الضيوف',en:'Guest photo album'},
  audio_guestbook:{ar:'رسائل صوتية قصيرة من الضيوف',en:'Short audio guestbook'},
  auto_scroll:{ar:'نزول تلقائي هادئ عند فتح الدعوة',en:'Gentle auto-scroll after opening'},
  edit_anytime:{ar:'تعديل الدعوة في أي وقت',en:'Edit anytime'},
  lifetime:{ar:'بدون تاريخ انتهاء',en:'No expiry'}
};
