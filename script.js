(function () {
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
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const note = form.querySelector(".form-note");
      const btn = form.querySelector('button[type="submit"]');
      const show = (msg) => { if (note) { note.hidden = false; note.textContent = msg; } };
      if (!form.checkValidity()) { form.reportValidity(); return; }
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

  // Photos + lightbox
  const shots = Array.from(document.querySelectorAll(".shot[data-photo]"));
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
      lbCap.textContent = name ? name.textContent : (cap ? cap.textContent.trim() : "photo goes here");
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
document.querySelectorAll('.yt-card').forEach(function (card) {
  card.addEventListener('click', function () {
    if (card.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + card.dataset.yt + '?autoplay=1&rel=0';
    f.title = card.getAttribute('aria-label');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    card.innerHTML = '';
    card.appendChild(f);
  });
});
