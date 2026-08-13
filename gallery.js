/* ══════════════════════════════════════════════════════════════
   This file hangs the work on the wall and runs the full-size
   viewer. You shouldn't need to edit it — add paintings in
   works.js instead.
   ══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  var paintings = typeof PAINTINGS !== "undefined" ? PAINTINGS : [];
  var drawings  = typeof DRAWINGS  !== "undefined" ? DRAWINGS  : [];

  // One flat list, so the arrows in the viewer can walk through
  // everything in the order it appears on the page.
  var all = paintings.concat(drawings);

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function tone(w) { return w.tone || "#6A6254"; }

  // The whole painting first, then each close-up after it.
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

  // The little museum label that sits under each piece.
  function labelHTML(w, extra) {
    var bits = [w.year, w.medium, w.size].filter(Boolean);
    var count = (w.details || []).length;
    if (count && !extra) {
      bits.push(count === 1 ? "1 detail view" : count + " detail views");
    }
    var meta = bits.join(" &nbsp;·&nbsp; ");
    return '<span class="t">' + esc(w.title) + "</span>" +
           (meta ? '<span class="m">' + meta + "</span>" : "") +
           (extra ? '<span class="m note">' + esc(extra) + "</span>" : "");
  }

  function altOf(w) { return w.alt || w.title; }

  function plateHTML(w) {
    var inner = w.image
      ? '<img src="' + esc(w.image) + '" alt="' + esc(altOf(w)) +
        '" loading="lazy" style="background:' + esc(tone(w)) + '">'
      : '<div class="fallback" style="background:' + esc(tone(w)) + '"></div>';
    return '<div class="plate">' + inner + "</div>";
  }

  // If a photo is missing or misspelled, swap in the work's tone
  // colour rather than showing a broken-image icon.
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

  function workHTML(w, index) {
    return '<button class="work" type="button" data-index="' + index + '">' +
           plateHTML(w) +
           '<span class="label">' + labelHTML(w) + "</span>" +
           "</button>";
  }

  function render(containerId, works, offset) {
    var el = document.getElementById(containerId);
    if (!el) return;

    // An empty room is hidden entirely, along with its nav link,
    // rather than shown empty.
    if (!works.length) {
      var section = el.closest ? el.closest("section") : null;
      if (section) {
        section.hidden = true;
        var link = document.querySelector('.nav a[href="#' + section.id + '"]');
        if (link) link.hidden = true;
      }
      return;
    }

    el.innerHTML = works.map(function (w, i) {
      return workHTML(w, offset + i);
    }).join("");

    catchMissingImages(el);
  }

  function renderHero() {
    var el = document.getElementById("hero");
    if (!el) return;

    var pick = all.filter(function (w) { return w.featured; })[0] || all[0];
    if (!pick) { el.hidden = true; return; }

    el.innerHTML = workHTML(pick, all.indexOf(pick));
    catchMissingImages(el);
  }

  /* ─── The full-size viewer ─────────────────────────────────── */

  var viewer  = document.getElementById("viewer");
  var stage   = document.getElementById("viewer-stage");
  var caption = document.getElementById("viewer-label");
  var thumbs  = document.getElementById("viewer-thumbs");

  var current = 0;   // which work
  var view    = 0;   // which photo of that work
  var lastFocused = null;

  function paint() {
    var w = all[current];
    var list = viewsOf(w);
    var v = list[view] || { image: "", note: "" };

    stage.innerHTML = v.image
      ? '<img src="' + esc(v.image) + '" alt="' + esc(altOf(w)) +
        (view > 0 ? " — detail" : "") + '" style="background:' + esc(tone(w)) + '">'
      : '<div class="fallback" style="background:' + esc(tone(w)) + '"></div>';
    catchMissingImages(stage);

    caption.innerHTML = labelHTML(w, view > 0 ? (v.note || "Detail") : "");

    // Thumbnails only appear when there's more than one photo.
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
    current = (i + all.length) % all.length;   // wraps around at both ends
    view = 0;
    paint();
  }

  function showView(n) {
    view = n;
    paint();
  }

  function open(i) {
    lastFocused = document.activeElement;
    showWork(i);
    viewer.hidden = false;
    document.body.classList.add("viewer-open");
    document.getElementById("viewer-close").focus();
  }

  function close() {
    viewer.hidden = true;
    document.body.classList.remove("viewer-open");
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target;

    var work = t.closest ? t.closest(".work") : null;
    if (work) { open(Number(work.dataset.index)); return; }

    var thumb = t.closest ? t.closest(".viewer-thumb") : null;
    if (thumb) { showView(Number(thumb.dataset.view)); return; }

    if (t.id === "viewer-close" || t === viewer) { close(); return; }
    if (t.id === "viewer-prev") { showWork(current - 1); return; }
    if (t.id === "viewer-next") { showWork(current + 1); }
  });

  document.addEventListener("keydown", function (e) {
    if (viewer.hidden) return;
    if (e.key === "Escape")     close();
    if (e.key === "ArrowLeft")  showWork(current - 1);
    if (e.key === "ArrowRight") showWork(current + 1);
  });

  /* ─── Go ───────────────────────────────────────────────────── */

  renderHero();
  render("grid-paintings", paintings, 0);
  render("grid-drawings",  drawings,  paintings.length);

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
