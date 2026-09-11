/* charts.js — موتور نمودار سبک و بدون وابستگی (canvas)
   donut / bars / area — با انیمیشن، tooltip و اعداد فارسی */
'use strict';
window.Charts = (function () {
  var PALETTE = ['#A78BFA', '#22D3EE', '#F472B6', '#34D399', '#FBBF24', '#818CF8', '#FB7185', '#2DD4BF', '#F59E0B', '#C084FC'];

  function fa(n) { return String(n).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; }); }

  var tip = null;
  function showTip(html, x, y) {
    if (!tip) { tip = document.createElement('div'); tip.className = 'ctip'; document.body.appendChild(tip); }
    tip.innerHTML = html;
    tip.style.opacity = '1';
    var w = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(x - w / 2, innerWidth - w - 8)) + 'px';
    tip.style.top = (y - 44) + 'px';
  }
  function hideTip() { if (tip) tip.style.opacity = '0'; }

  function setup(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    if (r.width < 10) r = { width: canvas.parentElement.clientWidth - 32, height: +canvas.getAttribute('height') || 200 };
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.height = r.height + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  function animate(draw) {
    var t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 750);
      var e = 1 - Math.pow(1 - p, 3);
      draw(e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- Donut ---------- */
  function donut(canvas, items) {
    items = items.filter(function (i) { return i.value > 0; });
    var total = items.reduce(function (s, i) { return s + i.value; }, 0);
    var hits = [];
    var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h;
    var cx = w * 0.34, cy = h / 2, R = Math.min(w * 0.30, h / 2 - 12), r0 = R * 0.62;

    function draw(p) {
      ctx.clearRect(0, 0, w, h);
      hits = [];
      var a0 = -Math.PI / 2;
      items.forEach(function (it, i) {
        var sweep = (it.value / total) * Math.PI * 2 * p;
        ctx.beginPath();
        ctx.arc(cx, cy, R, a0, a0 + sweep);
        ctx.arc(cx, cy, r0, a0 + sweep, a0, true);
        ctx.closePath();
        ctx.fillStyle = it.color || PALETTE[i % PALETTE.length];
        ctx.fill();
        hits.push({ a0: a0, a1: a0 + sweep, it: it });
        a0 += sweep;
      });
      ctx.fillStyle = '#EDEAF6';
      ctx.font = '700 22px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fa(Math.round(total * p)), cx, cy - 8);
      ctx.fillStyle = '#9A93B8';
      ctx.font = '11px Vazirmatn, sans-serif';
      ctx.fillText('مجموع', cx, cy + 14);

      // legend (RTL: از راست)
      var lx = w - 10, ly = cy - items.length * 11 + 6;
      ctx.textAlign = 'right';
      ctx.font = '12px Vazirmatn, sans-serif';
      items.forEach(function (it, i) {
        var y = ly + i * 22;
        ctx.fillStyle = it.color || PALETTE[i % PALETTE.length];
        roundRect(ctx, lx - 10, y - 5, 10, 10, 3); ctx.fill();
        ctx.fillStyle = '#9A93B8';
        ctx.fillText(it.label + '  ' + fa(it.value) + ' (' + fa(Math.round(it.value / total * 100)) + '٪)', lx - 16, y + 1);
      });
    }
    animate(draw);

    canvas.onmousemove = function (e) {
      var b = canvas.getBoundingClientRect();
      var x = e.clientX - b.left - cx, y = e.clientY - b.top - cy;
      var d = Math.sqrt(x * x + y * y);
      if (d < r0 || d > R) { hideTip(); return; }
      var a = Math.atan2(y, x); if (a < -Math.PI / 2) a += Math.PI * 2;
      for (var i = 0; i < hits.length; i++) {
        if (a >= hits[i].a0 && a < hits[i].a1) {
          showTip(hits[i].it.label + ': ' + fa(hits[i].it.value) + ' نفر', e.clientX, e.clientY);
          return;
        }
      }
      hideTip();
    };
    canvas.onmouseleave = hideTip;
  }

  /* ---------- Bars (vertical) ---------- */
  function bars(canvas, items, opt) {
    opt = opt || {};
    var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h;
    var padB = 26, padT = 14;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var bw = Math.min(46, (w - 20) / items.length - 10);
    var hits = [];

    function draw(p) {
      ctx.clearRect(0, 0, w, h);
      hits = [];
      var n = items.length;
      items.forEach(function (it, i) {
        var x = 10 + (w - 20) / n * (i + 0.5) - bw / 2;
        var bh = (h - padB - padT) * (it.value / max) * p;
        var y = h - padB - bh;
        var g = ctx.createLinearGradient(0, y, 0, h - padB);
        var c = it.color || opt.color || PALETTE[i % PALETTE.length];
        g.addColorStop(0, c);
        g.addColorStop(1, c + '55');
        ctx.fillStyle = g;
        roundRect(ctx, x, y, bw, Math.max(bh, 2), 7);
        ctx.fill();
        if (it.value > 0) {
          ctx.fillStyle = '#EDEAF6';
          ctx.font = '700 12px Vazirmatn, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(fa(it.value), x + bw / 2, y - 5);
        }
        ctx.fillStyle = '#9A93B8';
        ctx.font = '11px Vazirmatn, sans-serif';
        ctx.fillText(it.label, x + bw / 2, h - 8);
        hits.push({ x: x, y: y, bw: bw, it: it });
      });
    }
    animate(draw);

    canvas.onmousemove = function (e) {
      var b = canvas.getBoundingClientRect();
      var mx = e.clientX - b.left;
      for (var i = 0; i < hits.length; i++) {
        if (mx >= hits[i].x && mx <= hits[i].x + hits[i].bw) {
          showTip(hits[i].it.label + ': ' + fa(hits[i].it.value), e.clientX, e.clientY);
          return;
        }
      }
      hideTip();
    };
    canvas.onmouseleave = hideTip;
  }

  /* ---------- Horizontal bars ---------- */
  function hbars(canvas, items) {
    var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var rowH = Math.min(30, (h - 8) / items.length);
    var labelW = Math.min(96, w * 0.3);

    function draw(p) {
      ctx.clearRect(0, 0, w, h);
      items.forEach(function (it, i) {
        var y = 6 + i * rowH;
        ctx.fillStyle = '#9A93B8';
        ctx.font = '11.5px Vazirmatn, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(it.label, w - 4, y + rowH / 2);
        var bw = (w - labelW - 40) * (it.value / max) * p;
        var g = ctx.createLinearGradient(w - labelW - 10, 0, w - labelW - 10 + bw + 1, 0);
        g.addColorStop(0, (it.color || PALETTE[i % PALETTE.length]) + '66');
        g.addColorStop(1, it.color || PALETTE[i % PALETTE.length]);
        ctx.fillStyle = g;
        roundRect(ctx, w - labelW - 10 - Math.max(bw, 2), y + rowH * 0.22, Math.max(bw, 2), rowH * 0.56, 6);
        ctx.fill();
        ctx.fillStyle = '#EDEAF6';
        ctx.font = '700 11px Vazirmatn, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(fa(it.value), 6, y + rowH / 2);
      });
    }
    animate(draw);
    canvas.onmousemove = null;
  }

  /* ---------- Area (timeline) ---------- */
  function area(canvas, points) {
    var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h;
    var padB = 24, padT = 14, padX = 12;
    var max = Math.max.apply(null, points.map(function (p) { return p.y; }).concat([1]));
    var pts = [];

    function X(i) { return padX + (w - padX * 2) * (points.length < 2 ? 0.5 : i / (points.length - 1)); }
    function Y(v, p) { return h - padB - (h - padB - padT) * (v / max) * p; }

    function draw(p) {
      ctx.clearRect(0, 0, w, h);
      pts = points.map(function (pt, i) { return { x: X(i), y: Y(pt.y, p), pt: pt }; });
      if (!pts.length) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) {
        var xc = (pts[i - 1].x + pts[i].x) / 2;
        ctx.bezierCurveTo(xc, pts[i - 1].y, xc, pts[i].y, pts[i].x, pts[i].y);
      }
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(167,139,250,0.45)');
      grad.addColorStop(1, 'rgba(167,139,250,0.02)');
      ctx.save();
      ctx.lineTo(pts[pts.length - 1].x, h - padB);
      ctx.lineTo(pts[0].x, h - padB);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var j = 1; j < pts.length; j++) {
        var xc2 = (pts[j - 1].x + pts[j].x) / 2;
        ctx.bezierCurveTo(xc2, pts[j - 1].y, xc2, pts[j].y, pts[j].x, pts[j].y);
      }
      ctx.strokeStyle = '#A78BFA';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(167,139,250,0.8)';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
      pts.forEach(function (q) {
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0A0A14';
        ctx.fill();
        ctx.strokeStyle = '#22D3EE';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      ctx.fillStyle = '#9A93B8';
      ctx.font = '10px Vazirmatn, sans-serif';
      ctx.textAlign = 'center';
      var step = Math.ceil(points.length / 7);
      points.forEach(function (pt, i) {
        if (i % step === 0 || i === points.length - 1) ctx.fillText(pt.x_, X(i), h - 7);
      });
    }
    animate(draw);

    canvas.onmousemove = function (e) {
      var b = canvas.getBoundingClientRect();
      var mx = e.clientX - b.left, best = null, bd = 1e9;
      pts.forEach(function (q) { var d = Math.abs(q.x - mx); if (d < bd) { bd = d; best = q; } });
      if (best && bd < 40) showTip(best.pt.x_ + ' — ' + fa(best.pt.y) + ' نظر', e.clientX, e.clientY);
      else hideTip();
    };
    canvas.onmouseleave = hideTip;
  }

  return { donut: donut, bars: bars, hbars: hbars, area: area, fa: fa, PALETTE: PALETTE };
})();
