const TOTAL_FRAMES = 300;
const canvas = document.getElementById('scroll-canvas');
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
const loader = document.getElementById('loader');
const loaderProgress = document.getElementById('loader-progress');

// Store decoded images / bitmaps for instant GPU drawing
const frames = new Array(TOTAL_FRAMES);
let loadedCount = 0;
let currentFrame = 0;
let targetFrame = 0;
let lastRenderedIndex = -1;
let isLoaderHidden = false;

// Format frame filename
function getFramePath(index) {
  const padded = String(index).padStart(4, '0');
  return `frames/frame_${padded}.jpg`;
}

// Canvas resize with native sharp DPR resolution
let canvasWidth = 0;
let canvasHeight = 0;
let cachedMaxScroll = 0;
let drawParams = { offsetX: 0, offsetY: 0, drawWidth: 0, drawHeight: 0 };

function calculateDrawDimensions() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;

  canvas.width = Math.round(canvasWidth * dpr);
  canvas.height = Math.round(canvasHeight * dpr);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';

  // Calculate cover scaling for 1280x720 (16:9) frame
  const imgWidth = 1280;
  const imgHeight = 720;
  const imgRatio = imgWidth / imgHeight;
  const screenRatio = canvasWidth / canvasHeight;

  if (screenRatio > imgRatio) {
    drawParams.drawWidth = canvasWidth;
    drawParams.drawHeight = canvasWidth / imgRatio;
    drawParams.offsetX = 0;
    drawParams.offsetY = (canvasHeight - drawParams.drawHeight) / 2;
  } else {
    drawParams.drawHeight = canvasHeight;
    drawParams.drawWidth = canvasHeight * imgRatio;
    drawParams.offsetX = (canvasWidth - drawParams.drawWidth) / 2;
    drawParams.offsetY = 0;
  }

  // Update cached scroll range
  const docHeight = document.documentElement.scrollHeight;
  cachedMaxScroll = Math.max(1, docHeight - canvasHeight);

  lastRenderedIndex = -1;
  renderFrame(Math.round(currentFrame));
}

// Ultra-fast zero-jank frame rendering with nearest-frame fallback
function renderFrame(index) {
  if (index === lastRenderedIndex) return;

  let img = frames[index];

  // If requested frame isn't loaded yet, find the nearest loaded frame
  if (!img) {
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      if (index - offset >= 0 && frames[index - offset]) {
        img = frames[index - offset];
        break;
      }
      if (index + offset < TOTAL_FRAMES && frames[index + offset]) {
        img = frames[index + offset];
        break;
      }
    }
  }

  if (!img) return;

  // Direct sharp GPU blit
  ctx.drawImage(
    img,
    drawParams.offsetX,
    drawParams.offsetY,
    drawParams.drawWidth,
    drawParams.drawHeight
  );

  lastRenderedIndex = index;
}

// Fast scroll target calculation using cached metrics
function updateScrollTarget(scrollPos) {
  if (cachedMaxScroll <= 0) {
    const docHeight = document.documentElement.scrollHeight;
    cachedMaxScroll = Math.max(1, docHeight - window.innerHeight);
  }
  const y = typeof scrollPos === 'number' ? scrollPos : (window.scrollY || window.pageYOffset || 0);
  const progress = Math.min(1, Math.max(0, y / cachedMaxScroll));
  targetFrame = progress * (TOTAL_FRAMES - 1);
}

// Load a single frame asynchronously
function loadSingleFrame(frameIndex) {
  if (frames[frameIndex]) return Promise.resolve(frames[frameIndex]);

  return new Promise((resolve) => {
    const img = new Image();
    img.src = getFramePath(frameIndex + 1);

    img.onload = async () => {
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch (e) {
        // ignore decode errors on unsupported browsers
      }
      frames[frameIndex] = img;
      loadedCount++;
      resolve(img);
    };

    img.onerror = () => {
      resolve(null);
    };
  });
}

// Hide preloader smoothly and instantly
function hideLoader() {
  if (isLoaderHidden) return;
  isLoaderHidden = true;
  if (loaderProgress) {
    loaderProgress.style.width = '100%';
  }
  setTimeout(() => {
    if (loader) {
      loader.classList.add('loaded');
    }
  }, 200);
}

