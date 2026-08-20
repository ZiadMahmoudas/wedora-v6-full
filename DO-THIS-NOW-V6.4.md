# WEDORA V6.4 — Auto Scroll Fixed + Premium Templates Restored

## اللي اتصلح

### 1) Auto Scroll كان واقف فعليًا
المشكلة كانت إن السرعة الهادية بتحرك الصفحة أقل من 1px في كل frame،
والكود القديم كان يعتمد على `scrollY` مباشرة، فالحركة الصغيرة كانت بتضيع.

V6.4 يستخدم floating-point scroll position مستقل.

النتيجة:
- النزول يبدأ بعد فتح الدعوة بحوالي 0.65 ثانية.
- السرعة تشتغل فعلًا من 20 إلى 120 px/s.
- Default = 48 px/s.
- Wheel / Touch / Keyboard يوقف الـ Auto Scroll فورًا.
- بعد حوالي 1.8 ثانية بدون تفاعل يرجع يكمل من المكان الجديد.
- أثناء الكتابة داخل Form يتوقف مدة أطول.
- زر `AUTO ↓` ما زال يسمح بإيقاف/تشغيل الحركة يدويًا.

### 2) شكل الـ Template رجع Premium
V6.3 كان بيفصل الـ Artwork عن الأسماء، وده خلّى التصميم يفقد شكل الدعوة الأصلي.

في V6.4:
- Cover رجع Full-screen.
- الأسماء والتاريخ جزء من Composition نفسها.
- مفيش أي Sample Names تحت الأسماء الحقيقية.
- القوالب متصممة Live بالـ CSS، فبيانات العميل هي الوحيدة الظاهرة.

التصاميم:
- Moonlight Navy: نجوم + حلقات دائرية + Navy cinematic mood.
- Royal Arabesque: Burgundy + Gold double frame.
- Classic Ivory: Ivory + elegant double border.
- Botanical Sage: Sage + circular botanical geometry.
- Editorial Noir: Burgundy editorial header + ivory typography layout.
- Minimal Blush: Blush + minimal vertical line details.

### 3) Phone / Tablet Preview
الـ Device preview اتظبط:
- Phone bezel أنضف.
- Tablet بقى Frame فعلي مش Phone متمدد.
- Tablet width/height متوازنين.
- Preview sections تتسع بطريقة أفضل في Tablet mode.

## تعمل إيه؟

لا يوجد SQL جديد في V6.4.

لو شغلت V6.2 SQL بالفعل:
`sql/FIX-SLUG-GUEST-WALL-V6.2.sql`

فكل المطلوب:
1. استبدل ملفات المشروع بالنسخة V6.4.
2. Ctrl + F5.
3. افتح Builder.
4. تحت Features غيّر `سرعة النزول التلقائي`.
5. احفظ الدعوة.
6. افتح الدعوة واضغط `افتح الدعوة`.
7. جرّب Scroll بالماوس.
8. سيقف فورًا، وبعد حوالي 1.8 ثانية سيكمل النزول تلقائيًا.

## ملاحظة
السرعة محفوظة داخل:
`features_config.auto_scroll_speed`

لذلك كل دعوة ممكن يكون لها سرعة مختلفة.
