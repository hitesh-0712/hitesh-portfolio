/* ==========================================================================
   HITESH SADHU — PREMIUM INTERACTIVE JS
   Real GSAP ScrollTrigger + Lenis Smooth Scroll + Micro-interactions
   ========================================================================== */

(function () {
  'use strict';

  // =========================================================
  // 1. LENIS SMOOTH SCROLL
  // =========================================================
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Connect Lenis to GSAP ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Anchor links smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) lenis.scrollTo(target, { offset: -80 });
    });
  });

  // =========================================================
  // 2. CUSTOM CURSOR
  // =========================================================
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  let mouseX = 0, mouseY = 0;
  let dotX = 0, dotY = 0;
  let ringX = 0, ringY = 0;

  if (dot && ring && window.innerWidth > 768) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateCursor() {
      // Dot follows immediately
      dotX += (mouseX - dotX) * 0.35;
      dotY += (mouseY - dotY) * 0.35;
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';

      // Ring follows with lag
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';

      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover effect on interactive elements
    const hoverTargets = document.querySelectorAll('a, button, .creative-card, .magnetic, .bento-card');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });
  }

  // =========================================================
  // 3. NAVIGATION SCROLL EFFECT
  // =========================================================
  const nav = document.getElementById('nav');
  ScrollTrigger.create({
    start: 'top -80',
    onUpdate: (self) => {
      if (self.progress > 0) {
        nav.classList.add('scrolled');
        nav.style.padding = '12px 24px';
      } else {
        nav.classList.remove('scrolled');
        nav.style.padding = '';
      }
    }
  });

  // Active nav scrollspy
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  ScrollTrigger.create({
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: () => {
      let current = '';
      const scrollY = window.scrollY;
      sections.forEach(section => {
        const top = section.offsetTop - 200;
        const height = section.offsetHeight;
        if (scrollY >= top && scrollY < top + height) {
          current = section.getAttribute('id');
        }
      });
      navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });
    }
  });

  // =========================================================
  // 4. GSAP TEXT REVEAL ANIMATIONS
  // =========================================================
  // Animate .reveal-text elements (inside overflow:hidden wrappers)
  gsap.utils.toArray('.reveal-text').forEach((text) => {
    gsap.fromTo(text,
      { yPercent: 110 },
      {
        yPercent: 0,
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: text.parentElement,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    );
  });

  // Animate .reveal-up elements
  gsap.utils.toArray('.reveal-up').forEach((el) => {
    gsap.fromTo(el,
      { y: 30, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none none',
        }
      }
    );
  });

  // =========================================================
  // 5. STAGGERED CARD REVEALS
  // =========================================================
  // Bento cards
  gsap.utils.toArray('.bento-card').forEach((card) => {
    gsap.fromTo(card,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          toggleActions: 'play none none none',
        }
      }
    );
  });

  // Step cards - stagger within grid
  const stepCards = gsap.utils.toArray('.step-card');
  if (stepCards.length) {
    gsap.fromTo(stepCards,
      { y: 40, opacity: 0, scale: 0.97 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: stepCards[0].parentElement,
          start: 'top 80%',
          toggleActions: 'play none none none',
        }
      }
    );
  }

  // Skill tiles - stagger
  const skillTiles = gsap.utils.toArray('.skill-tile');
  if (skillTiles.length) {
    gsap.fromTo(skillTiles,
      { x: -20, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: {
          trigger: skillTiles[0].parentElement,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    );
  }

  // Creative cards - stagger
  const creativeCards = gsap.utils.toArray('.creative-card');
  if (creativeCards.length) {
    gsap.fromTo(creativeCards,
      { y: 50, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: {
          trigger: document.getElementById('gallery'),
          start: 'top 80%',
          toggleActions: 'play none none none',
        }
      }
    );
  }

  // Metric cards - stagger
  const metricCards = gsap.utils.toArray('.metric-card');
  if (metricCards.length) {
    gsap.fromTo(metricCards,
      { y: 30, opacity: 0, scale: 0.96 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'power3.out',
        stagger: 0.1,
        scrollTrigger: {
          trigger: metricCards[0].parentElement,
          start: 'top 80%',
          toggleActions: 'play none none none',
        }
      }
    );
  }

  // Stat blocks - stagger
  const statBlocks = gsap.utils.toArray('.stat-block');
  if (statBlocks.length) {
    gsap.fromTo(statBlocks,
      { y: 25, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.12,
        scrollTrigger: {
          trigger: statBlocks[0].parentElement,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    );
  }

  // Pipeline steps - stagger
  const pipelineSteps = gsap.utils.toArray('.pipeline-step');
  if (pipelineSteps.length) {
    gsap.fromTo(pipelineSteps,
      { y: 15, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.07,
        scrollTrigger: {
          trigger: pipelineSteps[0].parentElement,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    );
  }

  // =========================================================
  // 6. IMAGE REVEAL ON SCROLL
  // =========================================================
  gsap.utils.toArray('.img-reveal').forEach((img) => {
    gsap.fromTo(img,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        duration: 1,
        ease: 'power4.inOut',
        scrollTrigger: {
          trigger: img,
          start: 'top 85%',
          toggleActions: 'play none none none',
        }
      }
    );
  });

  // =========================================================
  // 7. NUMBER COUNTER ANIMATION
  // =========================================================
  const statNumbers = document.querySelectorAll('.stat-block');
  let countersAnimated = false;

  ScrollTrigger.create({
    trigger: statNumbers[0]?.parentElement,
    start: 'top 80%',
    onEnter: () => {
      if (countersAnimated) return;
      countersAnimated = true;

      statNumbers.forEach(block => {
        const target = parseFloat(block.dataset.count);
        const suffix = block.dataset.suffix || '';
        const numEl = block.querySelector('.stat-number');
        if (!numEl) return;

        gsap.to({ val: 0 }, {
          val: target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () {
            const current = this.targets()[0].val;
            numEl.textContent = (target >= 100 ? Math.round(current) : current.toFixed(0)) + suffix;
          },
          onComplete: function () {
            numEl.textContent = (target % 1 === 0 ? target : target) + suffix;
          }
        });
      });
    }
  });

  // =========================================================
  // 8. MAGNETIC BUTTON HOVER
  // =========================================================
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });

  // =========================================================
  // 9. CASE STUDY TAB SWITCHER
  // =========================================================
  const csTabs = document.querySelectorAll('.cs-tab');
  const csPanels = document.querySelectorAll('.cs-panel');

  csTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      csTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      csPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === targetId);
      });
    });
  });

  // =========================================================
  // 10. CREATIVE FILTER
  // =========================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryCards = document.querySelectorAll('.creative-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      galleryCards.forEach(card => {
        const cat = card.dataset.cat;
        if (filter === 'all' || cat === filter) {
          card.style.display = '';
          gsap.fromTo(card, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // =========================================================
  // 11. LIGHTBOX
  // =========================================================
  window.openLightbox = function (cardEl) {
    const img = cardEl.querySelector('img');
    if (!img) return;
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    lightboxImg.src = img.src;
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lenis.stop();
  };

  window.closeLightbox = function () {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
    lenis.start();
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

  // =========================================================
  // 12. PARALLAX EFFECTS ON IMAGES
  // =========================================================
  gsap.utils.toArray('.img-reveal img').forEach(img => {
    gsap.to(img, {
      yPercent: -8,
      ease: 'none',
      scrollTrigger: {
        trigger: img.parentElement,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.5,
      }
    });
  });

  // =========================================================
  // 13. COPY TO CLIPBOARD + TOAST
  // =========================================================
  window.copyToClipboard = function (text, message) {
    navigator.clipboard.writeText(text).then(() => showToast(message || 'Copied!')).catch(() => {
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast(message || 'Copied!');
    });
  };

  function showToast(msg) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  // =========================================================
  // 14. PAGE LOAD SEQUENCE
  // =========================================================
  window.addEventListener('load', () => {
    // Hero text reveal with stagger
    const heroTexts = document.querySelectorAll('#hero .reveal-text');
    gsap.fromTo(heroTexts,
      { yPercent: 110 },
      { yPercent: 0, duration: 1.4, ease: 'power4.out', stagger: 0.15, delay: 0.3 }
    );

    // Hero other elements
    const heroReveals = document.querySelectorAll('#hero .reveal-up');
    gsap.fromTo(heroReveals,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.15, delay: 0.8 }
    );
  });

})();
