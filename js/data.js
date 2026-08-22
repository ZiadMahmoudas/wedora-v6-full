export const fallbackTemplates = [
  {slug:'classic-ivory',name_ar:'أتلييه عاجي',name_en:'Ivory Atelier',category:'wedding',preview_image_url:'assets/templates/classic-ivory.jpg',accent:'#9c7751',background:'#f4eee5',is_active:true,sort_order:10},
  {slug:'editorial-noir',name_ar:'بوردو إديتوريال',name_en:'Bordeaux Editorial',category:'wedding',preview_image_url:'assets/templates/editorial-noir.jpg',accent:'#7d203f',background:'#f2eee7',is_active:true,sort_order:20},
  {slug:'botanical-sage',name_ar:'سيج بوتانيكا',name_en:'Sage Botanica',category:'engagement',preview_image_url:'assets/templates/botanical-sage.jpg',accent:'#7b653e',background:'#e9eddf',is_active:true,sort_order:30},
  {slug:'moonlight-navy',name_ar:'كوكبات منتصف الليل',name_en:'Midnight Constellation',category:'katb-ketab',preview_image_url:'assets/templates/moonlight-navy.jpg',accent:'#c7c1ae',background:'#0c1727',is_active:true,sort_order:40},
  {slug:'royal-arabesque',name_ar:'أرابيسك ملكي',name_en:'Royal Arabesque',category:'wedding',preview_image_url:'assets/templates/royal-arabesque.jpg',accent:'#d0a255',background:'#500716',is_active:true,sort_order:50},
  {slug:'minimal-blush',name_ar:'بيرل بلَش',name_en:'Pearl Blush',category:'engagement',preview_image_url:'assets/templates/minimal-blush.jpg',accent:'#a56b77',background:'#f3e5e2',is_active:true,sort_order:60},
  {slug:'desert-pearl',name_ar:'لؤلؤة الصحراء',name_en:'Desert Pearl',category:'wedding',preview_image_url:'assets/templates/desert-pearl.jpg',accent:'#9c7b4f',background:'#e9ddca',is_active:true,sort_order:70},
  {slug:'emerald-majlis',name_ar:'مجلس زمردي',name_en:'Emerald Majlis',category:'katb-ketab',preview_image_url:'assets/templates/emerald-majlis.jpg',accent:'#c4a569',background:'#0c352f',is_active:true,sort_order:80}
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
 {slug:'seif-jana',template_slug:'minimal-blush',name1_ar:'سيف',name2_ar:'جنى',name1_en:'Seif',name2_en:'Jana',city_ar:'المنصورة',city_en:'Mansoura',venue_ar:'دار الضيافة',venue_en:'The Guest House',date:'2027-01-09T19:00:00'},
 {slug:'ali-reem',template_slug:'desert-pearl',name1_ar:'علي',name2_ar:'ريم',name1_en:'Ali',name2_en:'Reem',city_ar:'القاهرة',city_en:'Cairo',venue_ar:'بيت السحيمي',venue_en:'Al Suhaymi House',date:'2027-02-12T19:30:00'},
 {slug:'omar-layla',template_slug:'emerald-majlis',name1_ar:'عمر',name2_ar:'ليلى',name1_en:'Omar',name2_en:'Layla',city_ar:'الجيزة',city_en:'Giza',venue_ar:'قصر النيل',venue_en:'Nile Palace',date:'2027-03-05T20:00:00'}
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
