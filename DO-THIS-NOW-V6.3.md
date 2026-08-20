# WEDORA V6.3 — Clean Cover + Modular Sections + Smart Auto Scroll

## أهم التغييرات

### 1. مشكلة الكلام فوق بعضه اتحلت
صور `assets/templates/*.jpg` بقت Sample Preview فقط.

الدعوة الحقيقية لا تستخدم النص المكتوب داخل صورة الـ Sample كخلفية.
كل Template له خلفية CSS أصلية، والأسماء والتاريخ يظهروا في Panel منفصل.

لو العميل رفع صورة شخصية، الصورة تظهر كـ Cover Art بدون أي Sample names.

### 2. Auto Scroll أذكى
بعد فتح الدعوة:
- يبدأ النزول بهدوء.
- لو الضيف استخدم Mouse Wheel أو Touch أو Keyboard يتوقف فورًا.
- لو ساب التفاعل حوالي 3 ثواني يرجع يكمل النزول تلقائيًا.
- عند الضغط داخل Form يتوقف مدة أطول حتى لا يحارب المستخدم أثناء الكتابة.
- يوجد زر AUTO صغير أسفل الشاشة لإيقاف/تشغيل الحركة يدويًا.
- سرعة النزول قابلة للتعديل من Builder.

### 3. أقسام إضافية بدون تعديل الكود
داخل Builder ستجد:

`أقسام إضافية للفرح`

الأنواع الافتراضية:
- Schedule
- Dress Code
- Transport
- Hotel / Stay
- Gifts
- Our Story
- Note
- Custom Link

لكل قسم:
- عنوان عربي
- عنوان إنجليزي
- نص عربي
- نص إنجليزي
- Icon
- Card / Wide layout
- Button AR / EN
- URL
- تحريك لأعلى / لأسفل
- حذف

يتم حفظ كل هذا داخل:
`invitations.features_config.custom_sections`

لذلك لا يوجد SQL migration جديد مطلوب لهذه الميزة.

## التشغيل

لو أنت شغلت بالفعل:
`sql/FIX-SLUG-GUEST-WALL-V6.2.sql`

فلا تحتاج SQL جديد لـ V6.3.

استبدل ملفات المشروع بالنسخة الجديدة ثم:

1. Ctrl + F5
2. افتح Builder
3. اختار Template
4. لا ترفع Cover وشاهد خلفية القالب الجديدة
5. أضف Custom Sections
6. احفظ
7. افتح الدعوة
8. اضغط Open Invitation
9. جرب Wheel ثم توقف عن الحركة
10. بعد لحظات سيكمل Auto Scroll تلقائيًا

## ملاحظة للدعوات القديمة
لو دعوة قديمة مخزن في `hero_image_url` رابط مثل:

`assets/templates/moonlight-navy.jpg`

V6.3 يتعرف عليه كـ Sample Asset ويتجاهله في الدعوة الحقيقية تلقائيًا، لذلك لا تحتاج تعديل Rows القديمة يدويًا.