// Helper: Run async task pool with max concurrency
async function runConcurrentPool(items, concurrency) {
  let index = 0;
  const workers = new Array(concurrency).fill(0).map(async () => {
    while (index < items.length) {
      const currentIndex = items[index++];
      await loadSingleFrame(currentIndex);
    }
  });
  await Promise.all(workers);
}

// Fast Progressive Loader: Unlock site in under 0.8s and load rest in background
async function preloadFrames() {
  // Safety timeout to ensure preloader ALWAYS hides within 800ms
  const safetyTimeout = setTimeout(() => {
    hideLoader();
  }, 800);

  // 1. Instantly load and render Frame 0 (initial view)
  const initialFrame = await loadSingleFrame(0);
  if (initialFrame) {
    renderFrame(0);
    if (loaderProgress) loaderProgress.style.width = '60%';
  }

  // 2. Load immediate initial buffer (frames 1 to 5)
  const initialBuffer = [1, 2, 3, 4, 5];
  await Promise.all(initialBuffer.map((idx) => loadSingleFrame(idx)));

  // Clear safety timeout and unlock page immediately
  clearTimeout(safetyTimeout);
  hideLoader();

  // 3. Progressive Background Loading in controlled concurrent batches
  const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window);
  // On mobile load every 2nd frame (150 frames = cuts 50% data & RAM, 100% fluid visual scroll)
  const frameStep = isMobile ? 2 : 1;

  // Milestone frames across the whole scroll to ensure instant responsiveness on fast scrolls
  const milestoneIndices = [];
  for (let i = 0; i < TOTAL_FRAMES; i += 15) {
    if (!frames[i]) milestoneIndices.push(i);
  }

  // Load milestones first in pool of 4
  await runConcurrentPool(milestoneIndices, 4);

  // Remaining frames
  const remainingIndices = [];
  for (let i = 0; i < TOTAL_FRAMES; i += frameStep) {
    if (!frames[i]) remainingIndices.push(i);
  }

  // Load remaining frames with concurrency limit of 6 so network/CPU is never overwhelmed
  runConcurrentPool(remainingIndices, 6);
}

// Lenis smooth scrolling with ultra-high responsiveness
let lenisInstance = null;

function initSmoothScroll() {
  if (typeof Lenis !== 'undefined') {
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints > 0);

    lenisInstance = new Lenis({
      duration: isTouch ? 0.75 : 0.85,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.2,
      touchMultiplier: 1.5,
      infinite: false
    });

    lenisInstance.on('scroll', (e) => {
      if (typeof e.progress === 'number') {
        targetFrame = e.progress * (TOTAL_FRAMES - 1);
      } else {
        updateScrollTarget(e.scroll);
      }
      updateScrollSpy(e.scroll);
    });

    function raf(time) {
      lenisInstance.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  } else {
    window.addEventListener('scroll', () => {
      updateScrollTarget();
      updateScrollSpy();
    }, { passive: true });
  }
}

// Cached ScrollSpy: Zero reflow overhead during scroll
let cachedSections = [];

function cacheSectionPositions() {
  const sections = document.querySelectorAll('section[id], footer[id]');
  cachedSections = Array.from(sections).map((sec) => ({
    id: sec.getAttribute('id'),
    top: sec.offsetTop,
    height: sec.offsetHeight
  }));
}

function updateScrollSpy(scrollPos) {
  if (!cachedSections.length) return;
  const navLinks = document.querySelectorAll('#navbar-links .nav-link');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
  const y = (typeof scrollPos === 'number' ? scrollPos : (window.scrollY || window.pageYOffset || 0)) + 220;

  for (let i = 0; i < cachedSections.length; i++) {
    const sec = cachedSections[i];
    if (y >= sec.top && y < sec.top + sec.height) {
      navLinks.forEach((link) => {
        if (link.getAttribute('data-section') === sec.id) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      mobileNavLinks.forEach((link) => {
        if (link.getAttribute('data-section') === sec.id) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      break;
    }
  }
}

// =========================================================
// CUSTOM MAGNETIC CURSOR PHYSICS
// =========================================================
const cursor = document.getElementById('custom-cursor');
const follower = document.getElementById('cursor-follower');
const cursorLabel = document.getElementById('cursor-label');

let mouseX = -100;
let mouseY = -100;
let followerX = -100;
let followerY = -100;

function initCustomCursor() {
  if (!cursor || !follower) return;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
  });

  // Project cards hover
  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('mouseenter', () => {
      follower.classList.add('cursor-project-hover');
      if (cursorLabel) cursorLabel.textContent = 'VIEW ↗';
    });
    card.addEventListener('mouseleave', () => {
      follower.classList.remove('cursor-project-hover');
      if (cursorLabel) cursorLabel.textContent = '';
    });
  });

  // Buttons and clickable links hover
  document.querySelectorAll('a, button, .nav-link, input, select, textarea').forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      if (!follower.classList.contains('cursor-project-hover')) {
        follower.classList.add('cursor-btn-hover');
      }
    });
    btn.addEventListener('mouseleave', () => {
      follower.classList.remove('cursor-btn-hover');
    });
  });
}

