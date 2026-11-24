(function () {
  document.documentElement.classList.add("js");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector("#site-nav");
  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  const form = document.querySelector("#quote-form");

  // Event date: today or later only. min = today's local date keeps past days greyed out in the picker.
  const dateInput = form ? form.querySelector('input[name="date"]') : null;
  const todayLocal = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const checkDate = () => {
    if (!dateInput) return true;
    const min = todayLocal();
    dateInput.min = min;
    const past = dateInput.value && dateInput.value < min;
    dateInput.setCustomValidity(past ? "Pick today or a later date. Past dates can’t be booked." : "");
    return !past;
  };
  if (dateInput) {
    checkDate();
    dateInput.addEventListener("focus", checkDate);
    dateInput.addEventListener("input", checkDate);
    dateInput.addEventListener("change", checkDate);
    dateInput.addEventListener("click", () => {
      checkDate();
      if (typeof dateInput.showPicker === "function") {
        try { dateInput.showPicker(); } catch (err) { /* not allowed here; native control still works */ }
      }
    });
  }

  // Guest count: under 50 gets a friendly heads-up, never a hard block.
  const GUEST_MIN = 50;
  const guestInput = form ? form.querySelector('input[name="guests"]') : null;
  const guestDialog = document.getElementById("guest-dialog");
  let guestAcked = null; // the under-50 value the visitor already chose to keep
  let guestMode = "field";
  const guestsLow = () => {
    if (!guestInput || guestInput.value === "") return false;
    const n = Number(guestInput.value);
    return Number.isFinite(n) && n > 0 && n < GUEST_MIN;
  };
  const openGuestDialog = (mode) => {
    if (!guestDialog || typeof guestDialog.showModal !== "function") return false;
    guestMode = mode;
    guestDialog.querySelector('[data-guest="go"]').textContent = mode === "submit" ? "Send anyway" : "Keep it";
    if (!guestDialog.open) guestDialog.showModal();
    guestDialog.querySelector('[data-guest="change"]').focus();
    return true;
  };
  if (guestDialog && guestInput) {
    guestDialog.addEventListener("click", (e) => {
      const b = e.target.closest("[data-guest]");
      if (!b) return;
      if (b.dataset.guest === "change") {
        guestDialog.close("change");
      } else {
        guestAcked = guestInput.value;
        guestDialog.close("go");
      }
    });
    guestDialog.addEventListener("close", () => {
      if (guestDialog.returnValue === "go" && guestMode === "submit") {
        guestDialog.returnValue = "";
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.dispatchEvent(new Event("submit", { cancelable: true }));
        return;
      }
      guestDialog.returnValue = "";
      guestInput.focus();
      if (guestInput.select) guestInput.select();
    });
    guestInput.addEventListener("change", () => {
      if (guestsLow() && guestInput.value !== guestAcked) openGuestDialog("field");
    });
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const note = form.querySelector(".form-note");
      const btn = form.querySelector('button[type="submit"]');
      const show = (msg) => { if (note) { note.hidden = false; note.textContent = msg; } };
      if (!checkDate()) show(dateInput.validationMessage);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (guestsLow() && guestInput.value !== guestAcked && openGuestDialog("submit")) return;
      btn.disabled = true;
      show("Sending…");
      try {
        const res = await fetch("https://formsubmit.co/ajax/desisoundguys@gmail.com", {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || String(data.success) === "false") throw new Error(data.message || "failed");
        form.reset();
        guestAcked = null;
        show("Got it. We’ll be in touch soon.");
      } catch (err) {
        show("Couldn’t send right now. Email desisoundguys@gmail.com or call (206) 388-8696.");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
    const hero = document.querySelector(".hero-copy");
    if (hero) hero.classList.add("in");
  }

  async function urlExists(url) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async function firstExisting(urls) {
    for (const url of urls) {
      if (await urlExists(url)) return url;
    }
    return "";
  }


  // Hero backdrop: hero.mp4 (hero-mobile.mp4 on small screens if present)
  const heroEl = document.querySelector(".hero");
  const heroVideo = heroEl && heroEl.querySelector(".hero-video");
  if (heroEl && heroVideo) {
    (async () => {
      const poster = await firstExisting([
        "media/videos/hero.webp",
        "media/videos/hero.jpg",
        "media/videos/hero.jpeg"
      ]);
      if (poster) {
        heroVideo.setAttribute("poster", poster);
        heroEl.style.setProperty("--hero-poster", "url(\"" + poster + "\")");
        heroEl.classList.add("has-poster");
        heroEl.querySelector(".hero-stage").style.backgroundImage = "url(\"" + poster + "\")";
      }
      if (reduceMotion) return;
      const mobile = window.matchMedia("(max-width: 799px)").matches;
      const src = await firstExisting(
        mobile
          ? ["media/videos/hero-mobile.mp4", "media/videos/hero.mp4"]
          : ["media/videos/hero.mp4"]
      );
      if (!src) return;
      heroVideo.setAttribute("src", src);
      heroVideo.preload = "auto";
      heroVideo.load();
      heroEl.classList.add("has-video");
      const play = heroVideo.play();
      if (play && play.catch) play.catch(function () {});
    })();
  }

  // Effect tile clips: loaded and played only when visible and motion is OK; poster otherwise
  const reduceClips = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.querySelectorAll("video.fx-clip[data-src]").forEach((clip) => {
    let inView = false;
    const sync = () => {
      if (reduceClips.matches || !inView) { clip.pause(); return; }
      if (!clip.getAttribute("src")) clip.src = clip.dataset.src;
      const p = clip.play();
      if (p && p.catch) p.catch(function () {});
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; sync(); }, { rootMargin: "200px" }).observe(clip);
    } else { inView = true; sync(); }
    if (reduceClips.addEventListener) reduceClips.addEventListener("change", sync);
  });

  // Photos + lightbox
  // Gallery stays hidden (and unprobed) until real photos are added and the section is un-hidden
  const shots = Array.from(document.querySelectorAll("#gallery:not([hidden]) .shot[data-photo]"));
  const lightbox = document.querySelector("#lightbox");
  const lbImg = lightbox ? lightbox.querySelector("img") : null;
  const lbCap = lightbox ? lightbox.querySelector(".lightbox-cap") : null;
  let lbIndex = 0;

  shots.forEach((shot) => {
    const base = shot.getAttribute("data-photo");
    const img = shot.querySelector("img");
    firstExisting([base + ".webp", base + ".jpg", base + ".jpeg"]).then((url) => {
      if (!url || !img) return;
      img.src = url;
      img.hidden = false;
      shot.classList.add("has-photo");
    });
  });

  function openLightbox(index) {
    if (!lightbox || !lbImg || !shots.length) return;
    lbIndex = (index + shots.length) % shots.length;
    const shot = shots[lbIndex];
    const img = shot.querySelector("img");
    const cap = shot.querySelector("figcaption");
    const name = cap ? cap.querySelector("span") : null;
    if (img && img.getAttribute("src") && !img.hidden) {
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt || "";
    } else {
      lbImg.removeAttribute("src");
      lbImg.alt = "";
    }
    if (lbCap) {
      lbCap.textContent = name ? name.textContent : (cap ? cap.textContent.trim() : "");
    }
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    const closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
  }

  shots.forEach((shot, index) => {
    const btn = shot.querySelector(".shot-open");
    if (btn) btn.addEventListener("click", () => openLightbox(index));
  });

  if (lightbox) {
    const closeBtn = lightbox.querySelector(".lightbox-close");
    const prevBtn = lightbox.querySelector(".lightbox-prev");
    const nextBtn = lightbox.querySelector(".lightbox-next");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    if (prevBtn) prevBtn.addEventListener("click", () => openLightbox(lbIndex - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => openLightbox(lbIndex + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") openLightbox(lbIndex - 1);
      if (event.key === "ArrowRight") openLightbox(lbIndex + 1);
    });
  }
})();

// YouTube: load the player only when a card is clicked
function bindYt(card) {
  card.addEventListener('click', function () {
    if (card.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + card.dataset.yt + '?autoplay=1&rel=0';
    f.title = card.getAttribute('aria-label');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    card.innerHTML = '';
    card.appendChild(f);
  });
}
document.querySelectorAll('.yt-card').forEach(bindYt);

// Effects explained: one detail dialog at a time, built from the matching panel
(function () {
  var dialog = document.getElementById('fx-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    document.documentElement.classList.remove('js');
    return;
  }
  var body = dialog.querySelector('.fx-dialog-body');
  var closeBtn = dialog.querySelector('.fx-close');
  var lastBtn = null;
  function open(btn) {
    var panel = document.getElementById('fx-' + btn.dataset.fx);
    if (!panel) return;
    if (lastBtn && lastBtn !== btn) lastBtn.setAttribute('aria-expanded', 'false');
    var copy = panel.cloneNode(true);
    copy.removeAttribute('id');
    var h = copy.querySelector('h3');
    if (h) h.id = 'fx-dialog-title';
    var img = copy.querySelector('img');
    if (img) img.loading = 'eager';
    // Stacked layout: title + text first, then the tile's own clip at full width.
    // No photos in pop-ups: tiles without a clip get a video placeholder.
    copy.querySelectorAll('.fx-photo').forEach(function (el) { el.remove(); });
    var tileClip = btn.querySelector('video.fx-clip[data-src]');
    var media;
    if (tileClip) {
      media = document.createElement('video');
      media.className = 'fx-photo fx-pop-clip';
      media.muted = true; media.loop = true; media.playsInline = true;
      media.setAttribute('muted', ''); media.setAttribute('playsinline', '');
      media.preload = 'auto';
      media.poster = tileClip.getAttribute('poster') || '';
      media.setAttribute('aria-label', tileClip.getAttribute('aria-label') || '');
      media.width = tileClip.width; media.height = tileClip.height;
      media.src = tileClip.dataset.src;
    } else {
      media = document.createElement('span');
      media.className = 'fx-photo fx-ph';
      media.innerHTML = '<span class="need">[Add: video]</span>';
    }
    copy.appendChild(media);
    var slot = copy.querySelector('.fx-video');
    if (slot && !(panel.dataset.yt || '').trim()) { slot.remove(); slot = null; }
    var yt = (panel.dataset.yt || '').trim();
    var name = h ? h.textContent : 'Effect';
    if (slot) {
      if (yt) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'yt-card';
        card.dataset.yt = yt;
        card.setAttribute('aria-label', 'Play: ' + name);
        card.innerHTML = '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(yt) + '/hqdefault.jpg" alt="" width="480" height="360"><span class="yt-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>';
        slot.appendChild(card);
        bindYt(card);
      } else {
        slot.innerHTML = '<div class="fx-video-ph"><span class="need">[Add: video]</span></div>';
      }
    }
    body.innerHTML = '';
    body.appendChild(copy);
    lastBtn = btn;
    btn.setAttribute('aria-expanded', 'true');
    if (!dialog.open) dialog.showModal();
    closeBtn.focus();
    var popClip = body.querySelector('video.fx-pop-clip');
    if (popClip && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var pp = popClip.play();
      if (pp && pp.catch) pp.catch(function () {});
    }
  }
  document.querySelectorAll('.fx-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { open(btn); });
  });
  function cleanup() {
    var popClip = body.querySelector('video.fx-pop-clip');
    if (popClip) { popClip.pause(); popClip.removeAttribute('src'); popClip.load(); }
    body.innerHTML = '';
    if (lastBtn) {
      lastBtn.setAttribute('aria-expanded', 'false');
      lastBtn.focus();
      lastBtn = null;
    }
  }
  function closeFx() {
    if (dialog.open) dialog.close();
    cleanup();
  }
  closeBtn.addEventListener('click', closeFx);
  dialog.addEventListener('click', function (e) { if (e.target === dialog) closeFx(); });
  dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeFx(); });
  dialog.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); closeFx(); } });
  dialog.addEventListener('close', cleanup);
})();

