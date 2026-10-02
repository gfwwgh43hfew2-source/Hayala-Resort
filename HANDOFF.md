# ملف التسليم — مشروع منتجع حياله (Hayala Resort)
> **للمساعد الذكي الذي يقرأ هذا الملف في محادثة جديدة:** اقرأه كاملًا ثم تابع العمل مباشرة من قسم "الحالة والمهام المتبقية".
> **قواعد العمل مع صاحب المشروع:** يكتب بالعربية، فرد بالعربية بإيجاز. بعد **كل** تعديل سلّمه: (1) ملف zip محدّث للمشروع كاملًا، (2) نسخة محدّثة من هذا الملف (حدّث قسم السجل والمهام). نفّذ ما تراه مناسبًا دون كثرة أسئلة، لكن لا تطبّق تغييرًا هدّامًا على قاعدة البيانات الحية دون أن ينسجم مع ترتيب النشر المذكور أدناه.

## 1) نظرة عامة
- نظام إدارة منتجع: حجوزات، عملاء، عقارات، مصروفات، فواتير، تقارير مالية وتقارير حجوزات، تحليلات، مستخدمون وصلاحيات، وحسابات "أبو زيد" (عمولة ومدفوعات).
- **الواجهة:** صفحات HTML ثابتة (بلا إطار عمل) باللغة العربية RTL، JavaScript داخل كل صفحة، تُنشر من مستودع GitHub `Hayala-Resort`.
- **الخلفية:** Supabase، مشروع `Hayala Resort`، المعرّف `zwuvcblrrrriuylajvba`، المنطقة eu-west-1، Postgres 17. الرابط: `https://zwuvcblrrrriuylajvba.supabase.co`. المساعد يملك اتصالًا بأدوات Supabase (SQL, migrations, logs) في المحادثة.
- الصفحات: `login, index, bookings, add-invoice, clients, client-accounts, client-payments, properties, expenses, abuzeid, future, analytics, reports-bookings, reports-financial, users` (.html) + مجلد `sql/`.

## 2) البنية التقنية المهمة
- كل صفحة (عدا login) تنشئ `supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` وتتحقق من الجلسة وتجلب صف المستخدم من `profiles`، ثم تجلب البيانات بـ `fetch` إلى `/rest/v1/<table>` برأس `'Authorization': 'Bearer ' + SUPABASE_ANON_KEY`.
- **[AUTH-PATCH]**: كتلة JS مُحقنة في كل صفحة (عدا login) بعد سطر `createClient`، تغلّف `window.fetch` فتستبدل مفتاح anon بتوكن جلسة المستخدم تلقائيًا لطلبات `/rest/v1/`. **لا تحذفها**، وأضفها لأي صفحة جديدة. السبب: سياسات RLS لم تعد تسمح لـ anon.
- `index.html` ينتهي أسطره بـ CRLF؛ حافظ على ذلك عند التعديل (استخدم قراءة/كتابة بـ `newline=''`).
- صفحة `users.html` تنشئ الحسابات عبر Edge Function اسمها `create-user` (تعمل بصلاحية service_role).
- مفتاح anon ظاهر في الواجهة وهذا طبيعي؛ الحماية الحقيقية هي RLS.

## 3) هيكل قاعدة البيانات (schema public)
- `bookings` (50 صفًا): id bigint, invoice_number, booking_number, invoice_date, check_in, check_out, client_name, client_phone, property_type, nights, price_per_night, discount, paid, remaining, total, payment_status ('Balance Due' | 'Fully Paid')، stay_type, check_in_time, check_out_time, time_note, notes, created_at, updated_at.
- `clients` (51): id uuid, name, phone, email, address, id_number, notes, total_bookings, total_spent, opening_balance, ...
- `properties` (7): id, name, type, price_per_night, capacity, description, status.
- `expenses` (98): id, date, day, property, category, description, total, accounting, notes.
- `client_payments` (17): id, client_id, client_name, amount, payment_date, payment_method, notes.
- `abuzaid_payments` (1): id bigint, client_name, amount, payment_date, payment_method, notes, description.
- `abuzaid_commission` (1): month, year, total_invoices, operating_expenses, commission_base, commission_rate, commission_due, received_amount, remaining_amount, status, notes.
- `profiles` (1): id (FK إلى auth.users), email, name, phone, role (`admin|manager|accountant|receptionist|viewer`)، status (`active|inactive|suspended`). يُنشأ تلقائيًا بـ trigger `handle_new_user` على auth.users.
- `user_permissions` (31): user_id, permission_name, granted, granted_by.
- `users` (جدول قديم مكرر): يحوي كلمة مرور **نصية**. لا يستخدمه أي كود.
- دوال: `is_admin()`, `is_active_user()` (تُضاف في sql/02), `my_profile_role()`, `my_profile_status()`, `handle_new_user()`.

