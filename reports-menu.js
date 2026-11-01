/* reports-menu.js — قائمة «التقارير» الفرعية (الهيدر + الشريط الجانبي) لكل صفحات النظام.
   لإضافة/تعديل تقرير: عدّل المصفوفة ITEMS فقط. تُحمَّل بسطر واحد قبل </body>:
   <script src="reports-menu.js"></script> */
(function () {
    'use strict';
    var ITEMS = [
        { href: 'reports-detailed.html#income',   key: 'reports-detailed.html#income',   icon: 'fa-file-invoice-dollar', text: 'قائمة الدخل' },
        { href: 'reports-detailed.html#summary',  key: 'reports-detailed.html#summary',  icon: 'fa-gauge-high',          text: 'الملخص التنفيذي' },
        { href: 'reports-detailed.html#bookings', key: 'reports-detailed.html#bookings', icon: 'fa-bed',                 text: 'الحجوزات والإيرادات' },
        { href: 'reports-detailed.html#payments', key: 'reports-detailed.html#payments', icon: 'fa-hand-holding-dollar', text: 'التحصيلات والمستحقات' },
        { href: 'reports-detailed.html#expenses', key: 'reports-detailed.html#expenses', icon: 'fa-money-bill-wave',      text: 'المصروفات التفصيلية' },
        { href: 'reports-detailed.html#abz',      key: 'reports-detailed.html#abz',      icon: 'fa-hand-holding-heart',  text: 'تقرير عمولة أبو زيد' },
        { sep: true },
        { href: 'reports-bookings.html',  key: 'reports-bookings.html',  icon: 'fa-file-alt',            text: 'تقارير الحجوزات' },
        { href: 'reports-financial.html', key: 'reports-financial.html', icon: 'fa-file-invoice-dollar', text: 'التقارير المالية' },
        { href: 'analytics.html',         key: 'analytics.html',         icon: 'fa-chart-pie',           text: 'تحليلات' }
    ];
    var REPORT_PAGES = ['reports-detailed.html', 'reports-bookings.html', 'reports-financial.html', 'analytics.html'];
    var DEFAULT_TAB = 'summary';

    function curKey() {
        var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (file === 'reports-detailed.html') return file + '#' + ((location.hash || '').replace('#', '') || DEFAULT_TAB);
        return file;
    }
    function isReportPage() { return REPORT_PAGES.indexOf((location.pathname.split('/').pop() || '').toLowerCase()) !== -1; }
    function txt(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

    // ---------- أنماط ----------
    var css = [
        '.rm-dd{position:relative;display:inline-flex}',
        '.rm-dd>a{cursor:pointer}',
        '.rm-caret{font-size:.7em;transition:transform .2s;margin-right:2px}',
        '.rm-dd.open>a .rm-caret,.rm-open>.rm-caret{transform:rotate(180deg)}',
        '.rm-menu{display:none;position:absolute;top:100%;right:0;padding-top:10px;z-index:3000;min-width:290px}',
        '.rm-dd.open>.rm-menu{display:block}',
        '@media (hover:hover){.rm-dd:hover>.rm-menu{display:block}}',
        '.rm-menu-in{background:var(--surface,#fff);border:1px solid var(--line,#e3e0d8);border-radius:16px;box-shadow:0 22px 48px -14px rgba(18,24,33,.35);padding:8px}',
        'nav .rm-menu a,.rm-menu a{display:flex!important;align-items:center;gap:12px;padding:11px 14px!important;border-radius:11px!important;font-size:15px!important;font-weight:700!important;color:var(--ink-soft,#2b3440)!important;background:transparent;white-space:nowrap;letter-spacing:0!important;text-decoration:none}',
        '.rm-menu a::after{display:none!important}',
        '.rm-menu a i{width:20px;text-align:center;font-size:15px!important;opacity:.75;color:var(--ink-mute,#6d7883)}',
        '.rm-menu a:hover{background:var(--surface-muted,#f3f1ec)!important;color:var(--ink,#121821)!important}',
        '.rm-menu a.active,.rm-sub a.active{background:var(--accent-soft,#fbefd2)!important;color:var(--accent-ink,#7a5312)!important}',
        '.rm-menu a.active i,.rm-sub a.active i{color:var(--accent-ink,#7a5312);opacity:1}',
        '.rm-sep{height:1px;background:var(--line,#e3e0d8);margin:6px 8px}',
        /* الشريط الجانبي */
        '.rm-sb-toggle{cursor:pointer}',
        '.rm-sb-toggle .rm-caret{margin-right:auto;margin-left:0}',
        '.rm-sub{display:none;margin:4px 14px 6px 0;padding-right:10px;border-right:2px solid var(--line,#e3e0d8)}',
        '.rm-sub.open{display:block}',
        '.sidebar .rm-sub a{font-size:14.5px!important;padding-top:9px!important;padding-bottom:9px!important}',
        '.rm-sub .rm-sep{margin:4px 6px}'
    ].join('\n');
    var st = document.createElement('style'); st.id = 'rm-style'; st.textContent = css; document.head.appendChild(st);

    function linkHtml(it, extraClass) {
        if (it.sep) return '<div class="rm-sep"></div>';
        return '<a href="' + it.href + '" data-rm="' + it.key + '"' + (extraClass ? ' class="' + extraClass + '"' : '') + '><i class="fas ' + it.icon + '"></i> ' + it.text + '</a>';
    }

    // ---------- الهيدر ----------
    function buildHeader() {
        var nav = document.querySelector('header nav'); if (!nav) return;
        var a = null;
        [].slice.call(nav.querySelectorAll('a')).forEach(function (x) { if (!a && txt(x) === 'التقارير') a = x; });
        var wrap = document.createElement('div'); wrap.className = 'rm-dd';
        if (!a) {   // صفحات بلا رابط «التقارير» في الهيدر: نضيفه في آخر القائمة
            a = document.createElement('a'); a.innerHTML = '<i class="fas fa-chart-pie nav-icon"></i> التقارير';
            nav.appendChild(wrap); wrap.appendChild(a);
        } else { a.parentNode.insertBefore(wrap, a); wrap.appendChild(a); }
        a.setAttribute('href', '#'); a.setAttribute('aria-haspopup', 'true');
        a.insertAdjacentHTML('beforeend', ' <i class="fas fa-chevron-down rm-caret"></i>');
        if (isReportPage()) a.classList.add('active');
        var menu = document.createElement('div'); menu.className = 'rm-menu';
        menu.innerHTML = '<div class="rm-menu-in">' + ITEMS.map(function (it) { return linkHtml(it); }).join('') + '</div>';
        wrap.appendChild(menu);
        a.addEventListener('click', function (e) { e.preventDefault(); wrap.classList.toggle('open'); });
        document.addEventListener('click', function (e) { if (!wrap.contains(e.target)) wrap.classList.remove('open'); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') wrap.classList.remove('open'); });
        menu.addEventListener('click', function () { wrap.classList.remove('open'); });
    }

    // ---------- الشريط الجانبي ----------
    function buildSidebar() {
        var box = document.querySelector('.sidebar .menu-items') || document.querySelector('.sidebar .menu') || document.querySelector('.menu-items'); if (!box) return;
        var toggle = null, linkClass = '', removeEls = [];
        // الحالة أ: مجموعة بعنوان «التقارير» (صفحات التقارير والرئيسية)
        var labels = [].slice.call(box.querySelectorAll('.label'));
        var lab = null; labels.forEach(function (l) { if (!lab && txt(l) === 'التقارير') lab = l; });
        if (lab) {
            var n = lab.nextElementSibling;
            while (n && n.tagName === 'A') {
                if (!linkClass) linkClass = (n.getAttribute('class') || '').replace(/\bactive\b/g, '').trim();
                removeEls.push(n); n = n.nextElementSibling;
            }
            toggle = document.createElement('a'); toggle.className = linkClass; toggle.setAttribute('href', '#');
            lab.parentNode.insertBefore(toggle, lab); 
            removeEls.forEach(function (x) { x.parentNode.removeChild(x); });
            lab.parentNode.removeChild(lab);
            var after = toggle; // سيُدرج الحاوي بعده
        } else {
            // الحالة ب: رابط «التقارير» بدون مجموعة (باقي الصفحات)
            [].slice.call(box.querySelectorAll('a')).forEach(function (x) { if (!toggle && txt(x) === 'التقارير') toggle = x; });
            if (toggle) {
                linkClass = (toggle.getAttribute('class') || '').replace(/\bactive\b/g, '').trim();
            } else {   // لا يوجد رابط «التقارير»: نضيفه في نهاية القائمة بنفس نمط الروابط
                var first = box.querySelector('a');
                if (!first) return;
                linkClass = (first.getAttribute('class') || '').replace(/\bactive\b/g, '').trim();
                toggle = document.createElement('a'); toggle.className = linkClass; box.appendChild(toggle);
            }
            toggle.setAttribute('href', '#');
        }
        toggle.classList.add('rm-sb-toggle');
        toggle.innerHTML = '<i class="fas fa-chart-pie"></i> التقارير <i class="fas fa-chevron-down rm-caret"></i>';
        var sub = document.createElement('div'); sub.className = 'rm-sub';
        sub.innerHTML = ITEMS.map(function (it) { return linkHtml(it, linkClass); }).join('');
        toggle.parentNode.insertBefore(sub, toggle.nextSibling);
        var open = isReportPage();
        function set(o) { sub.classList.toggle('open', o); toggle.classList.toggle('rm-open', o); }
        set(open);
        if (open) toggle.classList.add('active');
        toggle.addEventListener('click', function (e) { e.preventDefault(); set(!sub.classList.contains('open')); });
    }

    // ---------- تمييز العنصر الحالي ----------
    function refresh() {
        var k = curKey();
        [].slice.call(document.querySelectorAll('[data-rm]')).forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-rm') === k); });
    }
    window.rmRefresh = refresh;

    function init() { buildHeader(); buildSidebar(); refresh(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    window.addEventListener('hashchange', refresh);
})();