// ===== Alive 1: index children so they cascade =====
document.querySelectorAll(".svc-grid, .fx-grid, .steps, .review-grid, .reviews-grid").forEach(function (g) {
  Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--i", i); });
});

// ===== Alive 3: count-up on trust row =====
(function () {
  var row = document.querySelector(".trust-row");
  if (!row) return;
  var targets = [];
  row.querySelectorAll("strong").forEach(function (s) {
    var t = s.firstChild;
    if (!t || t.nodeType !== 3) return;
    var m = t.nodeValue.match(/^(\d+(?:\.\d)?)(.*)$/);
    if (!m) return;
    s.setAttribute("data-count", "");
    targets.push({ node: t, end: parseFloat(m[1]), dec: m[1].indexOf(".") > -1 ? 1 : 0, rest: m[2] });
  });
  if (!targets.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  targets.forEach(function (o) { o.node.nodeValue = (0).toFixed(o.dec) + o.rest; });
  new IntersectionObserver(function (entries, obs) {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    var t0 = performance.now(), dur = 1400;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      targets.forEach(function (o) { o.node.nodeValue = (o.end * e).toFixed(o.dec) + o.rest; });
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }, { threshold: 0.4 }).observe(row);
})();

// ===== Alive 5: cursor spotlight on dark sections (mouse/trackpad only, off for reduced motion) =====
(function () {
  if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.add("spot-on");
  var secs = document.querySelectorAll(".services, .book, .hero-strip, .lighting-section, .team");
  var raf = 0, last = null, active = null;
  function paint() {
    raf = 0;
    if (!last) return;
    var r = last.sec.getBoundingClientRect();
    last.sec.style.setProperty("--mx", (last.x - r.left) + "px");
    last.sec.style.setProperty("--my", (last.y - r.top) + "px");
  }
  secs.forEach(function (sec) {
    sec.addEventListener("pointermove", function (e) {
      if (active !== sec) { if (active) active.style.setProperty("--spot", "0"); active = sec; sec.style.setProperty("--spot", "1"); }
      last = { sec: sec, x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    sec.addEventListener("pointerleave", function () { sec.style.setProperty("--spot", "0"); if (active === sec) active = null; });
  });
})();

// ===== Alive 6: header state on scroll =====
(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;
  var ticking = false;
  function update() { ticking = false; header.classList.toggle("is-scrolled", window.scrollY > 40); }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
})();
