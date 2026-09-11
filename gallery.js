/* ══════════════════════════════════════════════════════════════
   Hangs the paintings in the room, and handles stepping in for
   a closer look. Add work in works.js — not here.

   How the room works:
   every painting's real dimensions are read out of its "size"
   field (height × width, in inches). One pixels-per-inch figure
   is applied to all of them, so a 24-inch canvas really is twice
   the height of a 12-inch one on screen. They're centred on a
   single line, the way paintings are hung in a real gallery —
   centres at eye level whatever the size.

   The wall photograph tiles sideways across the same strip the
   paintings sit on, so the whole room travels together.
   ══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var paintings = typeof PAINTINGS !== "undefined" ? PAINTINGS : [];
  var drawings  = typeof DRAWINGS  !== "undefined" ? DRAWINGS  : [];

  /* ─── Things you might want to tweak ───────────────────────── */

  var GAP_INCHES  = 26;    // bare wall between one canvas and the next
  var HANG_LINE   = 0.40;  // centre line, as a fraction of wall height
  var FILL_HEIGHT = 0.50;  // how much wall the tallest painting fills
  var FILL_WIDTH  = 0.36;  // ditto for the widest
  var ZOOM_FILL   = 0.74;  // how much of the screen a painting fills up close
  var ANCHOR      = 0.30;  // where the current painting sits across the wall
                           // (0 = hard left, 0.5 = middle)

  /* ─── Helpers ──────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tone(w) { return w.tone || "#6A6254"; }
  function altOf(w) { return w.alt || w.title; }

  // Reads "24 × 20 in" as 24 high by 20 wide.
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
    var meta = [w.year, w.medium, w.size].filter(Boolean).join(" &nbsp;·&nbsp; ");
    return '<span class="t">' + esc(w.title) + "</span>" +
           (meta ? '<span class="m">' + meta + "</span>" : "") +
           (extra ? '<span class="m">' + esc(extra) + "</span>" : "");
  }

  function imgOrBlock(src, altText, background) {
    return src
      ? '<img src="' + esc(src) + '" alt="' + esc(altText) +
        '" style="background:' + esc(background) + '">'
      : '<div class="fallback" style="background:' + esc(background) + '"></div>';
  }

  // A missing photo becomes the work's tone colour rather than a
  // broken-image icon.
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

  /* ─── The room ─────────────────────────────────────────────── */

  var room     = document.getElementById("paintings");
  var viewport = document.getElementById("wall-viewport");
  var camera   = document.getElementById("wall-camera");
  var strip    = document.getElementById("wall-strip");
  var countEl  = document.getElementById("wall-count");
  var prevBtn  = document.getElementById("wall-prev");
  var nextBtn  = document.getElementById("wall-next");

  var zoomBar    = document.getElementById("zoom-bar");
  var zoomLabel  = document.getElementById("zoom-label");
  var zoomThumbs = document.getElementById("zoom-thumbs");

  var hung = [];     // { el, centre, heightPx }
  var anchorX = 0.30;
  var atWall = 0;
  var zoomed = false;
  var viewIndex = 0;

  function buildWall() {
    if (!strip || !paintings.length) return;

    strip.innerHTML = paintings.map(function (w, i) {
      return '<button class="hung" type="button" data-wall="' + i + '"' +
             ' aria-label="' + esc(w.title) + '">' +
             '<span class="canvas">' + imgOrBlock(w.image, altOf(w), tone(w)) + "</span>" +
             '<span class="didactic">' + labelHTML(w) + "</span>" +
             "</button>";
    }).join("");

    hung = [].slice.call(strip.querySelectorAll(".hung")).map(function (el) {
      return { el: el, centre: 0, heightPx: 0 };
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
    // take more of it and hang closer together. The sizes relative
    // to each other never change — only the wall around them.
    var narrow = W < 700;
    var fillH = narrow ? 0.46 : FILL_HEIGHT;
    var fillW = narrow ? 0.60 : FILL_WIDTH;
    var gapIn = narrow ? 16 : GAP_INCHES;

    // A phone is too cramped to hold a painting off to one side,
    // so there it sits in the middle instead.
    anchorX = narrow ? 0.5 : ANCHOR;
    if (camera) {
      camera.style.transformOrigin =
        (anchorX * 100) + "% " + (HANG_LINE * 100) + "%";
    }

    var ppi = Math.min((H * fillH) / tallest, (W * fillW) / widest);
    var gap = gapIn * ppi;

    // Bare wall before the first painting and after the last, so
    // the tiled photograph never runs out at either end.
    var lead = W;
    var cursor = lead;

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
      hung[i].heightPx = hPx;
      cursor += wPx + gap;
    });

    strip.style.width = (cursor + lead) + "px";
    slideTo(atWall, true);
  }

  function slideTo(i, instant) {
    if (!hung.length) return;
    if (zoomed) stepBack();

    atWall = Math.max(0, Math.min(i, hung.length - 1));
    var offset = viewport.clientWidth * anchorX - hung[atWall].centre;

    if (instant) {
      var keep = strip.style.transition;
      strip.style.transition = "none";
      strip.style.transform = "translateX(" + offset + "px)";
      void strip.offsetWidth;
      strip.style.transition = keep;
    } else {
      strip.style.transform = "translateX(" + offset + "px)";
      if (camera) {
        camera.classList.remove("is-moving");
        void camera.offsetWidth;
        camera.classList.add("is-moving");
      }
    }

    hung.forEach(function (h, n) { h.el.classList.toggle("is-current", n === atWall); });

    if (countEl) countEl.textContent = (atWall + 1) + " / " + hung.length;
    if (prevBtn) prevBtn.disabled = atWall === 0;
    if (nextBtn) nextBtn.disabled = atWall === hung.length - 1;
  }

  /* ─── Stepping in for a closer look ────────────────────────── */

  function stepIn() {
    if (!hung.length || zoomed) return;
    var h = hung[atWall];
    var H = viewport.clientHeight;

    // Scale so the painting fills most of the screen, but never so
    // far that the photograph of the wall starts to fall apart.
    var scale = Math.min((H * ZOOM_FILL) / h.heightPx, 3.2);

    camera.classList.remove("is-moving");
    camera.style.transform = "scale(" + scale + ")";
    zoomed = true;
    viewIndex = 0;
    room.classList.add("is-zoomed");
    paintZoomBar();
    zoomBar.hidden = false;
  }

  function stepBack() {
    if (!zoomed) return;
    camera.style.transform = "";
    zoomed = false;
    room.classList.remove("is-zoomed");
    zoomBar.hidden = true;
    setCanvasImage(viewsOf(paintings[atWall])[0]);
  }

  function setCanvasImage(v) {
    if (!v) return;
    var img = hung[atWall].el.querySelector(".canvas img");
    if (img && v.image) img.src = v.image;
  }

  function paintZoomBar() {
    var w = paintings[atWall];
    var list = viewsOf(w);
    var v = list[viewIndex] || list[0] || { note: "" };

    zoomLabel.innerHTML = labelHTML(w, viewIndex > 0 ? (v.note || "Detail") : "");

    if (list.length > 1) {
      zoomThumbs.innerHTML = list.map(function (item, i) {
        return '<button class="zoom-thumb" type="button" data-view="' + i + '"' +
               ' aria-current="' + (i === viewIndex ? "true" : "false") + '"' +
               ' aria-label="' + (i === 0 ? "Whole painting" : "Detail " + i) + '">' +
               '<img src="' + esc(item.image) + '" alt=""></button>';
      }).join("");
    } else {
      zoomThumbs.innerHTML = "";
    }
  }

  /* ─── Drawings ─────────────────────────────────────────────── */

  function renderDrawings() {
    var el = document.getElementById("grid-drawings");
    if (!el) return;

    if (!drawings.length) {
      var section = el.closest ? el.closest("section") : null;
      if (section) {
        section.hidden = true;
        var link = document.querySelector('.nav a[href="#' + section.id + '"]');
        if (link) link.hidden = true;
      }
      return;
    }

    el.innerHTML = drawings.map(function (w) {
      return "<figure>" +
             '<span class="plate">' + imgOrBlock(w.image, altOf(w), tone(w)) + "</span>" +
             "<figcaption>" + labelHTML(w) + "</figcaption>" +
             "</figure>";
    }).join("");

    catchMissingImages(el);
  }

  /* ─── Interaction ──────────────────────────────────────────── */

  document.addEventListener("click", function (e) {
    var t = e.target;
    var find = function (sel) { return t.closest ? t.closest(sel) : null; };

    var thumb = find(".zoom-thumb");
    if (thumb) {
      viewIndex = Number(thumb.dataset.view);
      setCanvasImage(viewsOf(paintings[atWall])[viewIndex]);
      paintZoomBar();
      return;
    }

    if (find("#zoom-close")) { stepBack(); return; }

    // A painting off to one side slides into the middle; the one
    // already in the middle brings you closer.
    var onWall = find(".hung");
    if (onWall) {
      var n = Number(onWall.dataset.wall);
      if (zoomed) stepBack();
      else if (n === atWall) stepIn();
      else slideTo(n);
      return;
    }

    if (t.id === "wall-prev") { slideTo(atWall - 1); return; }
    if (t.id === "wall-next") { slideTo(atWall + 1); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && zoomed) { stepBack(); return; }
    if (e.key === "ArrowLeft")  slideTo(atWall - 1);
    if (e.key === "ArrowRight") slideTo(atWall + 1);
  });

  if (viewport) {
    var startX = null;
    viewport.addEventListener("touchstart", function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });

    viewport.addEventListener("touchend", function (e) {
      if (startX === null || zoomed) { startX = null; return; }
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
    resizeTimer = setTimeout(function () { stepBack(); layoutWall(); }, 150);
  });

  /* ─── Go ───────────────────────────────────────────────────── */

  buildWall();

  // Always open at the left end of the wall, on the first
  // painting in works.js. Reorder that list to change what
  // greets people.
  slideTo(0, true);

  window.addEventListener("load", layoutWall);

  renderDrawings();

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
