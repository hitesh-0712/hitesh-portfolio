/* ==========================================================================
   HITESH SADHU — EXECUTIVE PORTFOLIO INTERACTION LOGIC
   Clean, reliable JavaScript for tabs, filters, lightbox, counters & toasts
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ----------------------------------------------------
  // 1. CASE STUDY TAB SWITCHER
  // ----------------------------------------------------
  const tabButtons = document.querySelectorAll('.tab-btn');
  const casePanels = document.querySelectorAll('.case-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      // Update button state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panel visibility
      casePanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // ----------------------------------------------------
  // 2. CREATIVE GALLERY CATEGORY FILTER
  // ----------------------------------------------------
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryCards = document.querySelectorAll('.gallery-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      // Update filter button styling
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter gallery cards
      galleryCards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          card.style.display = 'block';
          card.style.animation = 'fadeIn 0.25s ease';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ----------------------------------------------------
  // 3. NUMBER COUNTER ANIMATION ON SCROLL
  // ----------------------------------------------------
  const counters = document.querySelectorAll('.counter');
  let animated = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateCounters();
      }
    });
  }, { threshold: 0.2 });

  const statsSection = document.querySelector('.stats-container');
  if (statsSection) {
    observer.observe(statsSection);
  }

  function animateCounters() {
    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-target'));
      const text = counter.innerText;
      const suffix = text.replace(/^[~0-9.]+/, '');
      const prefix = text.startsWith('~') ? '~' : '';
      const duration = 1200;
      const startTime = performance.now();

      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quadratic
        const ease = 1 - (1 - progress) * (1 - progress);
        const current = Math.floor(target * ease);

        counter.innerText = prefix + current + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          counter.innerText = prefix + target + suffix;
        }
      }

      requestAnimationFrame(step);
    });
  }

  // ----------------------------------------------------
  // 4. ACTIVE NAVIGATION SCROLLSPY
  // ----------------------------------------------------
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-item');

  window.addEventListener('scroll', () => {
    let currentId = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 140;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentId = section.getAttribute('id');
      }
    });

    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === `#${currentId}`) {
        item.classList.add('active');
      }
    });
  });

  // ----------------------------------------------------
  // 4b. INTERACTIVE META ADS BUDGET ESTIMATOR
  // ----------------------------------------------------
  const budgetSlider = document.getElementById('budget-slider');
  const budgetDisplay = document.getElementById('budget-display');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const objBtns = document.querySelectorAll('.obj-btn');
  
  const projImpressions = document.getElementById('proj-impressions');
  const projReach = document.getElementById('proj-reach');
  const projViews = document.getElementById('proj-views');
  const projClicks = document.getElementById('proj-clicks');
  
  const bpDuration = document.getElementById('bp-duration');
  const bpPace = document.getElementById('bp-pace');
  const bpCreative = document.getElementById('bp-creative');
  const bpCpm = document.getElementById('bp-cpm');
  const calcWhatsappBtn = document.getElementById('calc-whatsapp-btn');

  let currentObjective = 'awareness';

  function formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M+';
    } else if (num >= 1000) {
      return Math.round(num / 1000) + 'K+';
    }
    return num.toLocaleString('en-IN');
  }

  function calculateProjections() {
    if (!budgetSlider) return;
    const budget = parseInt(budgetSlider.value, 10);
    
    // Update displayed budget
    if (budgetDisplay) {
      budgetDisplay.innerText = '₹' + budget.toLocaleString('en-IN');
    }

    let impMult = 125;
    let reachMult = 84.6;
    let viewMult = 127;
    let clickMult = 0.465;
    let cpmRate = '~₹8.00 per 1K views';
    let duration = '14 - 21 Days';
    let creative = '3 Reel Videos + 4 Carousels';

    if (currentObjective === 'local') {
      impMult = 95;
      reachMult = 62;
      viewMult = 90;
      clickMult = 0.85;
      cpmRate = '~₹10.50 per 1K views';
      duration = '10 - 14 Days';
      creative = '2 Store Tour Reels + WhatsApp Lead Ads';
    } else if (currentObjective === 'b2b') {
      impMult = 75;
      reachMult = 48;
      viewMult = 68;
      clickMult = 0.65;
      cpmRate = '~₹13.30 per 1K views';
      duration = '21 - 30 Days';
      creative = 'Architectural Glass Video + Catalog Ads';
    }

    const estImpressions = Math.round(budget * impMult);
    const estReach = Math.round(budget * reachMult);
    const estViews = Math.round(budget * viewMult);
    const estClicks = Math.round(budget * clickMult);
    const dailyPace = Math.round(budget / 14);

    if (projImpressions) projImpressions.innerText = formatNumber(estImpressions);
    if (projReach) projReach.innerText = formatNumber(estReach);
    if (projViews) projViews.innerText = formatNumber(estViews);
    if (projClicks) projClicks.innerText = estClicks.toLocaleString('en-IN') + '+';

    if (bpDuration) bpDuration.innerText = duration;
    if (bpPace) bpPace.innerText = '~₹' + dailyPace.toLocaleString('en-IN') + ' / day';
    if (bpCreative) bpCreative.innerText = creative;
    if (bpCpm) bpCpm.innerText = cpmRate;

    // Update WhatsApp CTA prefilled text
    if (calcWhatsappBtn) {
      const msg = encodeURIComponent(`Hello Hitesh, I used your Meta Ads Estimator for ₹${budget.toLocaleString('en-IN')} budget (${currentObjective} objective). Let's discuss campaign execution.`);
      calcWhatsappBtn.href = `https://wa.me/917990803065?text=${msg}`;
    }
  }

  if (budgetSlider) {
    budgetSlider.addEventListener('input', () => {
      presetBtns.forEach(b => {
        b.classList.toggle('active', parseInt(b.getAttribute('data-val'), 10) === parseInt(budgetSlider.value, 10));
      });
      calculateProjections();
    });

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        budgetSlider.value = val;
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calculateProjections();
      });
    });

    objBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        objBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentObjective = btn.getAttribute('data-objective');
        calculateProjections();
      });
    });

    calculateProjections();
  }

});

// ----------------------------------------------------
// 5. LIGHTBOX FUNCTIONALITY
// ----------------------------------------------------
function openLightbox(imageSrc, title, desc) {
  const lightbox = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  const titleEl = document.getElementById('lightbox-title');
  const descEl = document.getElementById('lightbox-desc');

  if (!lightbox || !img) return;

  img.src = imageSrc;
  titleEl.innerText = title || '';
  descEl.innerText = desc || '';

  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  lightbox.classList.add('hidden');
  document.body.style.overflow = '';
}

function handleLightboxClick(e) {
  if (e.target.id === 'lightbox' || e.target.classList.contains('lightbox-content')) {
    closeLightbox();
  }
}

// Close on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
  }
});

// ----------------------------------------------------
// 6. COPY TO CLIPBOARD + TOAST NOTIFICATION
// ----------------------------------------------------
function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMessage || 'Copied to clipboard!');
    }).catch(() => {
      fallbackCopy(text, successMessage);
    });
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const tempInput = document.createElement('input');
  tempInput.value = text;
  document.body.appendChild(tempInput);
  tempInput.select();
  try {
    document.execCommand('copy');
    showToast(successMessage || 'Copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy', err);
  }
  document.body.removeChild(tempInput);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2400);
}
