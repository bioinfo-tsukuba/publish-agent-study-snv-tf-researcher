(function () {
  'use strict';
  var STATE = { papers: [], q: '', status: '', tag: '' };

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function deriveLinks(p) {
    var id = p && p.id ? String(p.id) : '';
    var base = id ? 'papers/' + encodeURIComponent(id) + '/' : '';
    var md = p && p.paper_md_path ? String(p.paper_md_path) : (id ? base + 'paper.md' : '');
    var html = md ? md.replace(/\.md$/, '.html') : '';
    var pdf = p && p.pdf_url ? String(p.pdf_url) : (md ? md.replace(/\.md$/, '.pdf') : '');
    var meta = id ? base + 'metadata.json' : '';
    return { md: md, html: html, pdf: pdf, meta: meta };
  }

  function paperCard(p) {
    var tags = Array.isArray(p && p.tags) ? p.tags : [];
    var links = deriveLinks(p);
    var parts = [];
    parts.push('<article class="paper">');
    parts.push('<h2>' + escapeHtml(p.title || 'Untitled') + '</h2>');
    parts.push('<div class="meta">');
    parts.push('<span class="status status-' + escapeHtml(p.status || 'unknown') + '">' + escapeHtml(p.status || 'unknown') + '</span>');
    if (p.created_at) parts.push('<time>' + escapeHtml(p.created_at) + '</time>');
    if (p.updated_at && p.updated_at !== p.created_at) {
      parts.push('<time class="updated">updated ' + escapeHtml(p.updated_at) + '</time>');
    }
    for (var i = 0; i < tags.length; i++) {
      parts.push('<span class="tag">' + escapeHtml(tags[i]) + '</span>');
    }
    if (p.quality_score != null) parts.push('<span class="score">score ' + escapeHtml(String(p.quality_score)) + '</span>');
    if (p.agent_commit) parts.push('<span class="commit">commit ' + escapeHtml(String(p.agent_commit).slice(0, 7)) + '</span>');
    parts.push('</div>');
    parts.push('<p class="abstract">' + escapeHtml(p.abstract || '') + '</p>');
    if (p.error_summary) parts.push('<p class="error">⚠ ' + escapeHtml(p.error_summary) + '</p>');
    parts.push('<div class="links">');
    if (links.md)   parts.push('<a href="' + escapeHtml(links.md)   + '">paper.md</a>');
    if (links.html) parts.push('<a href="' + escapeHtml(links.html) + '">paper.html</a>');
    if (links.pdf)  parts.push('<a href="' + escapeHtml(links.pdf)  + '">pdf</a>');
    if (links.meta) parts.push('<a href="' + escapeHtml(links.meta) + '">metadata</a>');
    parts.push('</div></article>');
    return parts.join('');
  }

  function applyFilters(papers) {
    return papers.filter(function (p) {
      if (STATE.status && p.status !== STATE.status) return false;
      if (STATE.tag) {
        var tags = Array.isArray(p.tags) ? p.tags : [];
        if (tags.indexOf(STATE.tag) === -1) return false;
      }
      if (STATE.q) {
        var hay = ((p.title || '') + ' ' + (p.abstract || '')).toLowerCase();
        if (hay.indexOf(STATE.q) === -1) return false;
      }
      return true;
    });
  }

  function populateSelectors(papers) {
    var statuses = {};
    var tags = {};
    for (var i = 0; i < papers.length; i++) {
      var p = papers[i];
      if (p.status) statuses[p.status] = true;
      if (Array.isArray(p.tags)) {
        for (var j = 0; j < p.tags.length; j++) tags[p.tags[j]] = true;
      }
    }
    var statusOpts = Object.keys(statuses).sort();
    var tagOpts = Object.keys(tags).sort();
    var sSel = document.getElementById('status-filter');
    sSel.innerHTML = '<option value="">all status</option>' + statusOpts.map(function (s) {
      return '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + '</option>';
    }).join('');
    var tSel = document.getElementById('tag-filter');
    tSel.innerHTML = '<option value="">all tags</option>' + tagOpts.map(function (t) {
      return '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
    }).join('');
  }

  function bind() {
    document.getElementById('search').addEventListener('input', function (e) {
      STATE.q = (e.target.value || '').toLowerCase();
      render();
    });
    document.getElementById('status-filter').addEventListener('change', function (e) {
      STATE.status = e.target.value || '';
      render();
    });
    document.getElementById('tag-filter').addEventListener('change', function (e) {
      STATE.tag = e.target.value || '';
      render();
    });
  }

  function render() {
    var main = document.getElementById('papers');
    var filtered = applyFilters(STATE.papers);
    var count = document.getElementById('count');
    count.textContent = filtered.length + ' / ' + STATE.papers.length;
    if (!filtered.length) {
      main.innerHTML = '<p class="empty">'
        + (STATE.papers.length ? 'No papers match the current filters.' : 'No papers yet.')
        + '</p>';
      return;
    }
    main.innerHTML = filtered.map(paperCard).join('');
  }

  function load() {
    fetch('index.json', { cache: 'no-cache' })
      .then(function (res) { return res.ok ? res.json() : []; })
      .catch(function () { return []; })
      .then(function (j) {
        var papers = Array.isArray(j) ? j : (j && Array.isArray(j.papers) ? j.papers : []);
        papers.sort(function (a, b) {
          return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });
        STATE.papers = papers;
        populateSelectors(papers);
        bind();
        render();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
