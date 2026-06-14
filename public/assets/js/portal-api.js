(() => {
  const state = { user: window.__APP_USER__ || null, services: [], admin: null, customer: null, creator: null, paymentMethod: 'upi' };
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const badge = (status) => {
    const map = { completed:'badge-completed', paid:'badge-completed', active:'badge-completed', pending:'badge-pending', unpaid:'badge-pending', assigned:'badge-assigned', in_progress:'badge-progress', created:'badge-progress', rejected:'badge-rejected', suspended:'badge-rejected', failed:'badge-rejected' };
    return `<span class="badge-status ${map[status] || 'badge-progress'}">${String(status || '').replaceAll('_',' ')}</span>`;
  };
  async function api(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', ...options, headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }
  const toast = (msg) => alert(msg);

  function modalForm(title, fields, onSubmit) {
    const id = 'dynamicActionModal';
    let wrap = qs('#' + id);
    if (!wrap) {
      wrap = document.createElement('div'); wrap.id = id; wrap.className = 'modal-overlay';
      wrap.innerHTML = `<div class="modal-box"><button class="modal-close"><i class="bi bi-x"></i></button><h5></h5><form class="row g-2"></form></div>`;
      document.body.appendChild(wrap);
      wrap.querySelector('.modal-close').onclick = () => wrap.classList.remove('active');
    }
    wrap.querySelector('h5').textContent = title;
    const form = wrap.querySelector('form');
    form.innerHTML = fields.map(f => `<div class="${f.full ? 'col-12' : 'col-6'}"><label class="form-label">${f.label}</label>${f.type === 'textarea' ? `<textarea name="${f.name}" class="form-control" rows="3">${f.value || ''}</textarea>` : f.type === 'select' ? `<select name="${f.name}" class="form-select">${(f.options || []).map(o => `<option value="${o.value ?? o}">${o.label ?? o}</option>`).join('')}</select>` : `<input name="${f.name}" type="${f.type || 'text'}" class="form-control" value="${f.value || ''}" ${f.required ? 'required' : ''}>`}</div>`).join('') + '<div class="col-12 mt-2"><button class="btn-primary-solid w-100">Save</button></div>';
    form.onsubmit = async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(form)); await onSubmit(body); wrap.classList.remove('active'); };
    wrap.classList.add('active');
  }

  async function loadServicesFromApi() {
    const data = await api('/api/services');
    state.services = data.services;
    window.serviceData = data.services.reduce((acc, s) => { (acc[s.category] ||= []).push({ id:s.id, name:s.name, fee:s.fee, docs:s.required_documents }); return acc; }, {});
    window.allServices = data.services.map(s => ({ name:s.name, cat:s.category === 'identity' ? 'csc' : s.category, icon:s.icon || 'bi-grid', color:'#1a3c6e', id:s.id }));
    if (window.renderServices) window.renderServices('all');
  }

  window.renderServices = function(filter='all') {
    const grid = qs('#servicesGrid'); if (!grid) return;
    const rows = filter === 'all' ? window.allServices || [] : (window.allServices || []).filter(s => s.cat === filter);
    grid.innerHTML = rows.map(s => `<div class="col-6 col-md-4 col-lg-2"><div class="service-card" data-service-id="${s.id || ''}" onclick="showNewServiceModal(${s.id || ''})"><i class="bi ${s.icon}" style="color:${s.color};font-size:30px;"></i><span>${s.name}</span></div></div>`).join('');
  };

  window.loadServices = function(sel) {
    const dropdown = qs('#serviceDropdown');
    const services = state.services.filter(s => s.category === sel.value || (sel.value === 'identity' && ['identity','csc'].includes(s.category)));
    dropdown.innerHTML = '<option value="">Select Service</option>' + services.map(s => `<option value="${s.id}" data-fee="${s.fee}" data-docs="${s.required_documents || ''}" data-name="${s.name}">${s.name} - ${money(s.fee)}</option>`).join('');
    dropdown.onchange = function() {
      const opt = this.options[this.selectedIndex];
      if (!opt.value) { qs('#serviceFeeRow').style.display = 'none'; return; }
      qs('#selectedServiceName').textContent = opt.dataset.name; qs('#serviceFeeDisplay').textContent = money(opt.dataset.fee); qs('#reqDocsList').textContent = opt.dataset.docs || 'No special document list'; qs('#serviceFeeRow').style.display = 'block';
    };
  };

  window.showNewServiceModal = function(serviceId) {
    if (!state.user) { showLoginModal(); return; }
    if (state.user.role !== 'customer') return toast('Only customers can submit service applications.');
    qs('#newServiceModal').classList.add('active');
    if (serviceId) { const s = state.services.find(x => x.id == serviceId); const cat = qs('#newServiceModal select'); if (s && cat) { cat.value = s.category; window.loadServices(cat); qs('#serviceDropdown').value = String(s.id); qs('#serviceDropdown').dispatchEvent(new Event('change')); } }
  };

  window.selectPayment = function(el) { qsa('.payment-option').forEach(p=>p.classList.remove('selected')); el.classList.add('selected'); state.paymentMethod = el.textContent.toLowerCase().includes('card') ? 'card' : el.textContent.toLowerCase().includes('bank') ? 'netbanking' : 'upi'; };

  window.doLogin = async function() {
    try {
      const role = qs('#loginType').value;
      const data = await api('/api/auth/login', { method:'POST', body: JSON.stringify({ role, login: qs('#loginMobile').value, password: qs('#loginPass').value }) });
      state.user = data.user; closeModal('loginFormModal');
      if (role === 'customer') { showPage('customer-portal'); await loadCustomer(); }
      if (role === 'creator') { showPage('creator-portal'); await loadCreator(); }
      if (role === 'admin') { showPage('admin-panel'); await loadAdmin(); }
    } catch (e) { toast(e.message); }
  };

  async function register(role = 'customer') {
    const inputs = qsa('#registerModal input, #registerModal select, #registerModal textarea');
    const [name, fatherName, dob, gender, mobile, email, stateName, district, address, password, confirm] = inputs.map(i => i.value);
    if (password !== confirm) return toast('Passwords do not match');
    const data = await api('/api/auth/register', { method:'POST', body: JSON.stringify({ role, name, fatherName, dob, gender, mobile, email, state: stateName, district, address, password }) });
    state.user = data.user; closeModal('registerModal'); toast(data.message); showPage('customer-portal'); await loadCustomer();
  }

  async function submitApplication() {
    try {
      const modal = qs('#newServiceModal');
      const fd = new FormData();
      fd.append('serviceId', qs('#serviceDropdown').value);
      fd.append('notes', modal.querySelector('textarea').value || '');
      fd.append('paymentMethod', state.paymentMethod);
      const file = modal.querySelector('input[type=file]').files[0]; if (file) fd.append('document', file);
      const data = await api('/api/applications', { method:'POST', body: fd });
      await api('/api/payments/verify', { method:'POST', body: JSON.stringify({ orderId: data.paymentOrder.id, paymentId: 'offline-ui-payment' }) });
      closeModal('newServiceModal'); toast(`Application ${data.application.code} submitted and payment recorded.`); await loadCustomer();
    } catch (e) { toast(e.message); }
  }

  window.trackApplication = async function() {
    const resEl = qs('#trackResult');
    try { const id = qs('#trackInput').value.trim().replace(/^#/, ''); const data = await api('/api/track/' + id); resEl.style.display = 'block'; resEl.innerHTML = `<div style="font-size:12px;"><strong>${data.application.service_name}</strong><br>${badge(data.application.status)}</div>`; }
    catch (e) { resEl.style.display = 'block'; resEl.innerHTML = `<div style="font-size:12px;color:var(--red);">${e.message}</div>`; }
  };

  window.loadCustomer = async function loadCustomer() {
    state.customer = await api('/api/customer/dashboard');
    const apps = state.customer.applications;
    const stats = qsa('#customer-portal .dash-stat .val');
    if (stats[0]) stats[0].textContent = apps.length; if (stats[1]) stats[1].textContent = apps.filter(a=>a.status==='completed').length; if (stats[2]) stats[2].textContent = apps.filter(a=>a.status!=='completed').length; if (stats[3]) stats[3].textContent = money(apps.reduce((s,a)=>s+Number(a.amount),0));
    const tbody = qs('#customer-portal .portal-table tbody');
    if (tbody) tbody.innerHTML = apps.map(a => `<tr><td>${a.service_name}</td><td>#${a.code}</td><td>${badge(a.status)}</td><td>${new Date(a.created_at).toLocaleDateString()}</td><td><button class="btn-sm-action btn-primary-solid" data-track="${a.code}">Track</button></td></tr>`).join('') || '<tr><td colspan="5">No applications yet</td></tr>';
    qsa('#customer-portal .portal-sidebar .name').forEach(e=>e.textContent = state.user.name);
  }

  window.loadCreator = async function loadCreator() {
    state.creator = await api('/api/creator/dashboard');
    const tasks = state.creator.tasks;
    const vals = qsa('#creator-portal .dash-stat .val, #creator-portal .earn-card .earn-val');
    if (vals[0]) vals[0].textContent = tasks.length; if (vals[1]) vals[1].textContent = tasks.filter(t=>t.status==='in_progress').length; if (vals[2]) vals[2].textContent = tasks.filter(t=>t.status==='completed').length; if (vals[3]) vals[3].textContent = money(state.creator.stats.available);
    const tbody = qs('#creator-portal .portal-table tbody');
    if (tbody) tbody.innerHTML = tasks.map(t => `<tr><td>#${t.code}</td><td>${t.service_name}</td><td>${t.customer_name}</td><td>${badge(t.status)}</td><td><button class="btn-sm-action btn-success-solid" data-task="${t.id}" data-status="in_progress">Start</button> <button class="btn-sm-action btn-primary-solid" data-task="${t.id}" data-status="completed">Complete</button></td></tr>`).join('') || '<tr><td colspan="5">No assigned tasks yet</td></tr>';
    qsa('#creator-portal .portal-sidebar .name').forEach(e=>e.textContent = state.user.name);
  }

  window.loadAdmin = async function loadAdmin() {
    state.admin = await api('/api/admin/dashboard');
    const vals = qsa('#admin-dashboard .dash-stat .val');
    if (vals[0]) vals[0].textContent = money(state.admin.stats.revenue); if (vals[1]) vals[1].textContent = state.admin.stats.applications; if (vals[2]) vals[2].textContent = state.admin.stats.customers; if (vals[3]) vals[3].textContent = state.admin.stats.creators;
    renderAdminApplications(); renderAdminServices(); renderAdminUsers('customers'); renderAdminUsers('creators'); renderCmsSection('cms','homepage'); renderCmsSection('jobs','job'); renderCmsSection('admit','admit_card'); renderCmsSection('results','result'); renderCmsSection('links','student_link'); renderCmsSection('reviews','review');
    qsa('#admin-panel .portal-sidebar .name').forEach(e=>e.textContent = state.user.name);
  }
  function renderAdminApplications() {
    qsa('#admin-dashboard .portal-table tbody, #admin-applications .portal-table tbody').forEach(tbody => tbody.innerHTML = state.admin.applications.map(a => `<tr><td>#${a.code}</td><td>${a.customer_name}</td><td>${a.service_name}</td><td>${money(a.amount)}</td><td>${badge(a.status)}</td><td>${a.creator_name || '-'}</td><td>${new Date(a.created_at).toLocaleDateString()}</td><td><button class="btn-sm-action btn-success-solid" data-assign-app="${a.id}">Assign</button> <button class="btn-sm-action btn-danger-solid" data-app-status="rejected" data-app="${a.id}">Reject</button></td></tr>`).join(''));
  }
  function renderAdminServices() {
    const tbody = qs('#admin-services .portal-table tbody'); if (!tbody) return;
    tbody.innerHTML = state.admin.services.map(s => `<tr><td><strong>${s.name}</strong></td><td>${s.category}</td><td>${money(s.fee)}</td><td>${money(s.creator_commission)}</td><td>${money(Number(s.fee)-Number(s.creator_commission))}</td><td>${badge(s.status)}</td><td><button class="btn-sm-action btn-primary-solid" data-edit-service="${s.id}">Edit</button> <button class="btn-sm-action btn-danger-solid" data-delete-service="${s.id}">Delete</button></td></tr>`).join('');
  }
  function renderAdminUsers(kind) {
    const section = qs(`#admin-${kind}`); if (!section) return;
    const role = kind === 'customers' ? 'customer' : 'creator';
    api('/api/admin/users/' + role).then(d => { const tbody = section.querySelector('tbody'); tbody.innerHTML = d.users.map(u => `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.mobile || ''}</td><td>${u.email}</td><td>${u.district || ''}</td><td>${badge(u.status)}</td><td><button class="btn-sm-action btn-success-solid" data-user="${u.id}" data-user-status="active">Activate</button> <button class="btn-sm-action btn-danger-solid" data-user="${u.id}" data-user-status="suspended">Suspend</button></td></tr>`).join(''); });
  }
  function ensureAdminSection(name, title) {
    if (qs('#admin-' + name)) return;
    qs('#adminContent').insertAdjacentHTML('beforeend', `<div id="admin-${name}" style="display:none;"><div class="portal-card"><div class="card-head"><h6>${title}</h6><button class="btn-primary-solid" data-add-cms="${name}"><i class="bi bi-plus me-1"></i>Add New</button></div><div class="card-body-inner"><table class="portal-table"><thead><tr><th>Type</th>
<th>Title</th>
<th>Vacancy</th>
<th>Qualification</th>
<th>Age Limit</th>
<th>Last Date</th>
<th>Apply Link</th>
<th>Status</th>
<th>Action</th></tr></thead><tbody></tbody></table></div></div></div>`);
  }
  function renderCmsSection(name, type) {
  ensureAdminSection(name, name.toUpperCase());

  const section = qs(`#admin-${name}`);
  const tbody = qs(`#admin-${name} tbody`);

  if (!tbody) return;

  tbody.innerHTML = (state.admin.cms || [])
    .filter(i => i.type === type)
    .map(i => `
      <tr>
        <td>${i.type}</td>
        <td>${i.title}</td>
        <td>${i.vacancy || '-'}</td>
        <td>${i.qualification || '-'}</td>
        <td>${i.age_limit || '-'}</td>
        <td>${i.last_date || '-'}</td>
        <td>${i.apply_link || '-'}</td>
        <td>${badge(i.status)}</td>
        <td>
          <button class="btn-sm-action btn-primary-solid"
            data-edit-cms="${i.id}">
            Edit
          </button>
        </td>
      </tr>
    `).join('') || `
      <tr>
        <td colspan="9">No records</td>
      </tr>
    `;
}

  const originalShowAdminSection = window.showAdminSection;
  window.showAdminSection = function(section) {
    const aliases = { payments:'dashboard', withdrawals:'dashboard', reports:'dashboard', settings:'cms', banners:'cms', cms:'cms', jobs:'jobs', admit:'admit', results:'results', links:'links', reviews:'reviews', tasks:'applications' };
originalShowAdminSection(aliases[section] || section);

qsa('#adminContent > div').forEach(el => el.style.display = 'none');

const target = qs('#admin-' + (aliases[section] || section));
if (target) target.style.display = 'block';

    
    if (state.admin) {
   renderAdminServices();
   renderAdminApplications();

   renderCmsSection('jobs','job');
   renderCmsSection('admit','admit_card');
   renderCmsSection('results','result');
   renderCmsSection('links','student_link');
   renderCmsSection('reviews','review');
   renderCmsSection('cms','homepage');
}
  };

  async function logout() { await api('/api/auth/logout', { method:'POST', body:'{}' }); state.user = null; showPage('public-site'); }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('button,a,.login-type-card'); if (!btn) return;
    try {
      if (btn.closest('#registerModal') && btn.textContent.includes('Register Now')) { e.preventDefault(); await register('customer'); }
      if (btn.closest('#newServiceModal') && btn.textContent.includes('Submit Application')) { e.preventDefault(); await submitApplication(); }
      if (btn.textContent.includes('Forgot Password')) { e.preventDefault(); const email = prompt('Enter your email'); if (email) toast((await api('/api/auth/forgot-password', { method:'POST', body: JSON.stringify({ email }) })).message); }
      if (btn.textContent.includes('Logout')) { e.preventDefault(); await logout(); }
      if (btn.dataset.track) { qs('#trackInput').value = btn.dataset.track; showPage('public-site'); document.getElementById('track').scrollIntoView(); await trackApplication(); }
      if (btn.dataset.task) { await api(`/api/tasks/${btn.dataset.task}/status`, { method:'PATCH', body: JSON.stringify({ status: btn.dataset.status }) }); await loadCreator(); }
      if (btn.dataset.assignApp) { const creators = (await api('/api/admin/users/creator')).users.filter(u=>u.status==='active'); const creatorId = prompt('Creator ID to assign:\n' + creators.map(c=>`${c.id}: ${c.name}`).join('\n')); if (creatorId) { await api(`/api/admin/applications/${btn.dataset.assignApp}/assign`, { method:'POST', body: JSON.stringify({ creatorId }) }); await loadAdmin(); } }
      if (btn.dataset.appStatus) { await api(`/api/admin/applications/${btn.dataset.app}/status`, { method:'PATCH', body: JSON.stringify({ status: btn.dataset.appStatus }) }); await loadAdmin(); }
      if (btn.dataset.user) { await api(`/api/admin/users/${btn.dataset.user}/status`, { method:'PATCH', body: JSON.stringify({ status: btn.dataset.userStatus }) }); await loadAdmin(); }
if (btn.dataset.editService) {
    e.preventDefault();

    const service = state.admin.services.find(
        s => String(s.id) === String(btn.dataset.editService)
    );

    if (!service) return;

    const name = prompt('Service Name', service.name);
    if (name === null) return;

    const category = prompt('Category', service.category);
    const fee = prompt('Fee', service.fee);

    await api(`/api/admin/services/${service.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
            name,
            category,
            fee
        })
    });

    await loadAdmin();
}


if (btn.dataset.addCms) {
    e.preventDefault();

    const title = prompt('Title');
    if (!title) return;

    const description = prompt('Description', '');
    const imagePath = prompt('Image URL', '');
    const url = prompt('URL', '');
    const status = prompt('Status (published/draft)', 'published');
    const sortOrder = prompt('Sort Order', '0');
const vacancy = prompt('Vacancy', '');
const qualification = prompt('Qualification', '');
const ageLimit = prompt('Age Limit', '');
const lastDate = prompt('Last Date', '');
const notificationPdf = prompt('Notification PDF URL', '');
const applyLink = prompt('Apply Link', '');

    const typeMap = {
 jobs:'job',
 admit:'admit_card',
 results:'result',
 links:'student_link',
 reviews:'review',
 about:'about',
 contact:'contact',
 cms:'homepage'
};

    await api('/api/admin/cms', {
        method: 'POST',
        body: JSON.stringify({
  type: typeMap[btn.dataset.addCms] || btn.dataset.addCms,
  title,
  body: description,
  imagePath,
  url,
  status,
  sortOrder,

  vacancy,
  qualification,
  ageLimit,
  lastDate,
  notificationPdf,
  applyLink
})
    });

    await loadAdmin();
}

if (btn.dataset.editCms) {
    e.preventDefault();

    const item = state.admin.cms.find(
        x => String(x.id) === String(btn.dataset.editCms)
    );

    if (!item) return;

    const title = prompt('Title', item.title || '');
    if (title === null) return;

    const description = prompt('Description', item.body || '');
    const imagePath = prompt('Image URL', item.image_path || '');
    const url = prompt('URL', item.url || '');
    const status = prompt('Status', item.status || 'published');
    const sortOrder = prompt('Sort Order', item.sort_order || 0);

    const vacancy = prompt('Vacancy', item.vacancy || '');
const qualification = prompt('Qualification', item.qualification || '');
const ageLimit = prompt('Age Limit', item.age_limit || '');
const lastDate = prompt('Last Date', item.last_date || '');
const notificationPdf = prompt('Notification PDF URL', item.notification_pdf || '');
const applyLink = prompt('Apply Link', item.apply_link || '');

await api(`/api/admin/cms/${item.id}`, {
  method: 'PATCH',
  body: JSON.stringify({
    type: item.type,
    title,
    body: description,
    imagePath,
    url,
    status,
    sortOrder,

    vacancy,
    qualification,
    ageLimit,
    lastDate,
    notificationPdf,
    applyLink
  })
});

    await loadAdmin();
}
      if (btn.dataset.deleteService) { await api(`/api/admin/services/${btn.dataset.deleteService}`, { method:'DELETE' }); await loadAdmin(); }
      if (btn.textContent.includes('Add Service')) { e.preventDefault(); modalForm('Add Service', [{name:'name',label:'Name',required:true},{name:'category',label:'Category',value:'identity'},{name:'fee',label:'Customer Fee',type:'number'},{name:'creatorCommission',label:'Creator Commission',type:'number'},{name:'requiredDocuments',label:'Required Documents',type:'textarea',full:true}], async b => { await api('/api/admin/services', { method:'POST', body: JSON.stringify(b) }); await loadAdmin(); }); }
      if (btn.textContent.includes('Withdraw Request') || btn.textContent.includes('Request Withdrawal')) { e.preventDefault(); modalForm('Withdrawal Request', [{name:'amount',label:'Amount',type:'number',required:true},{name:'upiId',label:'UPI ID',required:true}], async b => { await api('/api/withdrawals', { method:'POST', body: JSON.stringify(b) }); await loadCreator(); }); }
      if (btn.textContent.includes('Support Ticket')) { e.preventDefault(); modalForm('Support Ticket', [{name:'subject',label:'Subject',full:true,required:true},{name:'message',label:'Message',type:'textarea',full:true}], async b => { await api('/api/support-tickets', { method:'POST', body: JSON.stringify(b) }); toast('Support ticket created'); }); }
      if (btn.textContent.includes('Payment History')) { e.preventDefault(); toast((state.customer?.payments || []).map(p => `${p.application_code || ''} ${money(p.amount)} ${p.status}`).join('\n') || 'No payments found'); }
      if (btn.textContent.includes('Upload Documents')) { e.preventDefault(); showNewServiceModal(); }
      /*if (btn.textContent.includes('Download') || btn.textContent.includes('Download Files')) { e.preventDefault(); toast('Downloads are available from completed application records after final work upload.'); }*/
    } catch (err) { toast(err.message); }
  });

  qsa('.admin-sidebar .sidebar-nav a').forEach(a => {
    const text = a.textContent.toLowerCase();
    const map = [['task','tasks'],['payment','payments'],['withdraw','withdrawals'],['job','jobs'],['admit','admit'],['result','results'],['student','links'],['review','reviews'],['cms','cms'],['banner','cms'],['report','reports'],['setting','settings']];
    const hit = map.find(([k]) => text.includes(k)); if (hit && !a.getAttribute('onclick')?.includes('showAdminSection')) a.onclick = () => { showAdminSection(hit[1]); return false; };
  });

  document.addEventListener('DOMContentLoaded', async () => { try { await loadServicesFromApi(); const me = await api('/api/auth/me'); state.user = me.user; } catch (_) {} });
})();


(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
  const modules = {
    cmsPages: { title: 'CMS Pages', endpoint: '/api/admin/cms-pages', state: 'cms', id: 'cms-pages', fields: [
      ['type','Page Type','select',['homepage','about','contact']], ['title','Title'], ['body','Description','textarea'], ['image','Image Upload','file'], ['status','Status','select',['published','draft']]
    ]},
    heroBanners: { title: 'Hero Banners', endpoint: '/api/admin/hero-banners', state: 'heroBanners', id: 'hero-banners', fields: [
      ['title','Banner Title'], ['subtitle','Banner Subtitle'], ['description','Banner Description','textarea'], ['buttonText','Button Text'], ['buttonLink','Button Link'], ['desktopImage','Desktop Banner Image','file'], ['mobileImage','Mobile Banner Image','file'], ['displayOrder','Display Order','number'], ['status','Status','select',['active','inactive']]
    ]},
    jobs: { title: 'Jobs', endpoint: '/api/admin/jobs', state: 'jobs', id: 'jobs', fields: [
      ['title','Job Title'], ['vacancy','Vacancy'], ['qualification','Qualification'], ['ageLimit','Age Limit'], ['lastDate','Last Date','date'], ['notificationPdf','Notification PDF Upload','file'], ['applyLink','Apply Link'], ['description','Description','textarea'], ['image','Image Upload','file'], ['status','Status','select',['published','draft','archived']]
    ]},
    admitCards: { title: 'Admit Cards', endpoint: '/api/admin/admit-cards', state: 'admitCards', id: 'admit-cards', fields: [
      ['examName','Exam Name'], ['examDate','Exam Date','date'], ['downloadLink','Download Link'], ['description','Description','textarea'], ['image','Image Upload','file'], ['status','Status','select',['published','draft','archived']]
    ]},
    results: { title: 'Results', endpoint: '/api/admin/results', state: 'results', id: 'results', fields: [
      ['examName','Exam Name'], ['resultDate','Result Date','date'], ['resultLink','Result Link'], ['description','Description','textarea'], ['image','Image Upload','file'], ['status','Status','select',['published','draft','archived']]
    ]},
    studentLinks: { title: 'Student Links', endpoint: '/api/admin/student-links', state: 'studentLinks', id: 'student-links', fields: [
      ['title','Title'], ['url','Website URL'], ['logo','Logo Upload','file'], ['description','Description','textarea'], ['status','Status','select',['published','draft','archived']]
    ]}
  };
  let adminData = null;

  async function api(url, options = {}) {
    const res = await fetch(url, { credentials: 'include', ...options, headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }

  function badge(status) {
    const map = { active:'badge-completed', published:'badge-completed', draft:'badge-pending', inactive:'badge-rejected', archived:'badge-rejected' };
    return `<span class="badge-status ${map[status] || 'badge-progress'}">${String(status || '').replaceAll('_',' ')}</span>`;
  }

  function ensureStyles() {
    if (qs('#adminCmsStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminCmsStyles';
    style.textContent = `.cms-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px}.cms-toolbar input{max-width:280px}.cms-preview{width:54px;height:42px;object-fit:cover;border-radius:6px;border:1px solid var(--border);background:var(--bg)}.cms-modal-wide{width:720px}.cms-pagination{display:flex;gap:6px;justify-content:flex-end;margin-top:12px}.cms-pagination button{border:1px solid var(--border);background:var(--bg-card);border-radius:6px;padding:5px 10px}.cms-pagination button.active{background:var(--primary);color:#fff}.toggle-pill{border:0;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:700}.toggle-pill.on{background:#dcfce7;color:#166534}.toggle-pill.off{background:#fee2e2;color:#991b1b}`;
    document.head.appendChild(style);
  }

  function normalized(moduleKey, item) {
    if (moduleKey === 'cmsPages') return { id:item.id, title:item.title, subtitle:item.type, description:item.body, image:item.image_path, status:item.status, raw:item };
    if (moduleKey === 'heroBanners') return { id:item.id, title:item.title, subtitle:item.subtitle, description:item.description, image:item.desktop_image || item.mobile_image, status:item.status, raw:item };
    if (moduleKey === 'jobs') return { id:item.id, title:item.title, subtitle:item.qualification || item.vacancy, description:item.description, image:item.image_path, status:item.status, raw:item };
    if (moduleKey === 'admitCards') return { id:item.id, title:item.exam_name, subtitle:item.exam_date, description:item.description, image:item.image_path, status:item.status, raw:item };
    if (moduleKey === 'results') return { id:item.id, title:item.exam_name, subtitle:item.result_date, description:item.description, image:item.image_path, status:item.status, raw:item };
    if (moduleKey === 'studentLinks') return { id:item.id, title:item.title, subtitle:item.url, description:item.description, image:item.logo, status:item.status, raw:item };
    return { id:item.id, title:item.name || item.service_name, subtitle:item.category, description:item.description || item.required_documents, image:item.image_path, status:item.status, raw:item };
  }

  function ensureSection(moduleKey) {
    const mod = modules[moduleKey];
    let el = qs(`#admin-${mod.id}`);
    if (el) return el;
    qs('#adminContent')?.insertAdjacentHTML('beforeend', `<div id="admin-${mod.id}" style="display:none"><div class="portal-card"><div class="card-head"><h6>${mod.title}</h6><button class="btn-primary-solid" data-cms-add="${moduleKey}"><i class="bi bi-plus me-1"></i>Add New</button></div><div class="card-body-inner"><div class="cms-toolbar"><input class="form-control" placeholder="Search ${mod.title}" data-cms-search="${moduleKey}"><span data-cms-count="${moduleKey}" style="font-size:12px;color:var(--text-muted)"></span></div><div style="overflow:auto"><table class="portal-table"><thead><tr><th>Preview</th><th>Title</th><th>Details</th><th>Status</th><th>Action</th></tr></thead><tbody></tbody></table></div><div class="cms-pagination" data-cms-pages="${moduleKey}"></div></div></div></div>`);
    return qs(`#admin-${mod.id}`);
  }

  function renderModule(moduleKey, pageNo = 1) {
    ensureStyles();
    const mod = modules[moduleKey];
    const section = ensureSection(moduleKey);
    const search = qs(`[data-cms-search="${moduleKey}"]`)?.value?.toLowerCase() || '';
    const rows = (adminData?.[mod.state] || []).filter(item => ['homepage','about','contact'].includes(item.type || '') || moduleKey !== 'cmsPages').filter(item => JSON.stringify(item).toLowerCase().includes(search));
    const pageSize = 8;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    const current = Math.min(pageNo, pages);
    const visible = rows.slice((current - 1) * pageSize, current * pageSize);
    qs(`[data-cms-count="${moduleKey}"]`).textContent = `${rows.length} records`;
    section.querySelector('tbody').innerHTML = visible.map(item => {
      const n = normalized(moduleKey, item);
      return `<tr><td>${n.image ? `<img class="cms-preview" src="${n.image}" alt="Preview">` : '-'}</td><td><strong>${n.title || '-'}</strong><br><small>${n.subtitle || ''}</small></td><td>${(n.description || '').slice(0, 120)}</td><td><button class="toggle-pill ${['active','published'].includes(n.status) ? 'on' : 'off'}" data-cms-toggle="${moduleKey}" data-id="${n.id}">${n.status || '-'}</button></td><td><button class="btn-sm-action btn-primary-solid" data-cms-edit="${moduleKey}" data-id="${n.id}">Edit</button> <button class="btn-sm-action btn-success-solid" data-cms-preview="${moduleKey}" data-id="${n.id}">Preview</button> <button class="btn-sm-action btn-danger-solid" data-cms-delete="${moduleKey}" data-id="${n.id}">Delete</button></td></tr>`;
    }).join('') || '<tr><td colspan="5">No records</td></tr>';
    qs(`[data-cms-pages="${moduleKey}"]`).innerHTML = Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === current ? 'active' : ''}" data-cms-page="${moduleKey}" data-page="${i + 1}">${i + 1}</button>`).join('');
  }

  function currentItem(moduleKey, id) {
    const mod = modules[moduleKey];
    return (adminData?.[mod.state] || []).find(x => String(x.id) === String(id));
  }

  function valueFor(item, name) {
    if (!item) return '';
    const map = { buttonText:'button_text', buttonLink:'button_link', displayOrder:'display_order', ageLimit:'age_limit', lastDate:'last_date', applyLink:'apply_link', examName:'exam_name', examDate:'exam_date', downloadLink:'download_link', resultDate:'result_date', resultLink:'result_link', serviceName:'name', price:'fee', body:'body' };
    return item[name] ?? item[map[name]] ?? '';
  }

  function openForm(moduleKey, item = null) {
    const mod = modules[moduleKey];
    let wrap = qs('#professionalCmsModal');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'professionalCmsModal';
      wrap.className = 'modal-overlay';
      wrap.innerHTML = `<div class="modal-box cms-modal-wide"><button class="modal-close"><i class="bi bi-x"></i></button><h5></h5><form class="row g-2"></form></div>`;
      document.body.appendChild(wrap);
      wrap.querySelector('.modal-close').onclick = () => wrap.classList.remove('active');
    }
    wrap.querySelector('h5').textContent = `${item ? 'Edit' : 'Add'} ${mod.title}`;
    const form = wrap.querySelector('form');
    form.innerHTML = mod.fields.map(([name, label, type = 'text', options = []]) => {
      const value = valueFor(item, name);
      const full = type === 'textarea' || type === 'file';
      if (type === 'textarea') return `<div class="col-12"><label class="form-label">${label}</label><textarea name="${name}" class="form-control" rows="4">${value || ''}</textarea></div>`;
      if (type === 'select') return `<div class="col-md-6"><label class="form-label">${label}</label><select name="${name}" class="form-select">${options.map(o => `<option value="${o}" ${String(value || options[0]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
      return `<div class="${full ? 'col-12' : 'col-md-6'}"><label class="form-label">${label}</label><input name="${name}" type="${type}" class="form-control" value="${type === 'file' ? '' : (value || '')}"></div>`;
    }).join('') + '<div class="col-12 mt-2"><button class="btn-primary-solid w-100">Save</button></div>';
    form.onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      qsa('input[type=file]', form).forEach(input => { if (!input.files.length) fd.delete(input.name); });
      await api(item ? `${mod.endpoint}/${item.id}` : mod.endpoint, { method: item ? 'PATCH' : 'POST', body: fd });
      wrap.classList.remove('active');
      await reloadAdminCms(moduleKey);
    };
    wrap.classList.add('active');
  }

  function previewItem(moduleKey, item) {
    const n = normalized(moduleKey, item);
    let wrap = qs('#professionalPreviewModal');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'professionalPreviewModal';
      wrap.className = 'modal-overlay';
      wrap.innerHTML = `<div class="modal-box"><button class="modal-close"><i class="bi bi-x"></i></button><h5>Preview</h5><div class="preview-body"></div></div>`;
      document.body.appendChild(wrap);
      wrap.querySelector('.modal-close').onclick = () => wrap.classList.remove('active');
    }
    wrap.querySelector('.preview-body').innerHTML = `${n.image ? `<img src="${n.image}" class="w-100 mb-3" style="border-radius:8px;max-height:260px;object-fit:cover">` : ''}<h4>${n.title || '-'}</h4><p>${n.description || ''}</p>${badge(n.status)}`;
    wrap.classList.add('active');
  }

  async function reloadAdminCms(moduleKey) {
    adminData = await api('/api/admin/dashboard');
    Object.keys(modules).forEach(k => renderModule(k));
    if (moduleKey) showProfessionalSection(moduleKey);
  }

  function showProfessionalSection(moduleKey) {
    const mod = modules[moduleKey];
    if (!mod) return false;
    qsa('#adminContent > div').forEach(el => el.style.display = 'none');
    ensureSection(moduleKey).style.display = 'block';
    const title = qs('#adminPageTitle');
    if (title) title.innerHTML = `<i class="bi bi-layout-text-window me-2"></i>${mod.title}`;
    renderModule(moduleKey);
    return false;
  }

  const oldLoadAdmin = window.loadAdmin;
  window.loadAdmin = async function() {
    if (oldLoadAdmin) await oldLoadAdmin();
    await reloadAdminCms();
  };

  const oldShowAdminSection = window.showAdminSection;
  window.showAdminSection = function(section) {
    const map = { cms:'cmsPages', pages:'cmsPages', banners:'heroBanners', hero:'heroBanners', jobs:'jobs', admit:'admitCards', admitCards:'admitCards', results:'results', links:'studentLinks', studentLinks:'studentLinks' };
    if (map[section]) return showProfessionalSection(map[section]);
    return oldShowAdminSection ? oldShowAdminSection(section) : false;
  };

  document.addEventListener('click', async (e) => {
    const nav = e.target.closest('.admin-sidebar .sidebar-nav a');
    if (nav) {
      const text = nav.textContent.toLowerCase();
      if (text.includes('cms')) { e.preventDefault(); return showProfessionalSection('cmsPages'); }
      if (text.includes('banner')) { e.preventDefault(); return showProfessionalSection('heroBanners'); }
      if (text.includes('job')) { e.preventDefault(); return showProfessionalSection('jobs'); }
      if (text.includes('admit')) { e.preventDefault(); return showProfessionalSection('admitCards'); }
      if (text.includes('result')) { e.preventDefault(); return showProfessionalSection('results'); }
      if (text.includes('student')) { e.preventDefault(); return showProfessionalSection('studentLinks'); }
    }
    const btn = e.target.closest('[data-cms-add],[data-cms-edit],[data-cms-delete],[data-cms-preview],[data-cms-toggle],[data-cms-page]');
    if (!btn) return;
    try {
      if (btn.dataset.cmsAdd) return openForm(btn.dataset.cmsAdd);
      if (btn.dataset.cmsEdit) return openForm(btn.dataset.cmsEdit, currentItem(btn.dataset.cmsEdit, btn.dataset.id));
      if (btn.dataset.cmsPreview) return previewItem(btn.dataset.cmsPreview, currentItem(btn.dataset.cmsPreview, btn.dataset.id));
      if (btn.dataset.cmsPage) return renderModule(btn.dataset.cmsPage, Number(btn.dataset.page));
      if (btn.dataset.cmsDelete) {
        if (!confirm('Delete this record? It will be disabled/archived safely.')) return;
        const mod = modules[btn.dataset.cmsDelete];
        await api(`${mod.endpoint}/${btn.dataset.id}`, { method:'DELETE' });
        await reloadAdminCms(btn.dataset.cmsDelete);
      }
      if (btn.dataset.cmsToggle) {
        const moduleKey = btn.dataset.cmsToggle;
        const item = currentItem(moduleKey, btn.dataset.id);
        const mod = modules[moduleKey];
        const fd = new FormData();
        Object.entries(item || {}).forEach(([k, v]) => { if (v !== null && typeof v !== 'object') fd.append(k, v); });
        const next = ['active','published'].includes(item.status) ? (moduleKey === 'heroBanners' ? 'inactive' : 'draft') : (moduleKey === 'heroBanners' ? 'active' : 'published');
        fd.set('status', next);
        await api(`${mod.endpoint}/${btn.dataset.id}`, { method:'PATCH', body: fd });
        await reloadAdminCms(moduleKey);
      }
    } catch (err) { alert(err.message); }
  });

  document.addEventListener('input', (e) => {
    if (e.target.dataset.cmsSearch) renderModule(e.target.dataset.cmsSearch);
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (!qs('#admin-panel')) return;
    ensureStyles();
    Object.keys(modules).forEach(ensureSection);
  });
})();