// =========================================================
// 3D CARD TILT & HOLOGRAPHIC GLARE
// =========================================================
function init3DCardTilt() {
  const cards = document.querySelectorAll('.tilt-card');

  cards.forEach((card) => {
    const glare = card.querySelector('.card-glare-effect');

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 8;
      const rotateY = ((x - centerX) / centerX) * 8;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;

      if (glare) {
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.22) 0%, transparent 60%)`;
      }
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });
}

// =========================================================
// REAL CLIENT PROJECTS DATABASE & RICH MEDIA SHOWCASE CONTROLLER
// =========================================================
const projectData = {
  '1': {
    tag: 'Fashion & Retail • Meta Ads & Creative Strategy',
    title: 'Fitlady Western Wear',
    handle: '@fitlady_westernwear',
    logoIcon: '👗',
    desc: 'Comprehensive digital marketing, visual branding, and creative execution for a prominent western wear fashion brand. Executed high-converting Meta advertising campaigns, promotional Instagram reels, ad graphics, and localized retail growth strategies.',
    tech: ['Meta Advertising', 'Instagram Reels Strategy', 'Ad Creative Design', 'Promotional Graphics', 'Local Retail Growth'],
    bgClass: 'card-bg-fitlady',
    metrics: [
      { label: 'Campaign Reach', val: '75,000+' },
      { label: 'Engagement Rate', val: '4.8%' },
      { label: 'Store Footfall', val: '+160%' }
    ],
    reelTitle: 'Summer Western Collection Launch Reel',
    reelDuration: '0:28',
    graphics: [
      { title: 'Meta Ad Carousel', type: 'Fashion Ad Creative' },
      { title: 'Festival Promo Poster', type: 'Instagram Post' }
    ]
  },
  '2': {
    tag: 'Healthcare & Dental • Branding & Patient Acquisition',
    title: 'Ekdant Dental Clinic & Implant Centre',
    handle: '@ekdantdental_clinic',
    logoIcon: '🦷',
    desc: 'End-to-end digital branding and local presence optimization for a premier dental healthcare clinic. Developed awareness-driven social media strategy, patient education reels, dental care creatives, and local Google Business Profile growth.',
    tech: ['Healthcare Branding', 'Social Media Strategy', 'Patient Education Reels', 'Google Maps / GBP', 'Visual Storytelling'],
    bgClass: 'card-bg-ekdant',
    metrics: [
      { label: 'Patient Inquiries', val: '120+ /mo' },
      { label: 'Google Maps Views', val: '+240%' },
      { label: 'Trust Rating', val: '4.9 ★' }
    ],
    reelTitle: 'Dental Implant Awareness & Patient Care',
    reelDuration: '0:34',
    graphics: [
      { title: 'Dental Health Awareness', type: 'Informative Graphic' },
      { title: 'Doctor Consultation Ad', type: 'Local Lead Ad' }
    ]
  },
  '3': {
    tag: 'Manufacturing • Industrial Branding & Showcase',
    title: 'Ramdev Glass & Aluminium',
    handle: '@ramdevglass_aluminium',
    logoIcon: '🪟',
    desc: 'Brand-focused creative design and digital presentation for architectural glass & aluminium manufacturing. Created high-impact material showcase graphics, architectural installation showcase reels, and B2B digital branding.',
    tech: ['B2B Brand Strategy', 'Product Video Reels', 'Promotional Graphics', 'Visual Branding', 'Material Showcase'],
    bgClass: 'card-bg-ramdev',
    metrics: [
      { label: 'B2B Inquiries', val: '45+ Clients' },
      { label: 'Video Views', val: '30,000+' },
      { label: 'Brand Recall', val: '+180%' }
    ],
    reelTitle: 'Architectural Toughened Glass Showcase',
    reelDuration: '0:42',
    graphics: [
      { title: 'Aluminium Section Specs', type: 'Catalog Creative' },
      { title: 'Project Showcase Banner', type: 'Promotional Ad' }
    ]
  },
  '4': {
    tag: 'Food & FMCG • Brand Communication & Social Creatives',
    title: 'Rinkuben Khakhrawala',
    handle: '@rinkuben_khakhrawala',
    logoIcon: '🥟',
    desc: 'Social media creative direction and marketing communication for an authentic FMCG food brand. Designed mouth-watering promotional graphics, customer engagement packaging reels, and authentic culinary brand storytelling.',
    tech: ['FMCG Brand Identity', 'Food Reels Production', 'Social Media Creatives', 'Promotional Campaigns', 'Visual Storytelling'],
    bgClass: 'card-bg-rinkuben',
    metrics: [
      { label: 'Social Engagement', val: '+310%' },
      { label: 'Reel Impressions', val: '85,000+' },
      { label: 'Customer Retention', val: '92%' }
    ],
    reelTitle: 'Authentic Hand-Made Khakhra Making Process',
    reelDuration: '0:30',
    graphics: [
      { title: 'Festive Combo Offer', type: 'FMCG Social Poster' },
      { title: 'Flavor Showcase Grid', type: 'Packaging Graphic' }
    ]
  }
};

function initProjectModals() {
  const modal = document.getElementById('project-modal');
  const modalBody = document.getElementById('modal-body-content');
  const closeBtn = document.getElementById('modal-close-btn');

  if (!modal || !modalBody) return;

  document.querySelectorAll('.project-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-project-id');
      const data = projectData[id] || projectData['1'];

      modalBody.innerHTML = `
        <!-- Modal Top Bar -->
        <div class="modal-project-header">
          <div class="modal-brand-row">
            <div class="modal-brand-icon-wrap">${data.logoIcon}</div>
            <div>
              <div class="modal-project-tag">${data.tag}</div>
              <h3 class="modal-project-title">${data.title}</h3>
              <div class="modal-brand-handle">${data.handle}</div>
            </div>
          </div>
        </div>

        <!-- Media Showcase: Reel & Graphics Mockup Gallery -->
        <div class="modal-media-showcase-grid">
          
          <!-- 9:16 Instagram Reel Mockup Card -->
          <div class="modal-reel-mockup-card ${data.bgClass}">
            <div class="reel-top-badge">
              <span>▶ Instagram Reel</span>
              <span class="reel-duration-pill">${data.reelDuration}</span>
            </div>
            <div class="reel-play-circle">
              <span class="play-icon-tri">▶</span>
            </div>
            <div class="reel-bottom-info">
              <div class="reel-caption-text">${data.reelTitle}</div>
              <div class="reel-audio-tag">🎵 Original Audio • ${data.title}</div>
            </div>
          </div>

          <!-- Social Media Graphics Gallery -->
          <div class="modal-graphics-col">
            <div class="graphics-col-header">
              <span>📸 Ad Creatives & Social Posts</span>
            </div>
            <div class="modal-graphic-item">
              <div class="graphic-item-badge">Post 01</div>
              <div class="graphic-item-title">${data.graphics[0].title}</div>
              <div class="graphic-item-type">${data.graphics[0].type}</div>
            </div>
            <div class="modal-graphic-item">
              <div class="graphic-item-badge">Post 02</div>
              <div class="graphic-item-title">${data.graphics[1].title}</div>
              <div class="graphic-item-type">${data.graphics[1].type}</div>
            </div>
          </div>

        </div>

        <!-- Key Campaign Metrics Impact -->
        <div class="modal-metrics-row">
          ${data.metrics.map(m => `
            <div class="metric-box">
              <div class="metric-val">${m.val}</div>
              <div class="metric-lbl">${m.label}</div>
            </div>
          `).join('')}
        </div>

        <!-- Description & Scope -->
        <p class="modal-project-desc">${data.desc}</p>
        
        <!-- Tech & Deliverables Tags -->
        <div class="modal-tech-stack">
          ${data.tech.map((t) => `<span class="tech-pill">${t}</span>`).join('')}
        </div>

        <!-- Actions -->
        <div class="modal-actions-row">
          <button class="btn-primary-copper open-contact-modal-btn" style="border:none; cursor:pointer;">
            <span>Discuss Similar Project</span>
            <span class="btn-arrow-circle">↗</span>
          </button>
          <a href="https://wa.me/917990803065?text=Hi%20Hitesh,%20I%20saw%20your%20work%20for%20${encodeURIComponent(data.title)}%20and%20want%20similar%20work." target="_blank" rel="noopener noreferrer" class="btn-whatsapp-direct">
            <span>💬 Chat on WhatsApp</span>
          </a>
        </div>
      `;

      modal.classList.add('is-active');
      modal.setAttribute('aria-hidden', 'false');

      // Connect new modal button
      modalBody.querySelector('.open-contact-modal-btn')?.addEventListener('click', () => {
        closeModal();
        const contactModal = document.getElementById('contact-modal');
        if (contactModal) {
          contactModal.classList.add('is-active');
          contactModal.setAttribute('aria-hidden', 'false');
        }
      });
    });
  });

  function closeModal() {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop-blur')) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// =========================================================
// CONTACT MODAL CONTROLLER
// =========================================================
function initContactModal() {
  const contactModal = document.getElementById('contact-modal');
  const contactCloseBtn = document.getElementById('contact-close-btn');
  const openButtons = document.querySelectorAll('.open-contact-modal-btn');
  const inquiryForm = document.getElementById('inquiry-form');
  const successMsg = document.getElementById('form-success-msg');

  if (!contactModal) return;

  function openModal() {
    contactModal.classList.add('is-active');
    contactModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    contactModal.classList.remove('is-active');
    contactModal.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-contact-modal-btn');
    if (btn) {
      document.querySelectorAll('.modal-overlay.is-active').forEach((m) => {
        if (m.id !== 'contact-modal') {
          m.classList.remove('is-active');
          m.setAttribute('aria-hidden', 'true');
        }
      });
      openModal();
    }
  });
  if (contactCloseBtn) contactCloseBtn.addEventListener('click', closeModal);

  contactModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop-blur')) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  if (inquiryForm) {
    inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      inquiryForm.style.display = 'none';
      if (successMsg) successMsg.style.display = 'flex';

      setTimeout(() => {
        closeModal();
        setTimeout(() => {
          inquiryForm.reset();
          inquiryForm.style.display = 'flex';
          if (successMsg) successMsg.style.display = 'none';
        }, 400);
      }, 3000);
    });
  }
}

// Gyroscope tracking state for mobile 3D tilt physics
let gyroTiltX = 0;
let gyroTiltY = 0;
let targetGyroTiltX = 0;
let targetGyroTiltY = 0;
let isGyroActive = false;

function initGyroscope() {
  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', (e) => {
      if (typeof e.gamma === 'number' && typeof e.beta === 'number') {
        isGyroActive = true;
        // gamma: left-to-right [-45, 45] -> rotateY
        // beta: front-to-back [10, 60] -> rotateX
        const gamma = Math.min(45, Math.max(-45, e.gamma));
        const beta = Math.min(60, Math.max(10, e.beta));

        targetGyroTiltY = (gamma / 45) * 7.5;
        targetGyroTiltX = -((beta - 35) / 25) * 7.5;
      }
    }, { passive: true });
  }
}

// =========================================================
// SMOOTH RAF ANIMATION LOOP
// =========================================================
function animationLoop() {
  const diff = targetFrame - currentFrame;
  if (Math.abs(diff) > 0.005) {
    currentFrame += diff * 0.32;
    const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(currentFrame)));
    renderFrame(frameIndex);
  }

  if (follower) {
    followerX += (mouseX - followerX) * 0.18;
    followerY += (mouseY - followerY) * 0.18;
    follower.style.left = `${followerX}px`;
    follower.style.top = `${followerY}px`;
  }

  // Mobile Gyroscope 3D Tilt interpolation
  if (isGyroActive) {
    gyroTiltX += (targetGyroTiltX - gyroTiltX) * 0.1;
    gyroTiltY += (targetGyroTiltY - gyroTiltY) * 0.1;

    const tiltCards = document.querySelectorAll('.tilt-card');
    const vh = window.innerHeight;
    tiltCards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) {
        card.style.transform = `perspective(1000px) rotateX(${gyroTiltX.toFixed(2)}deg) rotateY(${gyroTiltY.toFixed(2)}deg)`;
        const glare = card.querySelector('.card-glare-effect');
        if (glare) {
          const glareX = 50 + (gyroTiltY * 4.5);
          const glareY = 50 + (gyroTiltX * 4.5);
          glare.style.opacity = '0.65';
          glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.2) 0%, transparent 65%)`;
        }
      }
    });
  }

  requestAnimationFrame(animationLoop);
}

