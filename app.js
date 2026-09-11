/* app.js — پنل مدیریت بینوشا
   داده‌ها: ریپوی خصوصی binoosha-data (از طریق GitHub API با توکن مدیر)
   توکن‌ها فقط در localStorage همان مرورگر — هیچ سروری در میان نیست. */
'use strict';
(function () {
  var OWNER = 'amiroo4522855-wq';
  var DATA_REPO = 'binoosha-data';
  var SURVEY_REPO = 'binoosha-survey';
  var PASS = '@#$&@@3';
  var LS = { pw: 'bn_pw_ok', bot: 'bn_bot_token', gh: 'bn_gh_token' };

  var $ = function (s) { return document.querySelector(s); };
  var fa = window.Charts.fa;

  /* ---------- برچسب‌ها (هم‌راستا با اپ نظرسنجی) ---------- */
  var LBL = {
    mood: { 'very-happy': 'خیلی راضی‌ام', 'happy': 'راضی‌ام', 'neutral': 'معمولیه', 'unhappy': 'ناراضی‌ام', 'angry': 'اصلاً راضی نیستم' },
    video: { 'keep-style': 'همین سبک ادامه پیدا کنه', 'deep-review': 'بررسی‌های تخصصی‌تر', 'shorter': 'ویدیوهای کوتاه‌تر', 'tutorial': 'آموزش بیشتر', 'fun': 'سرگرم‌کننده‌تر', 'other': 'ایده دیگری دارم' },
    site: { 'good': 'عالیه', 'mid': 'جا برای بهتر شدن', 'bad': 'باید ارتقا پیدا کنه' },
    topics: { 'mobile': 'موبایل', 'laptop': 'لپ‌تاپ', 'pc': 'کامپیوتر', 'gaming': 'گیمینگ', 'ai': 'هوش مصنوعی', 'gadget': 'گجت‌ها', 'car': 'تکنولوژی خودرو' },
    platforms: { 'telegram': 'Telegram', 'instagram': 'Instagram', 'youtube': 'YouTube', 'website': 'Website', 'other': 'سایر' }
  };
  var MOOD_COLOR = { 'very-happy': '#34D399', 'happy': '#22D3EE', 'neutral': '#FBBF24', 'unhappy': '#FB7185', 'angry': '#EF4444' };

  var DATA = { subs: [], events: [], panelLog: [], status: { open: true } };

  /* ---------- ابزارها ---------- */
  function toast(msg, ms) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._to);
    t._to = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
  }
  function fmtDate(ts) {
    try { return new Date(ts).toLocaleString('fa-IR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return new Date(ts).toLocaleString(); }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function tok() { return localStorage.getItem(LS.gh) || ''; }

  /* ---------- GitHub API ---------- */
  function gh(method, path, body) {
    return fetch('https://api.github.com' + path, {
      method: method,
      headers: {
        'Authorization': 'token ' + tok(),
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'binoosha-panel'
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.message || ('HTTP ' + r.status));
        return j;
      });
    });
  }
  function ghGetFile(repo, path) {
    return gh('GET', '/repos/' + OWNER + '/' + repo + '/contents/' + path + '?_=' + Date.now())
      .then(function (f) {
        return { sha: f.sha, content: f.content ? atob(f.content) : '' };
      });
  }
  function ghPutFile(repo, path, content, sha, msg) {
    return gh('PUT', '/repos/' + OWNER + '/' + repo + '/contents/' + path, {
      message: msg,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha,
      branch: 'main'
    });
  }

  /* ---------- بارگذاری داده ---------- */
  function loadData() {
    return Promise.all([
      ghGetFile(DATA_REPO, 'data/submissions.json').catch(function () { return { sha: null, content: '[]' }; }),
      ghGetFile(DATA_REPO, 'data/events.jsonl').catch(function () { return { sha: null, content: '' }; }),
      ghGetFile(DATA_REPO, 'data/panel-log.json').catch(function () { return { sha: null, content: '[]' }; }),
      ghGetFile(SURVEY_REPO, 'status.json').catch(function () { return { sha: null, content: '{"open":true}' }; })
    ]).then(function (r) {
      DATA.subsFile = r[0]; DATA.evFile = r[1]; DATA.logFile = r[2]; DATA.stFile = r[3];
      try { DATA.subs = JSON.parse(r[0].content) || []; } catch (e) { DATA.subs = []; }
      DATA.events = r[1].content.split('\n').filter(Boolean).map(function (l) { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
      try { DATA.panelLog = JSON.parse(r[2].content) || []; } catch (e) { DATA.panelLog = []; }
      try { DATA.status = JSON.parse(r[3].content) || { open: true }; } catch (e) { DATA.status = { open: true }; }
    });
  }

  /* ---------- لاگ فعالیت پنل ---------- */
  function logAction(type, detail) {
    var entry = { ts: Date.now(), type: 'panel', action: type, detail: detail || '' };
    DATA.panelLog.push(entry);
    var content = JSON.stringify(DATA.panelLog.slice(-500), null, 2);
    ghPutFile(DATA_REPO, 'data/panel-log.json', content, DATA.logFile && DATA.logFile.sha, 'panel: ' + type)
      .then(function () { return ghGetFile(DATA_REPO, 'data/panel-log.json'); })
      .then(function (f) { DATA.logFile = f; })
      .catch(function (e) { console.warn('log fail', e); });
  }

  /* ---------- KPI ---------- */
  function countAnim(el, to, suffix) {
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 800);
      el.textContent = fa(Math.round(to * (1 - Math.pow(1 - p, 3)))) + (suffix || '');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderKpis() {
    var subs = DATA.subs;
    var ids = {};
    subs.forEach(function (s) { if (s.user && s.user.id) ids[s.user.id] = 1; });
    var unique = Object.keys(ids).length;
    var dayAgo = Date.now() - 864e5, weekAgo = Date.now() - 7 * 864e5;
    var today = subs.filter(function (s) { return s.ts > dayAgo; }).length;
    var week = subs.filter(function (s) { return s.ts > weekAgo; }).length;
    var nps = subs.map(function (s) { return +s.answers.recommend_nps; }).filter(function (n) { return !isNaN(n); });
    var promoters = nps.filter(function (n) { return n >= 9; }).length;
    var detractors = nps.filter(function (n) { return n <= 6; }).length;
    var npsScore = nps.length ? Math.round((promoters - detractors) / nps.length * 100) : 0;
    var stars = subs.map(function (s) { return +s.answers.rating_stars; }).filter(Boolean);
    var avgStars = stars.length ? (stars.reduce(function (a, b) { return a + b; }, 0) / stars.length) : 0;

    var items = [
      { k: 'نظرات ثبت‌شده (واقعی)', v: subs.length, c: '#A78BFA' },
      { k: 'کاربران یکتا', v: unique, c: '#22D3EE' },
      { k: '۲۴ ساعت اخیر', v: today, c: '#34D399' },
      { k: 'هفته اخیر', v: week, c: '#FBBF24' },
      { k: 'شاخص NPS', v: npsScore, c: npsScore >= 0 ? '#34D399' : '#FB7185' },
      { k: 'میانگین امتیاز', v: avgStars ? avgStars.toFixed(1).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }) : '—', c: '#F472B6', raw: true }
    ];
    $('#kpis').innerHTML = items.map(function (i, idx) {
      return '<div class="kpi" style="--k:' + i.c + '"><div class="v" id="kpi' + idx + '">' + (i.raw ? i.v : fa(0)) + '</div><div class="k">' + i.k + '</div></div>';
    }).join('');
    items.forEach(function (i, idx) {
      if (!i.raw) countAnim($('#kpi' + idx), i.v);
    });
    var ns = $('#npsScore');
    if (ns) ns.innerHTML = 'شاخص خالص معرفی: <b>' + fa(npsScore) + '</b> — ' + (npsScore > 30 ? 'عالی! مردم شما را معرفی می‌کنند 🎉' : npsScore >= 0 ? 'قابل قبول، جای رشد دارد' : 'نیاز به توجه فوری ⚠️');
  }

  /* ---------- نمودارها ---------- */
  function tally(getter, keys, labels) {
    var m = {};
    DATA.subs.forEach(function (s) {
      var v = getter(s.answers);
      if (v === null || v === undefined) return;
      (Array.isArray(v) ? v : [v]).forEach(function (x) { if (x) m[x] = (m[x] || 0) + 1; });
    });
    return keys.filter(function (k) { return m[k]; }).map(function (k) { return { label: labels[k] || k, value: m[k], key: k }; });
  }

  function renderCharts() {
    var C = window.Charts;
    var moods = tally(function (a) { return a.satisfaction; }, Object.keys(LBL.mood), LBL.mood);
    moods.forEach(function (m) { m.color = MOOD_COLOR[m.key]; });
    if (moods.length) C.donut($('#chMood'), moods);
    else emptyChart($('#chMood'));

    var starKeys = ['5', '4', '3', '2', '1'];
    var starItems = tally(function (a) { return a.rating_stars ? String(a.rating_stars) : null; }, starKeys, { '5': '۵ ★', '4': '۴ ★', '3': '۳ ★', '2': '۲ ★', '1': '۱ ★' });
    starItems.forEach(function (s, i) { s.color = ['#34D399', '#22D3EE', '#FBBF24', '#FB7185', '#EF4444'][i]; });
    if (starItems.length) C.bars($('#chStars'), starItems);
    else emptyChart($('#chStars'));

    var npsHist = [];
    for (var n = 0; n <= 10; n++) {
      var c = DATA.subs.filter(function (s) { return +s.answers.recommend_nps === n; }).length;
      npsHist.push({ label: fa(n), value: c, color: n >= 9 ? '#34D399' : n >= 7 ? '#FBBF24' : '#FB7185' });
    }
    if (npsHist.some(function (x) { return x.value; })) C.bars($('#chNps'), npsHist);
    else emptyChart($('#chNps'));

    var topics = tally(function (a) { return a.future_topics; }, Object.keys(LBL.topics), LBL.topics);
    if (topics.length) C.hbars($('#chTopics'), topics);
    else emptyChart($('#chTopics'));

    var plats = tally(function (a) { return a.platforms; }, Object.keys(LBL.platforms), LBL.platforms);
    if (plats.length) C.donut($('#chPlatforms'), plats);
    else emptyChart($('#chPlatforms'));

    var sites = tally(function (a) { return a.site_rating; }, Object.keys(LBL.site), LBL.site);
    sites.forEach(function (s) { s.color = { 'good': '#34D399', 'mid': '#FBBF24', 'bad': '#FB7185' }[s.key]; });
    if (sites.length) C.bars($('#chSite'), sites);
    else emptyChart($('#chSite'));

    var vids = tally(function (a) { return a.video_content; }, Object.keys(LBL.video), LBL.video);
    if (vids.length) C.bars($('#chVideo'), vids);
    else emptyChart($('#chVideo'));

    // روند ۱۴ روزه
    var days = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 864e5);
      var key = d.toISOString().slice(0, 10);
      days.push({ x_: (d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' })), key: key, y: 0 });
    }
    DATA.subs.forEach(function (s) {
      var k = new Date(s.ts).toISOString().slice(0, 10);
      days.forEach(function (d) { if (d.key === k) d.y++; });
    });
    if (DATA.subs.length) C.area($('#chTimeline'), days);
    else emptyChart($('#chTimeline'));

    // ابر لپ‌تاپ‌ها
    var lm = {};
    DATA.subs.forEach(function (s) {
      (s.answers.laptop_requests || []).forEach(function (n) { var t = n.trim(); if (t) lm[t] = (lm[t] || 0) + 1; });
    });
    var le = Object.keys(lm).sort(function (a, b) { return lm[b] - lm[a]; }).slice(0, 24);
    $('#laptopCloud').innerHTML = le.length
      ? le.map(function (n, i) { return '<span class="chip" style="animation-delay:' + i * 30 + 'ms">' + esc(n) + ' <b>×' + fa(lm[n]) + '</b></span>'; }).join('')
      : '<span class="muted">هنوز لپ‌تاپی ثبت نشده</span>';

    // آخرین ایده‌ها
    var ideas = DATA.subs.filter(function (s) { return s.answers.idea && s.answers.idea.trim(); })
      .sort(function (a, b) { return b.ts - a.ts; }).slice(0, 12);
    $('#ideaList').innerHTML = ideas.length
      ? ideas.map(function (s) {
        return '<div class="idea">' + esc(s.answers.idea) + '<div class="who">' + esc(who(s)) + ' — ' + fmtDate(s.ts) + '</div></div>';
      }).join('')
      : '<span class="muted">هنوز ایده‌ای ثبت نشده</span>';
  }

  function emptyChart(cv) {
    var ctx = cv.getContext('2d');
    var r = cv.getBoundingClientRect();
    cv.width = r.width; cv.height = +cv.getAttribute('height') || 200;
    ctx.fillStyle = '#9A93B8';
    ctx.font = '13px Vazirmatn, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('داده‌ای موجود نیست', r.width / 2, (+cv.getAttribute('height') || 200) / 2);
  }

  function who(s) {
    if (!s.user) return 'ناشناس';
    return (s.user.first_name || 'کاربر') + (s.user.username ? ' @' + s.user.username : '');
  }

  /* ---------- پاسخ‌ها ---------- */
  function renderResponses() {
    var q = ($('#respSearch').value || '').trim().toLowerCase();
    var sort = $('#respSort').value;
    var list = DATA.subs.slice();
    if (q) {
      list = list.filter(function (s) {
        return (who(s) + ' ' + (s.answers.idea || '') + ' ' + (s.answers.laptop_requests || []).join(' ')).toLowerCase().indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) {
      if (sort === 'old') return a.ts - b.ts;
      if (sort === 'nps') return (+b.answers.recommend_nps || 0) - (+a.answers.recommend_nps || 0);
      return b.ts - a.ts;
    });
    var box = $('#respList');
    if (!list.length) {
      box.innerHTML = '<div class="empty"><span class="big">💬</span>هنوز پاسخی ثبت نشده.<br>وقتی کاربران نظرسنجی را پر کنند اینجا نمایش داده می‌شود.</div>';
      return;
    }
    box.innerHTML = list.map(function (s, i) {
      var a = s.answers;
      var stars = a.rating_stars ? '★'.repeat(+a.rating_stars) + '☆'.repeat(5 - (+a.rating_stars)) : '—';
      var row = function (k, v) { return v ? '<span class="k">' + k + '</span><span class="v">' + v + '</span>' : ''; };
      return '<div class="resp" data-i="' + i + '">' +
        '<div class="resp-head"><span class="nm">' + esc(who(s)) + '</span>' +
        '<span class="meta"><span class="stars-mini">' + stars + '</span><span>NPS ' + fa(a.recommend_nps == null ? '—' : a.recommend_nps) + '</span><span>' + fmtDate(s.ts) + '</span></span></div>' +
        '<div class="resp-body"><div class="kv">' +
        row('رضایت', esc(LBL.mood[a.satisfaction] || a.satisfaction || '')) +
        row('ویدیو', esc(LBL.video[a.video_content] || '')) +
        row('سایت', esc(LBL.site[a.site_rating] || '')) +
        row('تغییرات', esc((a.site_improvements || []).join('، '))) +
        row('موضوعات', esc((a.future_topics || []).map(function (t) { return LBL.topics[t] || t; }).join('، '))) +
        row('پلتفرم‌ها', esc((a.platforms || []).map(function (p) { return LBL.platforms[p] || p; }).join('، '))) +
        row('لپ‌تاپ‌ها', esc((a.laptop_requests || []).join('، '))) +
        row('ایده', esc(a.idea || '')) +
        '</div></div></div>';
    }).join('');
    Array.prototype.forEach.call(box.querySelectorAll('.resp'), function (el) {
      el.addEventListener('click', function () { el.classList.toggle('open'); });
    });
  }

  /* ---------- فعالیت ---------- */
  function renderActivity() {
    var items = [];
    DATA.events.forEach(function (e) {
      var icon = e.type === 'submit' ? '📨' : e.type === 'start' ? '👋' : '💬';
      var txt = e.type === 'submit' ? 'نظر جدید ثبت شد' + (e.username ? ' — @' + esc(e.username) : '')
        : e.type === 'start' ? 'کاربر استارت زد' + (e.username ? ' — @' + esc(e.username) : (e.user_id ? ' — ' + fa(e.user_id) : ''))
          : 'پیام دیگر' + (e.username ? ' — @' + esc(e.username) : '');
      items.push({ ts: e.ts, html: '<span class="ic">' + icon + '</span><span><span class="tt">' + txt + '</span><br><span class="ts">' + fmtDate(e.ts) + '</span></span>' });
    });
    DATA.panelLog.forEach(function (e) {
      var txt = {
        'login': 'ورود به پنل', 'logout': 'خروج از پنل', 'login-fail': 'تلاش ناموفق ورود',
        'sync': 'سینک دستی', 'survey-open': 'باز کردن نظرسنجی', 'survey-close': 'بستن نظرسنجی',
        'export-csv': 'خروجی CSV', 'export-json': 'خروجی JSON'
      }[e.action] || e.action;
      items.push({ ts: e.ts, html: '<span class="ic">🛡️</span><span><span class="tt">پنل: ' + esc(txt) + '</span><br><span class="ts">' + fmtDate(e.ts) + '</span></span>' });
    });
    items.sort(function (a, b) { return b.ts - a.ts; });
    $('#actFeed').innerHTML = items.length
      ? items.slice(0, 150).map(function (e, i) { return '<div class="ev" style="animation-delay:' + Math.min(i * 20, 400) + 'ms">' + e.html + '</div>'; }).join('')
      : '<div class="empty"><span class="big">🕓</span>فعلاً فعالیتی ثبت نشده.</div>';
  }

  /* ---------- وضعیت نظرسنجی ---------- */
  function renderStatus() {
    var open = DATA.status.open !== false;
    var b = $('#statusBadge');
    b.className = 'badge ' + (open ? 'open' : 'closed');
    b.textContent = open ? '● نظرسنجی باز' : '● نظرسنجی بسته';
    var sw = $('#surveyToggle');
    sw.classList.toggle('on', open);
    sw.setAttribute('aria-checked', String(open));
    $('#toggleLabel').textContent = open ? 'نظرسنجی باز است' : 'نظرسنجی بسته است';
  }

  function toggleSurvey() {
    var open = DATA.status.open !== false;
    var next = !open;
    var content = JSON.stringify({ open: next, updatedAt: Date.now() }, null, 2);
    $('#surveyToggle').disabled = true;
    ghPutFile(SURVEY_REPO, 'status.json', content, DATA.stFile && DATA.stFile.sha, next ? 'survey: open' : 'survey: close')
      .then(function () {
        DATA.status = { open: next };
        renderStatus();
        logAction(next ? 'survey-open' : 'survey-close');
        toast(next ? '✅ نظرسنجی باز شد' : '🔒 نظرسنجی بسته شد — کاربران پیام بسته بودن می‌بینند');
        return ghGetFile(SURVEY_REPO, 'status.json');
      })
      .then(function (f) { DATA.stFile = f; })
      .catch(function (e) { toast('❌ خطا: ' + e.message, 4000); })
      .finally(function () { $('#surveyToggle').disabled = false; });
  }

  /* ---------- سینک ---------- */
  function syncNow() {
    var btn = $('#syncBtn');
    btn.disabled = true;
    btn.textContent = '⟳ در حال سینک…';
    gh('POST', '/repos/' + OWNER + '/' + DATA_REPO + '/actions/workflows/sync.yml/dispatches', { ref: 'main' })
      .then(function () { return waitRun(0); })
      .then(function () { return loadData(); })
      .then(function () {
        renderAll();
        logAction('sync');
        toast('✅ سینک انجام شد — ' + fa(DATA.subs.length) + ' نظر');
      })
      .catch(function (e) { toast('❌ سینک ناموفق: ' + e.message, 4000); })
      .finally(function () { btn.disabled = false; btn.textContent = '⟳ سینک'; });
  }

  function waitRun(tries) {
    if (tries > 14) return Promise.reject(new Error('timeout'));
    return gh('GET', '/repos/' + OWNER + '/' + DATA_REPO + '/actions/runs?per_page=1&_=' + Date.now())
      .then(function (d) {
        var r = d.workflow_runs && d.workflow_runs[0];
        if (r && r.status === 'completed') {
          if (r.conclusion !== 'success') throw new Error('run failed');
          return true;
        }
        return new Promise(function (res) { setTimeout(res, 5000); }).then(function () { return waitRun(tries + 1); });
      });
  }

  /* ---------- خروجی ---------- */
  function download(name, content, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function exportCsv() {
    var head = ['ts', 'user_id', 'first_name', 'username', 'satisfaction', 'video', 'site', 'stars', 'nps', 'topics', 'platforms', 'laptops', 'site_changes', 'idea'];
    var lines = [head.join(',')];
    DATA.subs.forEach(function (s) {
      var a = s.answers;
      var cells = [new Date(s.ts).toISOString(), s.user && s.user.id, s.user && s.user.first_name, s.user && s.user.username,
        LBL.mood[a.satisfaction] || a.satisfaction, LBL.video[a.video_content] || a.video_content, LBL.site[a.site_rating] || a.site_rating,
        a.rating_stars, a.recommend_nps, (a.future_topics || []).map(function (t) { return LBL.topics[t] || t; }).join(' | '),
        (a.platforms || []).join(' | '), (a.laptop_requests || []).join(' | '), (a.site_improvements || []).join(' | '), a.idea];
      lines.push(cells.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','));
    });
    download('binoosha-responses.csv', '\ufeff' + lines.join('\n'), 'text/csv;charset=utf-8');
    logAction('export-csv');
  }

  /* ---------- رندر کلی ---------- */
  function renderAll() {
    renderKpis();
    renderCharts();
    renderResponses();
    renderActivity();
    renderStatus();
    $('#connInfo').innerHTML = 'GitHub: ' + OWNER + '<br>Data repo: ' + DATA_REPO + ' (private)<br>Survey repo: ' + SURVEY_REPO + '<br>آخرین بارگذاری: ' + fmtDate(Date.now());
  }

  /* ---------- Gate ---------- */
  function enterApp() {
    $('#gate').classList.add('hidden');
    $('#app').classList.remove('hidden');
    loadData().then(renderAll).catch(function (e) {
      toast('❌ خطا در خواندن داده: ' + e.message, 5000);
    });
  }

  function tryPassword() {
    if ($('#pwInput').value === PASS) {
      sessionStorage.setItem(LS.pw, '1');
      logActionSafe('login');
      if (localStorage.getItem(LS.bot) && localStorage.getItem(LS.gh)) enterApp();
      else { $('#gatePw').classList.add('hidden'); $('#gateTok').classList.remove('hidden'); }
    } else {
      $('#pwErr').textContent = 'رمز اشتباه است';
      logActionSafe('login-fail');
    }
  }

  function logActionSafe(type) {
    try { logAction(type); } catch (e) {}
  }

  function tryTokens() {
    var bot = $('#botTok').value.trim(), ght = $('#ghTok').value.trim();
    var err = $('#tokErr');
    err.textContent = '';
    var btn = $('#tokBtn');
    btn.disabled = true;
    btn.textContent = 'در حال بررسی…';
    Promise.all([
      fetch('https://api.telegram.org/bot' + bot + '/getMe').then(function (r) { return r.json(); }),
      fetch('https://api.github.com/user', { headers: { 'Authorization': 'token ' + ght, 'User-Agent': 'binoosha-panel' } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    ]).then(function (res) {
      if (!res[0].ok) throw new Error('توکن ربات معتبر نیست');
      if (!res[1].ok) throw new Error('توکن گیت‌هاب معتبر نیست');
      if (res[1].j.login !== OWNER) throw new Error('این توکن گیت‌هاب به حساب ' + OWNER + ' تعلق ندارد');
      localStorage.setItem(LS.bot, bot);
      localStorage.setItem(LS.gh, ght);
      enterApp();
    }).catch(function (e) {
      err.textContent = e.message;
    }).finally(function () {
      btn.disabled = false;
      btn.textContent = 'اتصال و ورود';
    });
  }

  function logout() {
    logActionSafe('logout');
    sessionStorage.removeItem(LS.pw);
    location.reload();
  }

  /* ---------- رویدادها ---------- */
  $('#pwBtn').addEventListener('click', tryPassword);
  $('#pwInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryPassword(); });
  $('#tokBtn').addEventListener('click', tryTokens);
  $('#logoutBtn').addEventListener('click', logout);
  $('#syncBtn').addEventListener('click', syncNow);
  $('#surveyToggle').addEventListener('click', toggleSurvey);
  $('#expCsv').addEventListener('click', exportCsv);
  $('#expJson').addEventListener('click', function () {
    download('binoosha-responses.json', JSON.stringify(DATA.subs, null, 2), 'application/json');
    logAction('export-json');
  });
  $('#reTokBtn').addEventListener('click', function () {
    localStorage.removeItem(LS.bot);
    localStorage.removeItem(LS.gh);
    location.reload();
  });
  $('#respSearch').addEventListener('input', renderResponses);
  $('#respSort').addEventListener('change', renderResponses);
  Array.prototype.forEach.call(document.querySelectorAll('.navi'), function (b) {
    b.addEventListener('click', function () {
      document.querySelectorAll('.navi').forEach(function (x) { x.classList.remove('active'); });
      document.querySelectorAll('.view').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      $('#view-' + b.dataset.view).classList.add('active');
    });
  });
  addEventListener('resize', function () {
    clearTimeout(window._rz);
    window._rz = setTimeout(function () { if (!$('#app').classList.contains('hidden')) renderCharts(); }, 250);
  });

  /* ---------- شروع ---------- */
  if (sessionStorage.getItem(LS.pw) === '1') {
    if (localStorage.getItem(LS.bot) && localStorage.getItem(LS.gh)) enterApp();
    else { $('#gatePw').classList.add('hidden'); $('#gateTok').classList.remove('hidden'); }
  }
})();
