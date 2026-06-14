(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const page = window.__APP_PAGE__ || 'home';
  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const routes = [
    ['Home','/'], ['Services','/services'], ['Pricing','/pricing'], ['Latest Jobs','/latest-jobs'], ['Job Details','/job-details'],
    ['Admit Card','/admit-card'], ['Results','/results'], ['Student Links','/student-links'],
    ['About Us','/about-us'], ['Contact','/contact'], ['Track Application','/track-application']
  ];
  const homeSelectors = [
    '.hero-section', '#track', '#services', '#pricing', '.stats-section', '.main-footer',
    '.quick-link-card', '.review-card'
  ];

  async function api(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', ...options, headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  function setNav() {
    const links = qsa('.main-nav .nav-link').filter(a => a.tagName === 'A');
    links.forEach((a, i) => {
      if (!routes[i]) return;
      a.href = routes[i][1];
      a.textContent = routes[i][0];
      a.classList.toggle('active', location.pathname === routes[i][1] || (routes[i][1] === '/' && location.pathname === '/'));
    });
    const brand = qs('.navbar-brand'); if (brand) brand.href = '/';
    const footerMap = { Home:'/', 'About Us':'/about-us', Services:'/services', Contact:'/contact', Pricing:'/pricing', Login:'#login' };
    qsa('.main-footer a').forEach(a => { const t = a.textContent.trim(); if (footerMap[t]) a.href = footerMap[t]; });
  }

  function injectCmsStyles() {
    if (qs('#professionalCmsStyles')) return;
    const style = document.createElement('style');
    style.id = 'professionalCmsStyles';
    style.textContent = `
      .cms-hidden{display:none!important}.hero-section.cms-slider-ready{padding:0;background:var(--primary-dark)}
      .cms-hero-slide{min-height:520px;padding:70px 0 58px;display:none;background:linear-gradient(135deg,var(--primary-dark),var(--primary));position:relative;overflow:hidden}.cms-hero-slide.active{display:block;animation:cmsFade .45s ease}.cms-hero-media{border-radius:16px;min-height:310px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);overflow:hidden;display:flex;align-items:center;justify-content:center}.cms-hero-media img{width:100%;height:100%;object-fit:cover}.cms-float-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.cms-float-card{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:10px 8px;font-size:12px;text-align:center}.cms-hero-controls{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);display:flex;gap:8px}.cms-hero-dot{width:10px;height:10px;border-radius:50%;border:0;background:rgba(255,255,255,.45)}.cms-hero-dot.active{background:var(--accent);width:24px;border-radius:999px}.content-shell{background:var(--bg-white);min-height:70vh}.content-card{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow);padding:20px;height:100%}.content-card img{
width:100px !important;
height:100px !important;
object-fit:contain !important;
display:block;
margin:0 auto 20px;
border-radius:50%;
background:#fff;
padding:10px;
box-shadow:0 5px 15px rgba(0,0,0,.1);

}


.content-card h5{
text-align:center;
font-size:20px;
font-weight:700;
min-height:70px;
color:#0f172a;
}
.content-card{
    text-align:center;
}
.job-card{
background:#ffffff;
border-radius:24px;
padding:25px;
box-shadow:0 10px 35px rgba(0,0,0,.10);
transition:all .3s ease;
position:relative;
overflow:hidden;
height:100%;
}

.job-card:hover{
transform:translateY(-8px);
box-shadow:0 20px 45px rgba(0,0,0,.18);
}

.job-card::before{
content:'';
position:absolute;
top:0;
left:0;
width:100%;
height:5px;
background:linear-gradient(90deg,#ff6b35,#0d6efd);
}

.job-card .btn-primary-solid,
.job-card .btn-success-solid{
border-radius:12px;
padding:10px 18px;
font-weight:700;
}
.content-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:14px 0}.content-meta div{background:var(--bg);border-radius:8px;padding:9px;font-size:12px}.about-block,.contact-panel{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:24px;box-shadow:var(--shadow);height:100%}.profile-card{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:18px;text-align:center;height:100%}.profile-card img{width:92px;height:92px;border-radius:50%;object-fit:cover;margin-bottom:12px}.contact-grid{display:grid;grid-template-columns:1fr 1.2fr 1fr;gap:18px}.contact-panel input,.contact-panel textarea{width:100%;margin-bottom:10px}.quick-actions{display:flex;flex-wrap:wrap;gap:10px}.quick-actions a{padding:10px 16px;border-radius:8px;color:#fff;background:var(--primary);font-weight:700;font-size:13px}.quick-actions .wa{background:var(--green)}.quick-actions .call{background:var(--accent)}@keyframes cmsFade{from{opacity:.3;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@media(max-width:768px){.cms-hero-slide{min-height:auto;padding:42px 0}.cms-float-grid{grid-template-columns:repeat(2,1fr)}.contact-grid{grid-template-columns:1fr}.content-meta{grid-template-columns:1fr}}
    `;
    style.textContent += `
      .neoRouteGlassOverrides{}
      .content-shell{background:transparent!important;color:var(--text-dark)}
      .cms-hero-slide{background:radial-gradient(circle at 82% 20%,rgba(0,229,255,.2),transparent 32%),linear-gradient(135deg,#071426,#0a1d34 52%,#06101e)!important}
      .cms-hero-media,.cms-float-card,.content-card,.job-card,.about-block,.contact-panel,.profile-card{background:rgba(255,255,255,.05)!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:24px!important;box-shadow:0 18px 45px rgba(0,0,0,.34),0 0 26px rgba(0,229,255,.09)!important;backdrop-filter:blur(20px)!important;-webkit-backdrop-filter:blur(20px)!important;color:var(--text-dark)!important}
      .content-card:hover,.job-card:hover,.about-block:hover,.contact-panel:hover,.profile-card:hover{transform:translateY(-6px) scale(1.015);border-color:rgba(0,229,255,.38)!important;box-shadow:0 26px 70px rgba(0,0,0,.46),0 0 38px rgba(0,229,255,.16)!important}
      .content-card h4,.content-card h5,.about-block h3,.contact-panel h4,.profile-card h4{color:#fff!important}.content-card p,.about-block p,.contact-panel p,.profile-card p,.content-meta div{color:var(--text-muted)!important}
      .content-meta div{background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:18px!important}
      .content-card i{color:var(--accent)!important;text-shadow:0 0 22px rgba(0,229,255,.35)}
      .cms-hero-dot.active{background:var(--accent);box-shadow:0 0 20px rgba(0,229,255,.35)}
      .quick-actions a{background:linear-gradient(135deg,#00E5FF,#19e6a7)!important;color:#03121f!important;border-radius:999px!important}
      @media(max-width:768px){.cms-hero-slide{padding:48px 0!important}.contact-grid{grid-template-columns:1fr!important}}
    `;    document.head.appendChild(style);
  }

  function dynamicRoot() {
    let el = qs('#dynamicPublicPage');
    if (!el) {
      el = document.createElement('section');
      el.id = 'dynamicPublicPage';
      el.className = 'content-shell py-5';
      const nav = qs('.main-nav');
      nav.parentNode.insertBefore(el, nav.nextSibling);
    }
    return el;
  }

  function setHomeVisibility(isHome) {
    const dynamic = qs('#dynamicPublicPage');
    if (dynamic) dynamic.innerHTML = '';
    qsa('#public-site > section, #public-site .main-footer').forEach(el => el.classList.toggle('cms-hidden', !isHome));
    qsa('#dynamicPublicPage').forEach(el => el.classList.toggle('cms-hidden', isHome));
    if (!isHome) dynamicRoot().classList.remove('cms-hidden');
  }

  function renderHero(banners = []) {
    const hero = qs('.hero-section');
    if (!hero || !banners.length) return;
    hero.classList.add('cms-slider-ready');
    const fallback = '/images/shop.jpg';
    hero.innerHTML = banners.map((b, i) => `
      <div class="cms-hero-slide ${i === 0 ? 'active' : ''}" data-hero-slide="${i}">
        <div class="container position-relative">
          <div class="row align-items-center g-4">
            <div class="col-lg-6">
              <h1>${b.title || 'Ankita Cyber Cafe'} <span>${b.subtitle || ''}</span></h1>
              <p>${b.description || 'Fast, reliable digital services for every customer.'}</p>
              <div>
                <a href="${b.button_link || '/services'}" class="btn-primary-accent">${b.button_text || 'Explore Services'}</a>
                <a href="/services" class="btn-outline-white">Apply Now</a>
                <a href="/track-application" class="btn-outline-white">Track Application</a>
              </div>
              <div class="cms-float-grid">
                ${['PAN Card','Aadhaar','CSC','Banking','Passport','Ticket Booking'].map(x => `<div class="cms-float-card">${x}</div>`).join('')}
              </div>
            </div>
            <div class="col-lg-6"><div class="cms-hero-media"><picture><source media="(max-width: 768px)" srcset="${b.mobile_image || b.desktop_image || fallback}"><img src="${b.desktop_image || b.mobile_image || fallback}" alt="${b.title || 'Banner'}"></picture></div></div>
          </div>
        </div>
      </div>`).join('') + `<div class="cms-hero-controls">${banners.map((_, i) => `<button class="cms-hero-dot ${i === 0 ? 'active' : ''}" data-hero-dot="${i}" aria-label="Banner ${i + 1}"></button>`).join('')}</div>`;
    let current = 0;
    const show = (n) => {
      const slides = qsa('[data-hero-slide]', hero); const dots = qsa('[data-hero-dot]', hero);
      current = (n + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    };
    qsa('[data-hero-dot]', hero).forEach(btn => btn.onclick = () => show(Number(btn.dataset.heroDot)));
    if (banners.length > 1) setInterval(() => show(current + 1), 5500);
  }

  function jobCard(item) {
    return `<div class="col-lg-4 col-md-6 mb-4"><div class="content-card job-card"><img src="${item.image_path || '/images/default-job.png'}" alt="${item.title || 'Job'}"><div class="d-flex justify-content-between align-items-start"><h5>${item.title || ''}</h5><span class="badge-status badge-progress">NEW</span></div><p>${item.description || item.body || ''}</p><div class="content-meta"><div><span>Vacancy</span><br><strong>${item.vacancy || '-'}</strong></div><div><span>Qualification</span><br><strong>${item.qualification || '-'}</strong></div><div><span>Age Limit</span><br><strong>${item.age_limit || '-'}</strong></div><div><span>Last Date</span><br><strong>${item.last_date || '-'}</strong></div></div><a href="/job-details?id=${item.id}" class="btn-primary-solid">View Details</a> <a href="${item.apply_link || '#'}" target="_blank" class="btn-success-solid">Apply Now</a></div></div>`;
  }

  async function loadJobDetails() {
    const id = new URLSearchParams(location.search).get('id');
    const root = dynamicRoot();
    if (!id) { root.innerHTML = '<div class="container"><p>Job not found.</p></div>'; return; }
    const job = await api('/api/job/' + id);
    root.innerHTML = `<div class="container"><div class="content-card"><h1>${job.title || ''}</h1><p>${job.description || job.body || ''}</p><div class="content-meta"><div>Vacancy<br><strong>${job.vacancy || '-'}</strong></div><div>Qualification<br><strong>${job.qualification || '-'}</strong></div><div>Age Limit<br><strong>${job.age_limit || '-'}</strong></div><div>Last Date<br><strong>${job.last_date || '-'}</strong></div></div><a href="${job.notification_pdf || '#'}" target="_blank" class="btn-primary-solid">Download Notification</a> <a href="${job.apply_link || '#'}" target="_blank" class="btn-success-solid">Apply Online</a></div></div>`;
  }

  function renderAbout(items = []) {
    const pageData = items[0] || {};
    return `<div class="container"><div class="section-header"><h2>${pageData.title || 'About Us'}</h2><div class="divider"></div><p>${pageData.body || 'Your trusted digital service center.'}</p></div><div class="row g-4 align-items-center mb-4"><div class="col-lg-6"><img src="${pageData.image_path || '/images/shop.jpg'}" class="w-100" style="border-radius:8px;max-height:360px;object-fit:cover" alt="About"></div><div class="col-lg-6"><div class="about-block"><h3>About Company</h3><p>ANKITA CYBER CAFE provides online forms, Aadhaar, PAN, banking, ticket booking, student services, government schemes and document support with professional care.</p><h3>Why Choose Us</h3><p>Fast service, secure process, transparent pricing, trained operators and customer-first support.</p></div></div></div><div class="row g-3 mb-4"><div class="col-md-6"><div class="about-block"><h3>Mission</h3><p>To make digital services simple, reliable and affordable for every citizen.</p></div></div><div class="col-md-6"><div class="about-block"><h3>Vision</h3><p>To be the most trusted local digital service and CSC support center.</p></div></div></div><div class="row g-3 mb-4"><div class="col-md-3"><div class="about-block text-center"><h3>50+</h3><p>Services</p></div></div><div class="col-md-3"><div class="about-block text-center"><h3>5000+</h3><p>Customers</p></div></div><div class="col-md-3"><div class="about-block text-center"><h3>99%</h3><p>Satisfaction</p></div></div><div class="col-md-3"><div class="about-block text-center"><h3>5+</h3><p>Years</p></div></div></div><div class="row g-3 mb-4">${['Owner','Operator','Developer'].map(role => `<div class="col-md-4"><div class="profile-card"><img src="${pageData.image_path || '/images/shop.jpg'}" alt="${role}"><h4>${role} Name</h4><strong>${role}</strong><p>Professional support for Ankita Cyber Cafe services and customer operations.</p></div></div>`).join('')}</div><div class="about-block text-center"><h3>Need Help?</h3><p>Contact us for online applications, documents and service tracking.</p><a href="/contact" class="btn-primary-solid">Contact Us</a></div></div>`;
  }

  function renderContact() {
    return `<div class="container"><div class="section-header"><h2>Contact Us</h2><div class="divider"></div></div><div class="contact-grid"><div class="contact-panel"><h4>Contact Information</h4><p><strong>Address</strong><br>Lalbangla More, Near Sripuram Building, Govindpur, Dhanbad - 828109</p><p><strong>Phone</strong><br>+91 8804183935</p><p><strong>WhatsApp</strong><br>+91 8804183935</p><p><strong>Email</strong><br>ankitadigitalzone@gmail.com</p><p><strong>Working Hours</strong><br>Monday - Saturday: 09:00 AM - 07:00 PM<br>Sunday: 10:00 AM - 02:00 PM</p><div class="quick-actions"><a class="wa" href="https://wa.me/918804183935">WhatsApp</a><a class="call" href="tel:+918804183935">Call Now</a></div></div><div class="contact-panel"><h4>Send Message</h4><input class="form-control" id="routeContactName" placeholder="Full Name"><input class="form-control" id="routeContactMobile" placeholder="Mobile Number"><input class="form-control" id="routeContactEmail" placeholder="Email Address"><textarea class="form-control" id="routeContactMessage" rows="6" placeholder="Your Message"></textarea><button class="btn-primary-solid w-100" id="routeContactSubmit">Send Message</button></div><div class="contact-panel"><h4>Location</h4><iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3649.780204573013!2d86.49049817479428!3d23.826413685854856!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f6bb15c562dce3%3A0x423b346b59b535fc!2sAnkita%20Digital%20Zone%20(CSC)!5e0!3m2!1sen!2sin!4v1781208048979!5m2!1sen!2sin" width="100%" height="260" style="border:0;border-radius:8px" allowfullscreen loading="lazy"></iframe><p class="mt-3"><strong>Social Media</strong><br>Facebook | Instagram | YouTube</p></div></div></div>`;
  }

  async function renderPublicPage() {
    setNav(); injectCmsStyles();
    const isHome = page === 'home';
    setHomeVisibility(isHome);
    if (isHome) {
      const data = await api('/api/public/bootstrap').catch(() => ({}));
      renderHero(data.heroBanners || []);
      return;
    }
    if (page === 'services') {
      const root = dynamicRoot();
      const data = await api('/api/services').catch(() => ({ services: [] }));
      root.innerHTML = `<div class="container"><div class="section-header"><h2>Services</h2><div class="divider"></div><p>Choose a digital service and apply online.</p></div><div class="row g-3">${(data.services || []).map(s => `<div class="col-6 col-md-4 col-lg-3"><div class="content-card text-center"><i class="bi ${s.icon || 'bi-grid'}" style="font-size:34px;color:var(--primary)"></i><h5 class="mt-3">${s.name}</h5><p>${s.description || s.required_documents || ''}</p><strong>${money(s.fee)}</strong><br><button class="btn-primary-solid mt-3" onclick="showNewServiceModal(${s.id})">Apply Now</button></div></div>`).join('') || '<p>No services available yet.</p>'}</div></div>`;
      root.scrollIntoView();
      return;
    }
    if (page === 'pricing') {
      const root = dynamicRoot();
      const data = await api('/api/services').catch(() => ({ services: [] }));
      root.innerHTML = `<div class="container"><div class="section-header"><h2>Pricing</h2><div class="divider"></div></div><div class="portal-card"><div class="card-body-inner"><table class="portal-table"><thead><tr><th>Service</th><th>Category</th><th>Price</th><th>Status</th></tr></thead><tbody>${(data.services || []).map(s => `<tr><td>${s.name}</td><td>${s.category}</td><td>${money(s.fee)}</td><td><span class="badge-status badge-completed">${s.status}</span></td></tr>`).join('') || '<tr><td colspan="4">No pricing available yet.</td></tr>'}</tbody></table></div></div></div>`;
      root.scrollIntoView();
      return;
    }
    if (page === 'track') {
      const root = dynamicRoot();
      root.innerHTML = `<div class="container"><div class="section-header"><h2>Track Application</h2><div class="divider"></div><p>Enter your application ID to check current status.</p></div><div class="portal-card"><div class="card-body-inner"><div class="row g-2 align-items-center"><div class="col-md-9"><input type="text" class="form-control" placeholder="Enter Application ID" id="trackInput"></div><div class="col-md-3"><button class="btn-primary-solid w-100" onclick="trackApplication()">Track</button></div><div class="col-12"><div id="trackResult" style="display:none"></div></div></div></div></div></div>`;
      root.scrollIntoView();
      return;
    }
    if (page.startsWith('login-')) { setHomeVisibility(true); showLoginForm(page.replace('login-','')); return; }
    const root = dynamicRoot();
    if (page === 'job-details') { await loadJobDetails(); return; }
    const titles = { jobs:'Latest Jobs', admit_card:'Admit Card', results:'Results', student_links:'Student Links', about:'About Us', contact:'Contact Us' };
    root.innerHTML = `<div class="container"><div class="section-header"><h2>${titles[page] || 'Page'}</h2><div class="divider"></div></div><div id="dynamicContent" class="row g-3"></div></div>`;
    const box = qs('#dynamicContent');
    if (page === 'jobs') {
      const data = await api('/api/public/jobs');
      box.innerHTML = data.items.map(jobCard).join('') || '<p>No jobs published yet.</p>';
    } else if (page === 'student_links') {
      const data = await api('/api/public/student_links');
      box.innerHTML = data.items.map(i => `<div class="col-md-4"><div class="content-card"><img src="${i.image_path || '/images/default-link.png'}" alt="${i.title}"><h4>${i.title}</h4><p>${i.body || ''}</p><a href="${i.url || '#'}" target="_blank" class="btn-primary-solid">Open Link</a></div></div>`).join('') || '<p>No student links published yet.</p>';
    } else if (page === 'about') {
      const data = await api('/api/public/about');
      root.innerHTML = renderAbout(data.items || []);
    } else if (page === 'contact') {
      root.innerHTML = renderContact();
    } else if (page === 'admit_card' || page === 'results') {
      const data = await api(page === 'admit_card' ? '/api/public/admit_cards' : '/api/public/results');
      box.innerHTML = data.items.map(i => `<div class="col-md-4"><div class="content-card"><img src="${i.image_path || '/images/default-job.png'}" alt="${i.title}"><h4>${i.title}</h4><p>${i.body || ''}</p><a href="${i.url || '#'}" target="_blank" class="btn-primary-solid">${page === 'admit_card' ? 'Download Admit Card' : 'View Result'}</a></div></div>`).join('') || '<p>No records published yet.</p>';
    }
    root.scrollIntoView();
  }

  function hookOriginalContact() {
    const btn = qs('#contact .btn-primary-solid');
    if (!btn) return;
    btn.onclick = async (e) => {
      e.preventDefault();
      const inputs = qsa('#contact input, #contact textarea');
      const [name, mobile, message] = inputs.map(i => i.value);
      try { alert((await api('/api/contact', { method:'POST', body: JSON.stringify({ name, mobile, message }) })).message); inputs.forEach(i => i.value = ''); } catch (err) { alert(err.message); }
    };
  }

  function hookDashboardButtons() { qsa('#customer-portal .sidebar-nav a, #creator-portal .sidebar-nav a, #admin-panel .sidebar-nav a').forEach(a => { if (a.textContent.includes('Logout')) a.href = '/'; }); }
  const oldLogin = window.doLogin;
  window.doLogin = async function() {
    const role = qs('#loginType').value;
    try {
      await api('/api/auth/login', { method:'POST', body: JSON.stringify({ role, login: qs('#loginMobile').value, password: qs('#loginPass').value }) });
      closeModal('loginFormModal');
      if (role === 'admin') location.href = '/admin/dashboard'; else if (role === 'customer') location.href = '/customer/dashboard'; else location.href = '/creator/dashboard';
    } catch (e) { alert(e.message); if (oldLogin) return false; }
  };
  document.addEventListener('click', async (e) => {
    if (e.target?.id === 'routeContactSubmit') {
      try { alert((await api('/api/contact', { method:'POST', body: JSON.stringify({ name:qs('#routeContactName').value, mobile:qs('#routeContactMobile').value, email:qs('#routeContactEmail').value, message:qs('#routeContactMessage').value }) })).message); } catch (err) { alert(err.message); }
    }
  });
  document.addEventListener('DOMContentLoaded', async () => {
    setNav(); hookOriginalContact(); hookDashboardButtons();
    if (page === 'admin-dashboard') { showPage('admin-panel'); if (window.loadAdmin) await window.loadAdmin(); }
    else if (page === 'customer-dashboard') { showPage('customer-portal'); if (window.loadCustomer) await window.loadCustomer(); }
    else if (page === 'creator-dashboard') { showPage('creator-portal'); if (window.loadCreator) await window.loadCreator(); }
    else await renderPublicPage();
  });
})();

document.addEventListener('input', function(e){
  if(e.target.id === 'jobSearch'){
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('.content-card').forEach(card=>{
      card.parentElement.style.display = card.innerText.toLowerCase().includes(search) ? '' : 'none';
    });
  }
});


