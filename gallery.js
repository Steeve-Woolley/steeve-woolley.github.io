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

  /* ─────────────────────────────────────────────────────────────
     Photographs of paintings on canvas carry a fine, perfectly
     regular weave. Shrink one straight from 2400 pixels down to
     200 and that weave beats against the pixel grid, producing
     moiré — the shimmering bands you see on a striped shirt on
     television. Browsers use a fast, cheap downscaler that
     aliases badly at those ratios.

     So we do it ourselves: halve the image repeatedly until it's
     within twice the size we need, then make the last step. Each
     halving averages four pixels into one, which removes the fine
     detail that would otherwise alias. Slower than letting the
     browser do it, and worth every millisecond.
     ───────────────────────────────────────────────────────────── */

  function smoothCanvas(cv) {
    var ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    return ctx;
  }

  // Draws `img` into `cv` at `cssW` × `cssH`, cropped to fill like
  // object-fit: cover. `factor` lets us re-render sharper when the
  // camera has stepped in close.
  function drawShot(cv, img, cssW, cssH, factor) {
    if (!img.naturalWidth || !cssW || !cssH) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var tw = Math.round(cssW * dpr * (factor || 1));
    var th = Math.round(cssH * dpr * (factor || 1));

    // Never ask for more pixels than the photograph actually has.
    var cap = Math.min(img.naturalWidth / cssW, 4) * cssW * dpr;
    if (tw > cap) { th = Math.round(th * cap / tw); tw = Math.round(cap); }
    if (tw < 1 || th < 1) return;

    // Which part of the photo to use, matching object-fit: cover.
    var fill = Math.max(tw / img.naturalWidth, th / img.naturalHeight);
    var sw = Math.min(img.naturalWidth, tw / fill);
    var sh = Math.min(img.naturalHeight, th / fill);
    var sx = (img.naturalWidth - sw) / 2;
    var sy = (img.naturalHeight - sh) / 2;

    // Step down by halves until we're within 2× of the target.
    var cur = img, cw = sw, ch = sh, ox = sx, oy = sy;

    while (cw > tw * 2 && ch > th * 2) {
      var nw = Math.max(tw, Math.round(cw / 2));
      var nh = Math.max(th, Math.round(ch / 2));
      var step = document.createElement("canvas");
      step.width = nw; step.height = nh;
      smoothCanvas(step).drawImage(cur, ox, oy, cw, ch, 0, 0, nw, nh);
      cur = step; cw = nw; ch = nh; ox = 0; oy = 0;
    }

    cv.width = tw;
    cv.height = th;
    smoothCanvas(cv).drawImage(cur, ox, oy, cw, ch, 0, 0, tw, th);
    cv.dataset.drawn = "1";
  }

  // Each painting gets a canvas rather than an <img>. Keeps the
  // loaded photo on the element so it can be redrawn on resize or
  // when the camera moves closer.
  function mountShot(holder, src, altText, background, cssW, cssH, onReady) {
    holder.style.background = background;

    if (!src) {
      holder.innerHTML = '<div class="fallback" style="background:' +
                         esc(background) + '"></div>';
      return;
    }

    var cv = document.createElement("canvas");
    cv.className = "shot";
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", altText);
    holder.innerHTML = "";
    holder.appendChild(cv);

    var img = new Image();
    img.decoding = "async";

    img.onload = function () {
      holder._shot = { img: img, cv: cv };
      var w = cssW || holder.clientWidth;
      var h = cssH || Math.round(w * img.naturalHeight / img.naturalWidth);
      drawShot(cv, img, w, h, 1);
      if (onReady) onReady(img);
    };

    // A missing photo becomes the work's tone colour rather than a
    // broken-image icon.
    img.onerror = function () {
      holder.innerHTML = '<div class="fallback" style="background:' +
                         esc(background) + '"></div>';
    };

    img.src = src;
  }

  function redrawShot(holder, cssW, cssH, factor) {
    if (holder && holder._shot) {
      drawShot(holder._shot.cv, holder._shot.img, cssW, cssH, factor);
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

  var hung = [];     // { el, centre, widthPx, heightPx }
  var anchorX = 0.30;
  var atWall = 0;
  var zoomed = false;
  var viewIndex = 0;

  function buildWall() {
    if (!strip || !paintings.length) return;

    strip.innerHTML =
      paintings.map(function (w, i) {
        return '<button class="hung" type="button" data-wall="' + i + '"' +
               ' aria-label="' + esc(w.title) + '">' +
               '<span class="canvas"></span>' +
               '<span class="didactic">' + labelHTML(w) + "</span>" +
               "</button>";
      }).join("") +
      // Close-ups hang to the right of their painting, on the bare
      // wall between it and the next one. They stay invisible until
      // you step in.
      paintings.map(function (w, i) {
        var list = w.details || [];
        if (!list.length) return "";
        return '<div class="details" data-for="' + i + '">' +
               list.map(function (d, j) {
                 return '<span class="detail" data-detail="' + j + '"></span>';
               }).join("") +
               "</div>";
      }).join("");

    hung = [].slice.call(strip.querySelectorAll(".hung")).map(function (el) {
      return { el: el, centre: 0, widthPx: 0, heightPx: 0 };
    });

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
      hung[i].widthPx = wPx;

      // First pass mounts the photo; later passes (a resize) just
      // redraw it at the new size.
      // Geometry now; the photograph itself only when you're near.
      var holder = el.querySelector(".canvas");
      if (holder._shot) redrawShot(holder, wPx, hPx, 1);

      layoutDetails(i, cursor, wPx, hPx, H);

      cursor += wPx + gap;
    });

    strip.style.width = (cursor + lead) + "px";
    slideTo(atWall, true);
  }

  // A stack of close-ups on the wall to the right of a painting,
  // sized so the group reads as secondary to the work itself.
  function layoutDetails(i, paintingLeft, wPx, hPx, H) {
    var box = strip.querySelector('.details[data-for="' + i + '"]');
    if (!box) return;

    var kids = box.querySelectorAll(".detail");
    var n = kids.length;
    var gapY = hPx * 0.06;

    // Each close-up gets the same slot height; its width follows
    // from its own proportions, so nothing is cropped. The width
    // cap keeps a wide landscape close-up from overpowering the
    // painting it belongs to.
    var slotH = Math.min((hPx - (n - 1) * gapY) / n, hPx * 0.5);
    var maxW  = wPx * 0.72;

    box.style.left   = (paintingLeft + wPx + wPx * 0.18) + "px";
    box.style.top    = (H * HANG_LINE) + "px";
    box.style.height = "";          // shrink to fit, so it stays centred
    box.style.width  = "";
    box.style.gap    = gapY + "px";

    for (var k = 0; k < n; k++) fitDetail(kids[k], slotH, maxW);

    box._slotH = slotH;
    box._maxW = maxW;
  }

  function fitDetail(el, slotH, maxW) {
    var h = slotH;
    var w = slotH;                                   // square until we know better
    var img = el._shot && el._shot.img;

    if (img && img.naturalWidth && img.naturalHeight) {
      w = h * (img.naturalWidth / img.naturalHeight);
      if (w > maxW) { h = h * maxW / w; w = maxW; }  // too wide: give back height
    }

    el.style.width  = Math.round(w) + "px";
    el.style.height = Math.round(h) + "px";
    if (img) redrawShot(el, Math.round(w), Math.round(h), 1);
  }

  // Photos for the close-ups aren't fetched until someone actually
  // steps in — no sense loading them for visitors who never do.
  function mountDetails(i) {
    var w = paintings[i];
    var box = strip.querySelector('.details[data-for="' + i + '"]');
    if (!box || !w.details) return;

    var kids = box.querySelectorAll(".detail");
    var slotH = box._slotH || 160;
    var maxW = box._maxW || 240;

    [].slice.call(kids).forEach(function (el, k) {
      if (el._shot) return;
      var d = w.details[k];
      var src = typeof d === "string" ? d : (d && d.image);
      mountShot(el, src, w.title + " — detail " + (k + 1), tone(w), slotH, slotH,
                function () { fitDetail(el, slotH, maxW); });
    });
  }

  function showDetails(i, on) {
    var box = strip.querySelector('.details[data-for="' + i + '"]');
    if (box) box.classList.toggle("is-showing", !!on);
  }

  function hideAllDetails() {
    var boxes = strip.querySelectorAll(".details");
    for (var k = 0; k < boxes.length; k++) boxes[k].classList.remove("is-showing");
  }

  function isNarrow() { return viewport.clientWidth < 700; }

  // How many paintings either side of you to keep loaded.
  var NEARBY = 1;

  function ensureLoaded(i) {
    if (i < 0 || i >= paintings.length || !hung[i]) return;
    var holder = hung[i].el.querySelector(".canvas");
    if (!holder || holder._shot || holder._mounting) return;
    holder._mounting = true;
    var w = paintings[i];
    mountShot(holder, w.image, altOf(w), tone(w), hung[i].widthPx, hung[i].heightPx);
  }

  function loadNearby() {
    for (var d = 0; d <= NEARBY; d++) {
      ensureLoaded(atWall - d);
      ensureLoaded(atWall + d);
    }
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

    loadNearby();

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

    // Up close there are more pixels to fill, so redraw from the
    // original photo at the larger size rather than stretching
    // the version made for the wall.
    redrawShot(h.el.querySelector(".canvas"), h.widthPx, h.heightPx, scale);

    // On a wide screen the close-ups hang beside the painting. A
    // phone has no room beside anything, so there they stay in the
    // bar at the bottom.
    if (!isNarrow()) {
      mountDetails(atWall);
      showDetails(atWall, true);
    }
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
    hideAllDetails();
    setCanvasImage(viewsOf(paintings[atWall])[0]);
    var back = hung[atWall];
    redrawShot(back.el.querySelector(".canvas"), back.widthPx, back.heightPx, 1);
  }

  function setCanvasImage(v) {
    if (!v || !v.image) return;
    var h = hung[atWall];
    var holder = h.el.querySelector(".canvas");
    var w = paintings[atWall];
    mountShot(holder, v.image, altOf(w), tone(w), h.widthPx, h.heightPx);
    // Redraw at the close-up size once the new photo has loaded.
    var factor = zoomed ? Math.min((viewport.clientHeight * ZOOM_FILL) / h.heightPx, 3.2) : 1;
    setTimeout(function () {
      redrawShot(holder, h.widthPx, h.heightPx, factor);
    }, 60);
  }

  function paintZoomBar() {
    var w = paintings[atWall];
    var list = viewsOf(w);
    var v = list[viewIndex] || list[0] || { note: "" };

    zoomLabel.innerHTML = labelHTML(w, viewIndex > 0 ? (v.note || "Detail") : "");

    if (list.length > 1 && isNarrow()) {
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
      var d = dims(w);
      return "<figure>" +
             '<span class="plate" style="aspect-ratio:' + d.w + "/" + d.h + '"></span>' +
             "<figcaption>" + labelHTML(w) + "</figcaption>" +
             "</figure>";
    }).join("");

    // Same staged downscale as the wall — drawings on textured
    // paper alias just as readily as canvas weave.
    [].slice.call(el.querySelectorAll(".plate")).forEach(function (holder, i) {
      var w = drawings[i];
      var box = holder.getBoundingClientRect();
      mountShot(holder, w.image, altOf(w), tone(w),
                Math.round(box.width), Math.round(box.height));
    });
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