// Intersection Observer for scroll reveals
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -20px 0px'
  });

  revealElements.forEach((el) => observer.observe(el));
}

// Resize handler with caching
function handleResize() {
  calculateDrawDimensions();
  cacheSectionPositions();
}

// =========================================================
// MOBILE MENU DRAWER CONTROLLER & SMOOTH ANCHOR NAV
// =========================================================
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-menu-drawer');
  const closeBtn = document.getElementById('mobile-menu-close');
  const backdrop = drawer ? drawer.querySelector('.mobile-menu-backdrop') : null;
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');
  const desktopLinks = document.querySelectorAll('#navbar-links .nav-link');

  if (!drawer || !toggleBtn) return;

  function openDrawer() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  // Mobile nav link smooth scroll & auto close
  mobileLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        closeDrawer();
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          if (lenisInstance) {
            lenisInstance.scrollTo(targetElement, { offset: -60, duration: 1.0 });
          } else {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  });

  // Desktop nav link smooth scroll
  desktopLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          if (lenisInstance) {
            lenisInstance.scrollTo(targetElement, { offset: -70, duration: 1.0 });
          } else {
            targetElement.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    });
  });

  // Mobile drawer contact button
  const drawerContactBtn = drawer.querySelector('.open-contact-modal-btn');
  if (drawerContactBtn) {
    drawerContactBtn.addEventListener('click', () => {
      closeDrawer();
    });
  }
}

