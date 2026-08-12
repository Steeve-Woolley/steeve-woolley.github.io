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

  // Builds the little museum label that sits under each piece.
  function labelHTML(w) {
    var meta = [w.year, w.medium, w.size].filter(Boolean).join(" &nbsp;·&nbsp; ");
    return '<span class="t">' + esc(w.title) + "</span>" +
           (meta ? '<span class="m">' + meta + "</span>" : "");
  }

  function plateHTML(w) {
    var inner = w.image
      ? '<img src="' + esc(w.image) + '" alt="' + esc(w.title) +
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

    if (!works.length) {
      el.innerHTML = '<p class="room-note">Nothing hung here yet.</p>';
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
  var current = 0;
  var lastFocused = null;

  function show(i) {
    if (!all.length) return;
    current = (i + all.length) % all.length;   // wraps around at both ends
    var w = all[current];

    stage.innerHTML = w.image
      ? '<img src="' + esc(w.image) + '" alt="' + esc(w.title) +
        '" style="background:' + esc(tone(w)) + '">'
      : '<div class="fallback" style="background:' + esc(tone(w)) + '"></div>';

    catchMissingImages(stage);
    caption.innerHTML = labelHTML(w);
  }

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
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
    var work = e.target.closest ? e.target.closest(".work") : null;
    if (work) { open(Number(work.dataset.index)); return; }

    if (e.target.id === "viewer-close" || e.target === viewer) { close(); return; }
    if (e.target.id === "viewer-prev") { show(current - 1); return; }
    if (e.target.id === "viewer-next") { show(current + 1); }
  });

  document.addEventListener("keydown", function (e) {
    if (viewer.hidden) return;
    if (e.key === "Escape")     close();
    if (e.key === "ArrowLeft")  show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  /* ─── Go ───────────────────────────────────────────────────── */

  renderHero();
  render("grid-paintings", paintings, 0);
  render("grid-drawings",  drawings,  paintings.length);

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