## 4) نموذج الأمان
- **مُطبَّق الآن على القاعدة الحية:** RLS مفعّل على `profiles` و`user_permissions` بسياسات (المدير الكل، المستخدم صفه فقط، ومنع المستخدم من تغيير role/status لنفسه)، وسُحبت صلاحيات anon منهما، ومُنحت `authenticated` صلاحيات CRUD على `user_permissions`. التفاصيل في `sql/01_...sql`.
- **جاهز لكن غير مُطبَّق (حتى 3 أكتوبر 2026، آخر فحص للسجلات):** `sql/02_lockdown_business_tables.sql` — يحذف كل سياسات "الجميع" المفتوحة على جداول الأعمال (bookings, clients, properties, expenses, client_payments, abuzaid_payments, abuzaid_commission)، ويستبدلها بسياسة واحدة لكل جدول: المستخدم المسجّل ذو `profiles.status='active'` فقط. ويقفل جدول `users` بالكامل. **اختُبر داخل معاملة مُلغاة:** anon محظور، المدير يرى كل شيء (bookings=50, user_permissions=31)، مستخدم عادي لا يستطيع ترقية نفسه، المستخدم المعلّق يرى 0 صفوف.
- **ترتيب النشر الإلزامي:** (1) رفع الكود المحدّث (فيه AUTH-PATCH) إلى GitHub/الاستضافة، (2) التأكد أن تسجيل الدخول وصفحات الحجوزات والتقارير تعمل، (3) تشغيل `sql/02` (أو طلب تطبيقه من المساعد عبر apply_migration). قبل الخطوة 3 يبقى أي زائر قادرًا على قراءة البيانات وتعديلها.

- **كيف تعرف أن الكود الجديد نُشر؟** عبر `query_logs` (source='edge_logs'): طلبات `/rest/v1/<جدول بيانات>` يجب أن يظهر فيها `log_attributes['request.sb.jwt.authorization.payload.role']='authenticated'`. وقت آخر فحص كانت طلبات الحجوزات/العملاء/المصروفات بلا هذا الدور (أي ما زالت بمفتاح anon فقط، والكود القديم هو المنشور)، وفقط طلبات `profiles` كانت authenticated. **أعد الفحص قبل تطبيق sql/02**، والمستخدم يستعمل الموقع فعليًا فلا تقطع عليه العمل.
- **مسودات جاهزة (غير مطبّقة):**
  - `sql/03_role_based_policies_DRAFT.sql` — بعد sql/02. القراءة لأي مستخدم نشط؛ الإضافة/التعديل: admin, manager, accountant, receptionist (جدول properties: admin, manager)؛ الحذف: admin, manager فقط؛ viewer قراءة فقط. **اختُبرت** داخل معاملة مُلغاة على كل الأدوار (إدراج/حذف/قراءة). تحتاج موافقة صاحب المشروع على المصفوفة قبل التطبيق.
  - `sql/04_fix_booking_totals_PROPOSED.sql` — يصحّح `total` في 3 حجوزات (id 10, 23, 26) حُفظ فيها الإجمالي صافيًا بعد الخصم (يخالف اتفاقية التطبيق: total قبل الخصم). يحفظ نسخة احتياطية أولًا. تحتاج موافقة صاحب المشروع لأنها تعدّل بيانات مالية.