// =========================================================
// STUDIO LIGHTING MOOD SWITCHER (COPPER / CYBER / EMERALD)
// =========================================================
function initThemeSwitcher() {
  const savedTheme = localStorage.getItem('hs_portfolio_theme') || 'copper';
  setTheme(savedTheme);

  const moodPills = document.querySelectorAll('.theme-mood-pill');
  moodPills.forEach((pill) => {
    pill.querySelectorAll('.mood-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const theme = dot.getAttribute('data-theme');
        if (theme) setTheme(theme);
      });
    });
  });

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('hs_portfolio_theme', theme);

    // Update all active dots (desktop & mobile)
    document.querySelectorAll('.mood-dot').forEach((dot) => {
      if (dot.getAttribute('data-theme') === theme) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
}

// =========================================================
// INTERACTIVE AI PORTFOLIO AGENT ENGINE
// =========================================================
function initAIAssistant() {
  const aiModal = document.getElementById('ai-modal');
  const aiCloseBtn = document.getElementById('ai-close-btn');
  const openButtons = document.querySelectorAll('.open-ai-modal-btn');
  const chatForm = document.getElementById('ai-chat-form');
  const queryInput = document.getElementById('ai-query-input');
  const chatLog = document.getElementById('ai-chat-log');
  const promptChips = document.querySelectorAll('.ai-chip');

  if (!aiModal) return;

  // Floating AI Widget Live Typewriter Prompt Ticker
  const widgetTicker = document.getElementById('ai-widget-ticker');
  if (widgetTicker) {
    const tickerPrompts = [
      'Ask AI: "Projects & ROI"',
      'Ask AI: "Why Hire Hitesh?"',
      'Ask AI: "Tech & AI Stack"',
      'Ask AI: "Pricing & Scope"',
      'Ask AI: "Meta Ads Strategy"'
    ];
    let promptIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeTicker() {
      const currentPrompt = tickerPrompts[promptIndex];

      if (isDeleting) {
        charIndex--;
        widgetTicker.textContent = currentPrompt.substring(0, charIndex);
      } else {
        charIndex++;
        widgetTicker.textContent = currentPrompt.substring(0, charIndex);
      }

      let speed = isDeleting ? 25 : 50;

      if (!isDeleting && charIndex === currentPrompt.length) {
        speed = 2600; // Pause when word is completely typed
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        promptIndex = (promptIndex + 1) % tickerPrompts.length;
        speed = 400; // Small pause before typing next
      }

      setTimeout(typeTicker, speed);
    }

    typeTicker();
  }

  function openAIModal(initialPrompt = '') {
    aiModal.classList.add('is-active');
    aiModal.setAttribute('aria-hidden', 'false');
    if (initialPrompt && queryInput) {
      queryInput.value = initialPrompt;
      handleUserQuery(initialPrompt);
    } else if (queryInput) {
      setTimeout(() => queryInput.focus(), 250);
    }
  }

  function closeAIModal() {
    aiModal.classList.remove('is-active');
    aiModal.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-ai-modal-btn');
    if (btn) openAIModal();
  });
  if (aiCloseBtn) aiCloseBtn.addEventListener('click', closeAIModal);

  aiModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop-blur')) closeAIModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aiModal.classList.contains('is-active')) closeAIModal();
  });

  // Prompt chips click
  promptChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        if (queryInput) queryInput.value = prompt;
        handleUserQuery(prompt);
      }
    });
  });

  // Form submit
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = queryInput.value.trim();
      if (!query) return;
      handleUserQuery(query);
    });
  }

  // Knowledge base and smart intent response generator
  function generateAIAnswer(query) {
    const q = query.toLowerCase();

    if (q.includes('project') || q.includes('client') || q.includes('fitlady') || q.includes('ekdant') || q.includes('ramdev') || q.includes('rinkuben') || q.includes('case')) {
      return `Hitesh has delivered measurable real-world client results:
• **Fitlady Western Wear**: Retail Meta Ads & Instagram Reels growth (**+160% Store Footfall**, 75k+ Reach).
• **Ekdant Dental Clinic**: Healthcare branding, patient education reels & Google Maps SEO (**120+ Monthly Patient Inquiries**, 4.9★ rating).
• **Ramdev Glass & Aluminium**: B2B architectural material showcase & installation reels (**45+ Corporate Clients**, 30k+ Views).
• **Rinkuben Khakhrawala**: Authentic food storytelling reels & social creatives (**+310% Social Engagement**).`;
    }

    if (q.includes('skill') || q.includes('stack') || q.includes('tool') || q.includes('tech') || q.includes('react') || q.includes('ai') || q.includes('gemini') || q.includes('chatgpt')) {
      return `Hitesh specializes in a modern Full-Stack & AI ecosystem:
• **Web Development**: HTML5, CSS3, JavaScript (ES6+), React, Next.js, Tailwind CSS, Responsive UI/UX, Performance Optimization.
• **AI Workflows**: ChatGPT, Google Gemini, Gemini Flow (AI Video), Midjourney, Claude, Prompt Engineering, Automated Pipelines.
• **Digital Marketing**: Meta Ads Manager (Instagram/FB), Local SEO, Google Business Profile (GBP), Funnel Strategy.
• **Creative Production**: Video Scriptwriting, Instagram Reels Direction, Ad Creative Design, Brand Storytelling.`;
    }

    if (q.includes('why') || q.includes('hire') || q.includes('experience') || q.includes('advantage')) {
      return `Top 3 Reasons to collaborate with Hitesh:
1. **Full-Stack Execution**: Unlike agencies with scattered communication, Hitesh handles **Web Code + AI Content + Meta Ads** seamlessly.
2. **Proven ROI**: Every website and ad campaign is designed to drive revenue, leads, and customer trust.
3. **Founder Accountabilty**: As Founder of **Triosh Digital Solutions**, he brings genuine entrepreneurial ownership to every project.`;
    }

    if (q.includes('process') || q.includes('time') || q.includes('how') || q.includes('work') || q.includes('steps')) {
      return `Hitesh's 4-Step Agile Workflow:
1. **Goal Discovery**: Understanding your business niche, audience & targets.
2. **AI-Powered Prototyping**: Fast design wireframes, video scripts & visual assets.
3. **Development & Launch**: Responsive web build, Meta ad setup & testing.
4. **Local SEO & Scaling**: Google Maps ranking & continuous analytics growth.
*Typical project delivery is between **1 to 3 weeks**.*`;
    }

    if (q.includes('price') || q.includes('cost') || q.includes('rate') || q.includes('contact') || q.includes('start') || q.includes('whatsapp') || q.includes('call') || q.includes('email')) {
      return `You can get in touch with Hitesh directly:
• **WhatsApp**: [+91 7990803065](https://wa.me/917990803065?text=Hi%20Hitesh,%20I%20chatted%20with%20your%20AI%20Assistant%20and%20want%20to%20discuss%20a%20project.)
• **Email**: contact.hiteshsadhu@gmail.com
• **Location**: Ahmedabad, Gujarat, India
• Pricing depends on project scope (Custom Website, Meta Ad Campaign, Local SEO, or AI Creative Production). Let's chat on WhatsApp for a custom quote!`;
    }

    // Default smart fallback
    return `Hitesh Sadhu is an **AI-Powered IT & Digital Solutions Specialist** and Founder of **Triosh Digital Solutions** based in Ahmedabad.

He specializes in building high-performing web platforms, high-ROI Meta ad campaigns, local SEO, and generative AI creative workflows.

You can ask me about his **real client projects, tech stack, working process, or direct contact details**!`;
  }

  // Typewriter streaming effect
  let isTyping = false;

  function handleUserQuery(userText) {
    if (isTyping) return;
    if (queryInput) queryInput.value = '';

    // Append User Message
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'ai-message ai-user-message';
    userMsgEl.innerHTML = `
      <div class="ai-avatar">👤</div>
      <div class="ai-msg-bubble"><p>${escapeHTML(userText)}</p></div>
    `;
    chatLog.appendChild(userMsgEl);
    chatLog.scrollTop = chatLog.scrollHeight;

    // Append Bot Thinking Message
    const botMsgEl = document.createElement('div');
    botMsgEl.className = 'ai-message ai-bot-message';
    botMsgEl.innerHTML = `
      <div class="ai-avatar">🤖</div>
      <div class="ai-msg-bubble"><span class="ai-cursor"></span></div>
    `;
    chatLog.appendChild(botMsgEl);
    chatLog.scrollTop = chatLog.scrollHeight;

    isTyping = true;
    const responseText = generateAIAnswer(userText);
    const bubble = botMsgEl.querySelector('.ai-msg-bubble');

    let charIndex = 0;
    const typingInterval = setInterval(() => {
      charIndex += 2;
      const currentText = responseText.slice(0, charIndex);
      bubble.innerHTML = formatMarkdown(currentText) + '<span class="ai-cursor"></span>';
      chatLog.scrollTop = chatLog.scrollHeight;

      if (charIndex >= responseText.length) {
        clearInterval(typingInterval);
        bubble.innerHTML = formatMarkdown(responseText);
        isTyping = false;
      }
    }, 14);
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  function formatMarkdown(text) {
    let html = escapeHTML(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^[•*]\s*(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--accent-light); font-weight:700; text-decoration:underline;">$1</a>');
    html = html.replace(/\n\n/g, '</p><p>');
    return '<p>' + html + '</p>';
  }
}

// =========================================================
// LIVE AHMEDABAD IST CLOCK & STUDIO RADAR
// =========================================================
function initLiveStudioClock() {
  const clockEl = document.getElementById('live-ahmedabad-time');
  if (!clockEl) return;

  function updateClock() {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    clockEl.textContent = now.toLocaleTimeString('en-US', options) + ' IST';
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// =========================================================
// INTERACTIVE TECH ARCHITECTURE & SPECS MODAL
// =========================================================
function initSpecsModal() {
  const specsModal = document.getElementById('specs-modal');
  const closeBtn = document.getElementById('specs-close-btn');
  const openBtns = document.querySelectorAll('.open-specs-modal-btn');

  if (!specsModal) return;

  function openModal() {
    specsModal.classList.add('is-active');
    specsModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    specsModal.classList.remove('is-active');
    specsModal.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.open-specs-modal-btn');
    if (btn) openModal();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  specsModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop-blur')) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && specsModal.classList.contains('is-active')) closeModal();
  });
}

// Window events with passive listeners
window.addEventListener('resize', handleResize, { passive: true });
window.addEventListener('scroll', () => {
  if (!lenisInstance) {
    updateScrollTarget();
    updateScrollSpy();
  }
}, { passive: true });

// Init everything
calculateDrawDimensions();
cacheSectionPositions();
initScrollReveal();
initSmoothScroll();
initMobileMenu();
initCustomCursor();
init3DCardTilt();
initGyroscope();
initThemeSwitcher();
initAIAssistant();
initLiveStudioClock();
initSpecsModal();
initProjectModals();
initContactModal();
preloadFrames();
requestAnimationFrame(animationLoop);


