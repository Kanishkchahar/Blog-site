// Minimal typing effect for the homepage terminal hero.
// No-ops entirely if the element isn't present or the user prefers reduced motion.
(function () {
  var el = document.querySelector('[data-typewriter]');
  if (!el) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var full = el.getAttribute('data-typewriter');

  if (prefersReducedMotion) {
    el.textContent = full;
    return;
  }

  el.textContent = '';
  var i = 0;
  function tick() {
    if (i <= full.length) {
      el.textContent = full.slice(0, i);
      i++;
      setTimeout(tick, 28);
    }
  }
  tick();
})();

// Interactive features: Typewriter, Search Modal, Code Copy Buttons, TOC Highlight
document.addEventListener('DOMContentLoaded', function () {
  // 1. Collapsible sidebar groups handler
  document.addEventListener('click', function (e) {
    var title = e.target.closest('.sidebar-title');
    if (title) {
      var group = title.closest('.sidebar-group');
      if (group) {
        group.classList.toggle('collapsed');
      }
    }
  });

  // 2. Code block copy buttons
  var codeBlocks = document.querySelectorAll('pre code');
  codeBlocks.forEach(function (code) {
    var pre = code.parentNode;
    if (!pre || pre.tagName !== 'PRE') return;

    var copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>';
    
    pre.style.position = 'relative';
    pre.appendChild(copyBtn);

    copyBtn.addEventListener('click', function () {
      var text = code.innerText;
      navigator.clipboard.writeText(text).then(function () {
        copyBtn.classList.add('copied');
        copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(function () {
          copyBtn.classList.remove('copied');
          copyBtn.querySelector('span').textContent = 'Copy';
        }, 2000);
      });
    });
  });

  // 3. Search Modal Functionality
  var searchModal = document.getElementById('search-modal');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var searchBtns = document.querySelectorAll('.header-search');
  var searchClose = document.querySelector('.search-modal-close');
  var searchData = [];
  var isSearchLoaded = false;

  function loadSearchIndex() {
    if (isSearchLoaded) return;
    var relPath = searchResults ? (searchResults.getAttribute('data-relpath') || '.') : '.';
    fetch(relPath + '/assets/search-index.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        searchData = data;
        isSearchLoaded = true;
      })
      .catch(function (err) {
        console.error('Could not load search index', err);
      });
  }

  function openSearch() {
    if (!searchModal) return;
    searchModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    loadSearchIndex();
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
    }
    renderSearchResults('');
  }

  function closeSearch() {
    if (!searchModal) return;
    searchModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  searchBtns.forEach(function (btn) {
    btn.addEventListener('click', openSearch);
  });

  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }

  if (searchModal) {
    searchModal.addEventListener('click', function (e) {
      if (e.target === searchModal) closeSearch();
    });
  }

  // Keyboard shortcut Ctrl+K or Cmd+K
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchModal && searchModal.style.display === 'flex') {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (e.key === 'Escape' && searchModal && searchModal.style.display === 'flex') {
      closeSearch();
    }
  });

  function renderSearchResults(query) {
    if (!searchResults) return;
    var relPath = searchResults.getAttribute('data-relpath') || '.';
    var q = query.trim().toLowerCase();

    if (!q) {
      searchResults.innerHTML = '<div class="search-placeholder">Type to search notes and guides...</div>';
      return;
    }

    var matches = searchData.filter(function (item) {
      return (
        item.title.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q) ||
        (item.tags && item.tags.some(function (t) { return t.toLowerCase().includes(q); })) ||
        item.folder.title.toLowerCase().includes(q)
      );
    });

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-placeholder">No matching notes found for "' + q + '"</div>';
      return;
    }

    var html = matches.map(function (item) {
      var url = relPath + item.url.replace(/^\./, '');
      var tags = (item.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
      return (
        '<a href="' + url + '" class="search-result-item">' +
          '<div class="search-result-title">' + item.title + '</div>' +
          '<div class="search-result-meta">' + item.folder.title + ' &middot; ' + item.date + '</div>' +
          '<div class="search-result-excerpt">' + item.excerpt + '</div>' +
          '<div class="tag-row" style="margin-top:6px">' + tags + '</div>' +
        '</a>'
      );
    }).join('');

    searchResults.innerHTML = html;
  }

  if (searchInput) {
    searchInput.addEventListener('input', function (e) {
      renderSearchResults(e.target.value);
    });
  }
});

