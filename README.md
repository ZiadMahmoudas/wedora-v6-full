# WEDORA — Clean Full Release

نسخة موحّدة ونظيفة من الموقع: واجهة عامة، قوالب، Builder، دعوات منشورة، RSVP وGuest Wall، حساب العميل، الباقات والدفع، Share Center، ولوحة Admin.

## التشغيل السريع

1. افتح `js/config.js` وضع `SUPABASE_URL` و`SUPABASE_ANON_KEY` وإعدادات الدفع والدعم.
2. لو قاعدة البيانات **جديدة**: شغّل `sql/INSTALL-FRESH.sql` مرة واحدة في Supabase SQL Editor.
3. لو عندك قاعدة WEDORA **موجودة بالفعل**: شغّل `sql/MIGRATE-EXISTING.sql` مرة واحدة بدل ملفات التحديث القديمة.
4. لإنشاء/ترقية الأدمن عدّل البريد داخل `sql/MAKE-ADMIN.sql` ثم شغّله.
5. ارفع محتويات المجلد كما هي على Vercel/استضافة static. `vercel.json` يحوّل `/w/:slug` إلى صفحة الدعوة.

لو لم تضع إعدادات Supabase، الموقع يعمل تلقائيًا في Demo Mode محليًا.

## ملفات المشروع الحالية

- `css/app.css` — الأساس والصفحات العامة والداشبورد/الشير.
- `css/templates.css` — مصدر واحد لكل تصميمات القوالب.
- `css/story-studio.css` — طبقة Story Studio وتُحمّل بعد القوالب.
- `js/utils.js` — helpers مشتركة بدل تكرارها في الصفحات.
- `js/invitation-config.js` — defaults الخاصة بالدعوة وStory Cover والأقسام المخصصة.
- `js/supabase.js` — Supabase + Demo Store + العضوية والرفع والمشاركة.
- `sql/INSTALL-FRESH.sql` — تثبيت جديد.
- `sql/MIGRATE-EXISTING.sql` — ترقية قاعدة حالية.
- `sql/CHECK-SYSTEM.sql` — فحص سريع للحسابات والباقات والاشتراكات والدعوات.

## أهم إصلاحات النسخة النظيفة

- توحيد Demo invitation store؛ الحفظ والتعديل والنشر والتجربة والشير يقرؤون نفس المصدر.
- حفظ Demo draft حقيقي بدل توقف publish/trial عند عدم وجود Supabase.
- منع حفظ `blob:` URLs داخل localStorage لأنها تموت بعد Refresh.
- منع إعادة رفع نفس الصور/الصوت في كل Save بعد نجاح أول رفع.
- validation للصور والصوت قبل الرفع.
- توحيد defaults الخاصة بالميزات وStory Cover والأقسام المخصصة.
- توحيد دمج القوالب بين Home / Templates / Preview / Builder.
- إصلاح عدّ RSVP في الداشبورد ليكون خاصًا بدعوات المستخدم فقط.
- فصل CSS إلى Core / Templates / Story Studio لتقليل تضارب الـoverrides.
- حذف ملفات الإصدارات والـSQL patches المكررة من حزمة التسليم.

راجع `START-HERE.md` لو عايز خطوات النشر فقط بدون تفاصيل.
