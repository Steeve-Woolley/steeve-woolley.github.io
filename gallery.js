/* ══════════════════════════════════════════════════════════════
   Hangs the paintings on the wall, draws the drawings grid, and
   runs the full-size viewer. You shouldn't need to edit this —
   add work in works.js instead.

   How the wall works, in case you ever want to change it:
   every painting's real dimensions are read out of its "size"
   field (height × width, in inches). One pixels-per-inch figure
   is worked out for the whole wall, so a 24-inch canvas really
   is twice the height of a 12-inch one on screen. All of them
   are centred on a single horizontal line, the way paintings are
   actually hung — centres at eye level whatever the size.
   ══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var paintings = typeof PAINTINGS !== "undefined" ? PAINTINGS : [];
  var drawings  = typeof DRAWINGS  !== "undefined" ? DRAWINGS  : [];
  var all = paintings.concat(drawings);

  /* ─── Things you might want to tweak ───────────────────────── */

  var GAP_INCHES  = 26;    // bare wall between one canvas and the next
  var HANG_LINE   = 0.44;  // height of the centre line, as a fraction
  var FILL_HEIGHT = 0.40;  // how much wall the tallest painting fills
  var FILL_WIDTH  = 0.34;  // ditto for the widest

  /* ─── Helpers ──────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tone(w) { return w.tone || "#6A6254"; }
  function altOf(w) { return w.alt || w.title; }

  // Reads "24 × 20 in" as 24 high by 20 wide. Falls back to a
  // sensible portrait shape if the size is missing or malformed.
  function dims(w) {
    var m = String(w.size || "").match(/([\d.]+)\s*[×x]\s*([\d.]+)/i);
    if (m) {
      var h = parseFloat(m[1]), wd = parseFloat(m[2]);
      if (h > 0 && wd > 0) return { h: h, w: wd };
    }
    return { h: 20, w: 16 };
  }

  function viewsOf(w) {
    var list = [];
    if (w.image) list.push({ image: w.image, note: "" });
    (w.details || []).forEach(function (d) {
      if (!d) return;
      if (typeof d === "string") list.push({ image: d, note: "" });
      else if (d.image) list.push({ image: d.image, note: d.note || "" });
    });
    return list;
  }

  function labelHTML(w, extra) {
    if (!w) return "";
    var bits = [w.year, w.medium, w.size].filter(Boolean);
    var count = (w.details || []).length;
    if (count && !extra) bits.push(count === 1 ? "1 detail view" : count + " detail views");
    var meta = bits.join(" &nbsp;·&nbsp; ");
    return '<span class="t">' + esc(w.title) + "</span>" +
           (meta ? '<span class="m">' + meta + "</span>" : "") +
           (extra ? '<span class="m note">' + esc(extra) + "</span>" : "");
  }

  function imgOrBlock(src, altText, background, extraClass) {
    return src
      ? '<img src="' + esc(src) + '" alt="' + esc(altText) +
        '" loading="lazy" style="background:' + esc(background) + '">'
      : '<div class="fallback' + (extraClass ? " " + extraClass : "") +
        '" style="background:' + esc(background) + '"></div>';
  }

  // A missing or misspelled photo becomes the work's tone colour
  // rather than a broken-image icon.
  function catchMissingImages(root) {
    var imgs = root.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].addEventListener("error", function () {
        var block = document.createElement("div");
        block.className = "fallback";
        block.style.background = this.style.background || "#6A6254";
        if (this.parentNode) this.parentNode.replaceChild(block, this);
      });
    }
  }

  /* ══════════════════════════════════════════════════════════
     THE WALL
     ══════════════════════════════════════════════════════════ */

  var viewport = document.getElementById("wall-viewport");
  var camera   = document.getElementById("wall-camera");
  var strip    = document.getElementById("wall-strip");
  var wallLabel = document.getElementById("wall-label");
  var wallCount = document.getElementById("wall-count");
  var prevBtn  = document.getElementById("wall-prev");
  var nextBtn  = document.getElementById("wall-next");

  var hung = [];   // one entry per painting: { el, centre }
  var atWall = 0;  // which painting is centred

  function buildWall() {
    if (!strip || !paintings.length) return;

    strip.innerHTML = paintings.map(function (w, i) {
      return '<button class="hung" type="button" data-wall="' + i + '"' +
             ' aria-label="' + esc(w.title) + '">' +
             '<span class="canvas">' +
             imgOrBlock(w.image, altOf(w), tone(w)) +
             "</span></button>";
    }).join("");

    hung = [].slice.call(strip.querySelectorAll(".hung")).map(function (el) {
      return { el: el, centre: 0 };
    });

    catchMissingImages(strip);
    layoutWall();
  }

  function layoutWall() {
    if (!viewport || !hung.length) return;

    var W = viewport.clientWidth;
    var H = viewport.clientHeight;

    var tallest = 0, widest = 0;
    paintings.forEach(function (w) {
      var d = dims(w);
      if (d.h > tallest) tallest = d.h;
      if (d.w > widest)  widest  = d.w;
    });

    // A phone has no room for a big empty wall, so the paintings
    // take up more of it and hang closer together. The relative
    // sizes between paintings never change — only how much wall
    // surrounds them.
    var narrow = W < 700;
    var fillH = narrow ? 0.46 : FILL_HEIGHT;
    var fillW = narrow ? 0.62 : FILL_WIDTH;
    var gapIn = narrow ? 14 : GAP_INCHES;

    // One scale for everything — this is what keeps the size
    // relationships between paintings honest.
    var ppi = Math.min((H * fillH) / tallest, (W * fillW) / widest);

    var gap = gapIn * ppi;
    var cursor = gap;

    paintings.forEach(function (w, i) {
      var d = dims(w);
      var wPx = d.w * ppi;
      var hPx = d.h * ppi;
      var el = hung[i].el;

      el.style.left   = cursor + "px";
      el.style.width  = wPx + "px";
      el.style.height = hPx + "px";
      el.style.top    = (H * HANG_LINE) + "px";

      hung[i].centre = cursor + wPx / 2;
      cursor += wPx + gap;
    });

    strip.style.width = cursor + "px";
    slideTo(atWall, true);
  }

  function slideTo(i, instant) {
    if (!hung.length) return;
    atWall = Math.max(0, Math.min(i, hung.length - 1));

    var offset = viewport.clientWidth / 2 - hung[atWall].centre;

    if (instant) {
      var keep = strip.style.transition;
      strip.style.transition = "none";
      strip.style.transform = "translateX(" + offset + "px)";
      void strip.offsetWidth;          // forces the browser to apply it now
      strip.style.transition = keep;
    } else {
      strip.style.transform = "translateX(" + offset + "px)";
      if (camera) {
        camera.classList.remove("is-moving");
        void camera.offsetWidth;       // restart the animation
        camera.classList.add("is-moving");
      }
    }

    hung.forEach(function (h, n) {
      h.el.classList.toggle("is-current", n === atWall);
    });

    if (wallLabel) wallLabel.innerHTML = labelHTML(paintings[atWall]);
    if (wallCount) wallCount.textContent = (atWall + 1) + " / " + hung.length;
    if (prevBtn) prevBtn.disabled = atWall === 0;
    if (nextBtn) nextBtn.disabled = atWall === hung.length - 1;
  }

  /* ─── Drawings grid ────────────────────────────────────────── */

  function renderGrid(containerId, works) {
    var el = document.getElementById(containerId);
    if (!el) return;

    // An empty room is hidden entirely, nav link and all.
    if (!works.length) {
      var section = el.closest ? el.closest("section") : null;
      if (section) {
        section.hidden = true;
        var link = document.querySelector('.nav a[href="#' + section.id + '"]');
        if (link) link.hidden = true;
      }
      return;
    }

    el.innerHTML = works.map(function (w) {
      return '<button class="work" type="button" data-index="' + all.indexOf(w) + '">' +
             '<span class="plate">' + imgOrBlock(w.image, altOf(w), tone(w)) + "</span>" +
             '<span class="label">' + labelHTML(w) + "</span>" +
             "</button>";
    }).join("");

    catchMissingImages(el);
  }

  /* ─── Full-size viewer ─────────────────────────────────────── */

  var viewer  = document.getElementById("viewer");
  var stage   = document.getElementById("viewer-stage");
  var caption = document.getElementById("viewer-label");
  var thumbs  = document.getElementById("viewer-thumbs");

  var current = 0;
  var view = 0;
  var lastFocused = null;

  function paint() {
    var w = all[current];
    if (!w) return;
    var list = viewsOf(w);
    var v = list[view] || { image: "", note: "" };

    stage.innerHTML = imgOrBlock(v.image, altOf(w) + (view > 0 ? " — detail" : ""), tone(w));
    catchMissingImages(stage);

    caption.innerHTML = labelHTML(w, view > 0 ? (v.note || "Detail") : "");

    if (list.length > 1) {
      thumbs.innerHTML = list.map(function (item, i) {
        return '<button class="viewer-thumb" type="button" data-view="' + i + '"' +
               ' aria-current="' + (i === view ? "true" : "false") + '"' +
               ' aria-label="' + (i === 0 ? "Whole painting" : "Detail " + i) + '">' +
               '<img src="' + esc(item.image) + '" alt="" style="background:' +
               esc(tone(w)) + '"></button>';
      }).join("");
      thumbs.hidden = false;
      catchMissingImages(thumbs);
    } else {
      thumbs.innerHTML = "";
      thumbs.hidden = true;
    }
  }

  function showWork(i) {
    if (!all.length) return;
    current = (i + all.length) % all.length;
    view = 0;
    paint();
  }

  function openViewer(i) {
    lastFocused = document.activeElement;
    showWork(i);
    viewer.hidden = false;
    document.body.classList.add("viewer-open");
    document.getElementById("viewer-close").focus();
  }

  function closeViewer() {
    viewer.hidden = true;
    document.body.classList.remove("viewer-open");
    if (lastFocused) lastFocused.focus();
  }

  /* ─── Interaction ──────────────────────────────────────────── */

  document.addEventListener("click", function (e) {
    var t = e.target;
    var find = function (sel) { return t.closest ? t.closest(sel) : null; };

    // On the wall: a painting off to one side slides into the
    // middle; the one already in the middle opens full-size.
    var onWall = find(".hung");
    if (onWall) {
      var n = Number(onWall.dataset.wall);
      if (n === atWall) openViewer(all.indexOf(paintings[n]));
      else slideTo(n);
      return;
    }

    if (t.id === "wall-prev") { slideTo(atWall - 1); return; }
    if (t.id === "wall-next") { slideTo(atWall + 1); return; }

    var work = find(".work");
    if (work) { openViewer(Number(work.dataset.index)); return; }

    var thumb = find(".viewer-thumb");
    if (thumb) { view = Number(thumb.dataset.view); paint(); return; }

    if (t.id === "viewer-close" || t === viewer) { closeViewer(); return; }
    if (t.id === "viewer-prev") { showWork(current - 1); return; }
    if (t.id === "viewer-next") { showWork(current + 1); }
  });

  document.addEventListener("keydown", function (e) {
    if (!viewer.hidden) {
      if (e.key === "Escape")     closeViewer();
      if (e.key === "ArrowLeft")  showWork(current - 1);
      if (e.key === "ArrowRight") showWork(current + 1);
      return;
    }
    // Viewer closed: the arrow keys walk along the wall.
    if (e.key === "ArrowLeft")  slideTo(atWall - 1);
    if (e.key === "ArrowRight") slideTo(atWall + 1);
  });

  // Swiping the wall on a phone.
  if (viewport) {
    var startX = null;
    viewport.addEventListener("touchstart", function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });

    viewport.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) slideTo(atWall + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  if (camera) {
    camera.addEventListener("animationend", function () {
      camera.classList.remove("is-moving");
    });
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layoutWall, 150);
  });

  /* ─── Go ───────────────────────────────────────────────────── */

  buildWall();

  // Open on the featured painting, if one is marked.
  var startAt = 0;
  paintings.forEach(function (w, i) { if (w.featured) startAt = i; });
  slideTo(startAt, true);

  // Photos load after the page does and can change the layout,
  // so measure again once everything has settled.
  window.addEventListener("load", layoutWall);

  renderGrid("grid-drawings", drawings);

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
