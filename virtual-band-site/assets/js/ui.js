/* Virtual Band UI — button-only, VN-style control.
   - No fetch() so it works when opened as file:// locally.
   - Data comes from content/*.js (global constants).
*/

(function(){
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const logEl = $('#console-log');
  const overlay = $('#overlay');
  const overlayTitle = $('#overlay-title');
  const overlayBody = $('#overlay-body');

  function nowStamp(){
    const d = new Date();
    // concise, readable
    const pad = (n)=> String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function log(line){
    if(!logEl) return;
    const p = document.createElement('p');
    p.className = 'logline';
    p.textContent = `[${nowStamp()}] ${line}`;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog(){
    if(!logEl) return;
    logEl.innerHTML = '';
    log('LOG CLEARED.');
  }

  function openOverlay(title, html){
    if(!overlay) return;
    overlayTitle.textContent = title;
    overlayBody.innerHTML = html;
    overlay.setAttribute('aria-hidden','false');
    log(`PANEL OPEN: ${title}`);
  }

  function closeOverlay(){
    if(!overlay) return;
    overlay.setAttribute('aria-hidden','true');
    overlayTitle.textContent = 'PANEL';
    overlayBody.innerHTML = '';
    log('PANEL CLOSED.');
  }

  function pickRandom(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // System messages (editable by you in content/system_messages.js)
  function sysMessage(tag){
    const pool = (window.VB_SYSTEM_MESSAGES && window.VB_SYSTEM_MESSAGES[tag]) || [];
    const fallback = (window.VB_SYSTEM_MESSAGES && window.VB_SYSTEM_MESSAGES['random']) || [];
    const msg = pool.length ? pickRandom(pool) : (fallback.length ? pickRandom(fallback) : 'OK.');
    log(msg);
    return msg;
  }

  // Populate latest list on index
  function renderLatest(){
    const list = $('#latest-list');
    if(!list || !window.VB_ARTICLES) return;

    const items = [...window.VB_ARTICLES]
      .filter(a => a.id !== 'statement')
      .sort((a,b)=> (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);

    list.innerHTML = '';
    items.forEach(a=>{
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `article.html?id=${encodeURIComponent(a.id)}`;
      link.textContent = `${a.title} — ${a.date}`;
      li.appendChild(link);
      list.appendChild(li);
    });

    if(items.length === 0){
      const li = document.createElement('li');
      li.textContent = 'No entries yet.';
      list.appendChild(li);
    }
  }

  function renderArchivePanel(){
    const articles = window.VB_ARTICLES || [];
    const rows = articles
      .slice()
      .sort((a,b)=> (b.date || '').localeCompare(a.date || ''))
      .map(a=> `<li><a href="article.html?id=${encodeURIComponent(a.id)}">${escapeHtml(a.title)}</a> <span class="muted">— ${escapeHtml(a.date || '')}</span></li>`)
      .join('');
    const html = `
      <div class="lede" style="margin-bottom:10px;">
        Archive index. Add entries by editing <code>content/articles.js</code>.
      </div>
      <ul class="list">${rows || '<li>Empty.</li>'}</ul>
    `;
    openOverlay('ARCHIVE', html);
  }

  function renderMediaPanel(){
    const media = window.VB_MEDIA || { youtube: [], photos: [] };

    const yt = (media.youtube || []).map(x => {
      const title = escapeHtml(x.title || 'YouTube');
      const url = escapeAttr(x.url || '#');
      const date = escapeHtml(x.date || '');
      return `<li><a href="${url}" target="_blank" rel="noopener">${title}</a> <span class="muted">— ${date}</span></li>`;
    }).join('');

    const ph = (media.photos || []).map(x => {
      const title = escapeHtml(x.title || 'Photo');
      const src = escapeAttr(x.src || '');
      const date = escapeHtml(x.date || '');
      return `<li>
        <div style="display:flex; gap:12px; align-items:flex-start; flex-wrap:wrap;">
          <img src="${src}" alt="${title}" style="width:160px; border:1px solid var(--line);"/>
          <div>
            <div style="font-family:ui-sans-serif,system-ui; letter-spacing:.12em; text-transform:uppercase; font-size:12px;">${title}</div>
            <div class="muted" style="margin-top:4px;">${date}</div>
          </div>
        </div>
      </li>`;
    }).join('');

    const html = `
      <div class="lede" style="margin-bottom:12px;">
        Minimal media directory. Add links/images by editing <code>content/media.js</code>.
      </div>

      <h3 style="margin: 0 0 8px; letter-spacing:.12em; text-transform:uppercase; font-family:ui-sans-serif,system-ui; font-size:12px;">YouTube</h3>
      <ul class="list">${yt || '<li>Empty.</li>'}</ul>

      <h3 style="margin: 18px 0 8px; letter-spacing:.12em; text-transform:uppercase; font-family:ui-sans-serif,system-ui; font-size:12px;">Photos</h3>
      <ul class="list">${ph || '<li>Empty.</li>'}</ul>
    `;
    openOverlay('MEDIA', html);
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }
  function escapeAttr(s){
    return escapeHtml(s).replace(/'/g,'&#39;');
  }

  function articlePageInit(){
    const isArticle = window.location.pathname.endsWith('article.html') || window.location.href.includes('article.html');
    if(!isArticle) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || 'statement';

    const a = (window.VB_ARTICLES || []).find(x => x.id === id);
    const titleEl = document.getElementById('article-title');
    const metaEl = document.getElementById('article-meta');
    const contentEl = document.getElementById('article-content');

    if(!a){
      titleEl.textContent = 'NOT FOUND';
      metaEl.textContent = '';
      contentEl.textContent = 'Entry not found. Check content/articles.js.';
      log(`ARTICLE NOT FOUND: ${id}`);
      return;
    }

    titleEl.textContent = a.title || 'UNTITLED';
    metaEl.textContent = a.date || '';
    contentEl.textContent = a.content || '';
    log(`ARTICLE OPEN: ${a.id}`);
  }

  function handleAction(action, el){
    switch(action){
      case 'open-article': {
        const id = el.dataset.id || 'statement';
        log(`NAVIGATE: article ${id}`);
        window.location.href = `article.html?id=${encodeURIComponent(id)}`;
        break;
      }
      case 'open-archive':
        renderArchivePanel();
        break;
      case 'open-media':
        renderMediaPanel();
        break;
      case 'close-overlay':
        closeOverlay();
        break;

      // System / VN button actions
      case 'sys:boot':
        log('SYSTEM BOOT...');
        sysMessage('boot');
        break;
      case 'sys:diag':
        log('RUNNING DIAGNOSTIC...');
        sysMessage('diag');
        break;
      case 'sys:random':
        sysMessage('random');
        break;
      case 'sys:seal':
        sysMessage('seal');
        break;
      case 'sys:signal':
        sysMessage('signal');
        break;
      case 'sys:radio':
        sysMessage('radio');
        break;
      case 'sys:press':
        sysMessage('press');
        break;
      case 'sys:release':
        sysMessage('release');
        break;
      case 'sys:inventory':
        sysMessage('inventory');
        break;
      case 'sys:map':
        sysMessage('map');
        break;
      case 'sys:credits':
        sysMessage('credits');
        break;
      case 'sys:time':
        log(`TIME: ${new Date().toString()}`);
        break;
      case 'sys:hash':
        // lightweight pseudo-hash for a "system" feel
        const raw = `${Date.now()}|${navigator.userAgent}|${Math.random()}`;
        let h = 0;
        for(let i=0;i<raw.length;i++){ h = ((h<<5)-h) + raw.charCodeAt(i); h |= 0; }
        log(`HASH: ${('00000000' + (h>>>0).toString(16)).slice(-8)}`);
        break;
      case 'sys:clear':
        clearLog();
        break;
      default:
        log(`UNKNOWN ACTION: ${action}`);
        sysMessage('random');
    }
  }

  document.addEventListener('click', (e)=>{
    const target = e.target.closest('[data-action]');
    if(!target) return;
    const action = target.dataset.action;
    handleAction(action, target);
  });

  // Close overlay if clicking outside card
  document.addEventListener('click', (e)=>{
    if(!overlay) return;
    if(overlay.getAttribute('aria-hidden') === 'true') return;
    const card = e.target.closest('.overlay__card');
    if(!card && e.target === overlay){
      closeOverlay();
    }
  });

  // Init
  renderLatest();
  articlePageInit();
  // Initial log lines
  log('READY.');
  sysMessage('boot');

})();