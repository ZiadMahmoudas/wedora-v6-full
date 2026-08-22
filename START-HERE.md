# WEDORA — Start Here

## عندك Supabase حالي

1. خُد Backup من قاعدة البيانات.
2. شغّل `sql/MIGRATE-EXISTING.sql` مرة واحدة من SQL Editor.
3. عدّل `js/config.js` بمعلومات مشروعك.
4. ارفع ملفات الموقع الجديدة كلها واستبدل النسخة القديمة.
5. اعمل Hard Refresh ثم اختبر: Login → Builder → Save → Publish → Share → RSVP.
6. لو محتاج أدمن، عدّل البريد في `sql/MAKE-ADMIN.sql` وشغّله.

## مشروع Supabase جديد

1. شغّل `sql/INSTALL-FRESH.sql` مرة واحدة.
2. أنشئ أول حساب من الموقع.
3. شغّل `sql/MAKE-ADMIN.sql` بعد تعديل البريد لو الحساب أدمن.
4. ضع URL وAnon Key داخل `js/config.js`.
5. ارفع الموقع.

## فحص سريع بعد النشر

شغّل `sql/CHECK-SYSTEM.sql` للتأكد من Profiles / Plans / Subscriptions / Orders / Invitations.

> لا تشغّل ملفات V6/V7/V8/V9 القديمة؛ لم تعد موجودة في النسخة النظيفة ولا تحتاجها.
