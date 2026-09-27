/* ==========================================================================
   HITESH SADHU — INTERACTIVE APP.JS (FRAMER MOTION FEEL & LOGIC)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // 1. MOUSE SPOTLIGHT FOLLOWER
  const spotlight = document.getElementById('spotlight');
  window.addEventListener('mousemove', (e) => {
    const x = `${e.clientX}px`;
    const y = `${e.clientY}px`;
    document.documentElement.style.setProperty('--mouse-x', x);
    document.documentElement.style.setProperty('--mouse-y', y);
  });

  // 2. CASE STUDY TAB SWITCHER
  const csTabs = document.querySelectorAll('.cs-tab');
  const csPanels = document.querySelectorAll('.cs-panel');

  csTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');

      // Update Tab Styles
      csTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Switch Panels
      csPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // 3. CREATIVE GALLERY CATEGORY FILTER
  const filterBtns = document.querySelectorAll('.filter-btn');
  const creativeCards = document.querySelectorAll('.creative-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      creativeCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.3s ease forwards';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 4. ANIMATED COUNTER ON SCROLL (INTERSECTION OBSERVER)
  const counters = document.querySelectorAll('.counter');
  let animated = false;

  const countObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animateNumbers();
        animated = true;
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const heroSection = document.getElementById('hero');
  if (heroSection) {
    countObserver.observe(heroSection);
  }

  function animateNumbers() {
    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-target'));
      const suffix = counter.innerText.replace(/[0-9.]/g, '');
      const duration = 1500;
      const start = 0;
      const startTime = performance.now();

      function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing: easeOutExpo
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentVal = (start + (target - start) * ease).toFixed(target % 1 === 0 ? 0 : 1);

        counter.innerText = currentVal + suffix;

        if (progress < 1) {
          requestAnimationFrame(updateNumber);
        } else {
          counter.innerText = (target % 1 === 0 ? target : target.toFixed(1)) + suffix;
        }
      }

      requestAnimationFrame(updateNumber);
    });
  }

  // 5. ACTIVE NAV SCROLLSPY
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 160;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

});

// 6. LIGHTBOX FUNCTIONS
function openLightbox(imgSrc, title, desc) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const descEl = document.getElementById('lightbox-desc');

  img.src = imgSrc;
  titleEl.innerText = title || '';
  descEl.innerText = desc || '';

  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  lightbox.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Close lightbox on outside click or ESC
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLightbox();
});

document.getElementById('lightbox')?.addEventListener('click', (e) => {
  if (e.target.id === 'lightbox') {
    closeLightbox();
  }
});

// 7. TOAST NOTIFICATION & COPY TO CLIPBOARD
function copyToClipboard(text, message = 'Copied to clipboard!') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(message);
  }).catch(() => {
    // Fallback
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast(message);
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;
  toast.classList.remove('hidden');
  toast.classList.add('flex');

  setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 2500);
}