## 5) السجل
- إصلاح بطاقة المستحقات في `reports-financial.html` (مرحلتان): (أ) كانت تتجاهل فلتر التاريخ، (ب) **الأهم**: كانت تتجاهل `client_payments`. تبيّن أن كل المتبقي في `bookings.remaining` (27,600) سُدّد لاحقًا بدفعات العملاء (لكل عميل: المتبقي = الدفعات تمامًا)، فالمستحقات الفعلية الآن **0**. صارت البطاقة تحسب نفس منطق `client-accounts.html` (متبقي كل عميل − دفعاته، بحد أدنى 0) وتُسمّى "المستحقات الحالية على العملاء (بعد الدفعات)"، ولا تتأثر بفلتر التاريخ (لأن الدفعات غير مربوطة بحجوزات محددة).
- `index.html`: بطاقة "عمولة أبو زيد" كانت تقفل القيمة عند الصفر (`Math.max(0, due − payments)`) فتخفي الرصيد السالب (دفعات أكثر من المستحق)؛ أُزيل القفل لتطابق صفحة `abuzeid.html` (المتبقي = المستحق − المدفوع، يظهر سالبًا). صيغة الصفحتين واحدة: الأساس = max(0, إيرادات صافية − مصروفات) × 20%؛ الإيرادات = total − discount؛ لا تغيّرها في صفحة دون الأخرى. ملاحظة بيانات: دفعة وحيدة لأبو زيد 7,197 بتاريخ 2026-09-01 ("تصفية حساب إلى 31/8/2026"). عند فحص 3 أكتوبر 2026: المستحق 7,317.68 والمتبقي +120.68 (كان −49 قبل إضافة الحجزين 73 و74 بصافي 850).
- تطبيق RLS على `profiles` و`user_permissions` (sql/01) + منح صلاحيات CRUD لـ authenticated على user_permissions.
- حقن AUTH-PATCH في 14 صفحة + كتابة sql/02 واختباره.
- تحليل بيانات الحجوزات: اتفاقية التطبيق `total` = قبل الخصم؛ الصافي = total − discount؛ المتبقي = total − discount − paid. 12 من 15 حجزًا بخصم تتبعها؛ 3 (id 10, 23, 26) حُفظ فيها total صافيًا (remaining المخزّن صحيح فيها). `client-accounts.html` يعرض "إجمالي الفواتير" = total الخام عمدًا (تعليق صريح في الكود) — لا تغيّره.

## 6) الحالة والمهام المتبقية (بالأولوية)
1. **نشر الكود ثم تطبيق sql/02** (ترتيب النشر في القسم 4). بعدها اختبار حقيقي بتسجيل الدخول.
2. **كلمة مرور المدير المخزّنة نصًا في `users.password`**: على صاحب المشروع تغيير كلمة مرور الدخول فورًا؛ ثم حذف الجدول أو تصفير العمود (لا كود يستخدمه). sql/02 يقفله.
3. **قرار صاحب المشروع:** (أ) الموافقة على `sql/04` (تصحيح 3 حجوزات؛ يرفع إيرادات التقارير 650)؛ (ب) حجز id 13 (ام فهد، 1100، مدفوع 1000، المتبقي 0، "Fully Paid"): هل الـ100 خصم لم يُسجَّل أم دين لم يُحصَّل؟ (ج) الموافقة على مصفوفة الأدوار في `sql/03`.
4. حجوزات ذات إجمالي يدوي لا يساوي nights×price (id 1: 183 ليلة×60=10,980 مقابل 11,000؛ id 19: ليلتان×900 مقابل 900) — متسقة داخليًا، تُراجع مع المالك فقط.
5. `expenses`: أعمدة `day` و`description` إلزامية (NOT NULL) — انتبه عند أي إدراج برمجي. والكود يقرأ `total || amount` والعمود الفعلي `total` فقط.

## 7) تلميحات للاختبار
- اختبار RLS بدون لمس البيانات: داخل `begin; ... rollback;` مع `set local role anon|authenticated` و`set_config('request.jwt.claims', ...)`. `profiles.id` مرتبط بـ auth.users فلا يمكن إنشاء مستخدمين وهميين؛ بدّل role/status لحساب المدير مؤقتًا داخل المعاملة. للحذف: يُرجع RLS صفر صفوف بلا خطأ، فاختبره على صف موجود.
- فحص صياغة JS لكل كتل `<script>` بـ `node --check` بعد أي تعديل.
