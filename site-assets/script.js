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

  // 2. Code block copy buttons & language badges
  var codeBlocks = document.querySelectorAll('pre code');
  codeBlocks.forEach(function (code) {
    var pre = code.parentNode;
    if (!pre || pre.tagName !== 'PRE') return;
    if (pre.parentNode && pre.parentNode.classList.contains('code-block-wrapper')) return;

    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // Detect language badge class from markdown-it e.g. class="language-bash"
    var langClass = Array.from(code.classList).find(function (c) { return c.startsWith('language-'); });
    if (langClass) {
      var langName = langClass.replace('language-', '');
      var langBadge = document.createElement('span');
      langBadge.className = 'code-header-badge';
      langBadge.textContent = langName;
      wrapper.appendChild(langBadge);
    }

    var copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.type = 'button';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    copyBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>';
    
    wrapper.appendChild(copyBtn);

    copyBtn.addEventListener('click', function () {
      var text = code.innerText;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
          markCopied(copyBtn);
        }).catch(function () {
          fallbackCopy(text, copyBtn);
        });
      } else {
        fallbackCopy(text, copyBtn);
      }
    });
  });

  function markCopied(btn) {
    btn.classList.add('copied');
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>Copied!</span>';
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> <span>Copy</span>';
    }, 2000);
  }

  function fallbackCopy(text, btn) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      markCopied(btn);
    } catch (err) {}
    document.body.removeChild(textarea);
  }

  // 3. Reading Progress Bar & TOC Highlight on Scroll
  var progressBar = document.getElementById('reading-progress');
  var article = document.querySelector('.post-body');
  var headings = article ? article.querySelectorAll('h2[id], h3[id]') : [];
  var tocLinks = document.querySelectorAll('.toc-links a');

  window.addEventListener('scroll', function () {
    // Progress bar update
    if (progressBar && article) {
      var articleTop = article.offsetTop;
      var articleHeight = article.offsetHeight;
      var scrollTop = window.scrollY;
      var windowHeight = window.innerHeight;
      
      if (scrollTop >= articleTop - 100) {
        var percentage = Math.min(100, Math.max(0, ((scrollTop - articleTop + 100) / (articleHeight - windowHeight + 200)) * 100));
        progressBar.style.width = percentage + '%';
      } else {
        progressBar.style.width = '0%';
      }
    }

    // Active TOC link highlighting
    if (headings.length > 0 && tocLinks.length > 0) {
      var currentId = '';
      headings.forEach(function (h) {
        var rect = h.getBoundingClientRect();
        if (rect.top <= 140) {
          currentId = h.id;
        }
      });

      tocLinks.forEach(function (link) {
        var href = link.getAttribute('href');
        if (href === '#' + currentId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  });

  // 4. Mobile Navigation Drawer Toggle
  var sidebarToggle = document.getElementById('sidebar-toggle');
  var leftSidebar = document.querySelector('.doc-sidebar-left') || document.querySelector('.obs-sidebar');
  if (sidebarToggle && leftSidebar) {
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function toggleMobileSidebar() {
      leftSidebar.classList.toggle('open');
      leftSidebar.style.display = leftSidebar.classList.contains('open') ? 'flex' : '';
      overlay.classList.toggle('active');
    }

    sidebarToggle.addEventListener('click', toggleMobileSidebar);
    overlay.addEventListener('click', toggleMobileSidebar);
  }

  // 4b. Obsidian Sidebar Resizer (Drag to make wider/narrower)
  var resizer = document.getElementById('obs-sidebar-resizer');
  var obsSidebar = document.getElementById('obs-sidebar');
  if (resizer && obsSidebar) {
    var savedWidth = localStorage.getItem('obs-sidebar-width');
    if (savedWidth) {
      document.documentElement.style.setProperty('--sidebar-width', savedWidth + 'px');
    }

    var isResizing = false;
    var startX = 0;
    var startWidth = 0;

    resizer.addEventListener('mousedown', function (e) {
      isResizing = true;
      startX = e.clientX;
      startWidth = obsSidebar.getBoundingClientRect().width;
      resizer.classList.add('resapsing');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function (e) {
      if (!isResizing) return;
      var newWidth = startWidth + (e.clientX - startX);
      if (newWidth >= 180 && newWidth <= 550) {
        document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
        localStorage.setItem('obs-sidebar-width', newWidth);
      }
    });

    document.addEventListener('mouseup', function () {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('resapsing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  // 4c. Folder Collapse & State Persistence (Obsidian File Tree)
  var treeFolders = document.querySelectorAll('.obs-tree-folder[data-folder-slug]');
  if (treeFolders.length > 0) {
    var storedState = {};
    try {
      storedState = JSON.parse(localStorage.getItem('obs-folder-states') || '{}');
    } catch (e) {
      storedState = {};
    }

    treeFolders.forEach(function (folder) {
      var slug = folder.getAttribute('data-folder-slug');
      if (slug && storedState.hasOwnProperty(slug)) {
        if (storedState[slug] === false) {
          folder.classList.remove('open');
        } else {
          folder.classList.add('open');
        }
      }

      var header = folder.querySelector('.obs-tree-folder-header');
      if (header) {
        header.addEventListener('click', function (e) {
          e.stopPropagation();
          var isOpen = folder.classList.toggle('open');
          storedState[slug] = isOpen;
          try {
            localStorage.setItem('obs-folder-states', JSON.stringify(storedState));
          } catch (err) {}
        });
      }
    });
  }

  // 5. Search Modal Functionality with Keyboard Selection & Highlighting
  var searchModal = document.getElementById('search-modal');
  var searchInput = document.getElementById('search-input');
  var searchResults = document.getElementById('search-results');
  var searchBtns = document.querySelectorAll('.header-search');
  var searchClose = document.querySelector('.search-modal-close');
  var searchData = [];
  var isSearchLoaded = false;
  var selectedResultIndex = -1;

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
    selectedResultIndex = -1;
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

  // Highlight matching query text
  function highlightText(text, query) {
    if (!query) return text;
    var regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function updateSelectedResult() {
    var items = searchResults.querySelectorAll('.search-result-item');
    items.forEach(function (item, index) {
      if (index === selectedResultIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Keyboard shortcut Ctrl+K / Navigation
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchModal && searchModal.style.display === 'flex') {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (searchModal && searchModal.style.display === 'flex') {
      var items = searchResults.querySelectorAll('.search-result-item');
      if (e.key === 'Escape') {
        closeSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          selectedResultIndex = (selectedResultIndex + 1) % items.length;
          updateSelectedResult();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          selectedResultIndex = (selectedResultIndex - 1 + items.length) % items.length;
          updateSelectedResult();
        }
      } else if (e.key === 'Enter' && selectedResultIndex >= 0 && items[selectedResultIndex]) {
        e.preventDefault();
        items[selectedResultIndex].click();
      }
    }
  });

  function renderSearchResults(query) {
    if (!searchResults) return;
    var relPath = searchResults.getAttribute('data-relpath') || '.';
    var q = query.trim().toLowerCase();
    selectedResultIndex = -1;

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
      var highlightedTitle = highlightText(item.title, q);
      var highlightedExcerpt = highlightText(item.excerpt, q);
      var tags = (item.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
      return (
        '<a href="' + url + '" class="search-result-item">' +
          '<div class="search-result-title">' + highlightedTitle + '</div>' +
          '<div class="search-result-meta">' + item.folder.title + ' &middot; ' + item.date + '</div>' +
          '<div class="search-result-excerpt">' + highlightedExcerpt + '</div>' +
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

  // 6. Share Article Link Button & Toast Notification
  var shareBtn = document.getElementById('share-btn');
  var toast = document.getElementById('toast');
  if (shareBtn && toast) {
    shareBtn.addEventListener('click', function () {
      var url = window.location.href;
      navigator.clipboard.writeText(url).then(function () {
        toast.classList.add('show');
        setTimeout(function () {
          toast.classList.remove('show');
        }, 2500);
      });
    });
  }

  // 7. Client-side Tag Filtering on Notes Page
  var filterPills = document.querySelectorAll('.filter-pill');
  var fileRows = document.querySelectorAll('.md-file-row');
  var folderCards = document.querySelectorAll('.folder-container-card');

  if (filterPills.length > 0 && fileRows.length > 0) {
    filterPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var tag = pill.getAttribute('data-tag');
        
        filterPills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');

        folderCards.forEach(function (card) {
          var cardsRows = card.querySelectorAll('.md-file-row');
          var visibleCount = 0;

          cardsRows.forEach(function (row) {
            var rowTags = (row.getAttribute('data-tags') || '').split(',');
            if (tag === 'all' || rowTags.includes(tag)) {
              row.style.display = 'block';
              visibleCount++;
            } else {
              row.style.display = 'none';
            }
          });

          if (visibleCount === 0 && tag !== 'all') {
            card.style.display = 'none';
          } else {
            card.style.display = 'block';
          }
        });
      });
    });
  }

  // 8. Obsidian Vault Viewer — File Tree Toggle
  document.querySelectorAll('.obs-tree-folder-header').forEach(function (header) {
    var folder = header.closest('.obs-tree-folder');
    if (!folder) return;
    folder.classList.add('open');
    header.addEventListener('click', function () { folder.classList.toggle('open'); });
  });

  // 9. Interactive Search & Tag Filtering for Notes Page
  var obsPills = document.querySelectorAll('.obs-filter-pill');
  var obsNoteRows = document.querySelectorAll('.obs-note-row');
  var obsFolderSections = document.querySelectorAll('.obs-folder-section');
  var obsQuickSearch = document.getElementById('obs-quick-search');
  var obsSearchClear = document.getElementById('obs-search-clear');
  var obsNoResults = document.getElementById('obs-no-results');

  var currentActiveTag = 'all';
  var currentSearchQuery = '';

  function applyNotesFilters() {
    var totalVisible = 0;

    obsFolderSections.forEach(function (section) {
      var rows = section.querySelectorAll('.obs-note-row');
      var sectionVisibleCount = 0;

      rows.forEach(function (row) {
        var rowTags = (row.getAttribute('data-tags') || '').split(',').map(function (t) { return t.trim().toLowerCase(); });
        var title = (row.querySelector('.obs-note-row-title') || {}).textContent || '';
        var fname = (row.querySelector('.obs-note-row-fname') || {}).textContent || '';
        var excerpt = (row.querySelector('.obs-note-row-excerpt') || {}).textContent || '';
        var fullText = (title + ' ' + fname + ' ' + excerpt).toLowerCase();

        var matchesTag = currentActiveTag === 'all' || rowTags.includes(currentActiveTag.toLowerCase());
        var matchesSearch = !currentSearchQuery || fullText.includes(currentSearchQuery.toLowerCase());

        var show = matchesTag && matchesSearch;
        row.style.display = show ? '' : 'none';
        if (show) {
          sectionVisibleCount++;
          totalVisible++;
        }
      });

      section.style.display = sectionVisibleCount === 0 ? 'none' : '';
    });

    if (obsNoResults) {
      obsNoResults.style.display = totalVisible === 0 ? 'flex' : 'none';
    }
  }

  if (obsPills.length > 0) {
    obsPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var tag = pill.getAttribute('data-tag') || 'all';
        currentActiveTag = tag;
        obsPills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
        applyNotesFilters();
      });
    });
  }

  if (obsQuickSearch) {
    obsQuickSearch.addEventListener('input', function (e) {
      currentSearchQuery = e.target.value.trim();
      if (obsSearchClear) {
        obsSearchClear.style.display = currentSearchQuery ? 'block' : 'none';
      }
      applyNotesFilters();
    });
  }

  if (obsSearchClear && obsQuickSearch) {
    obsSearchClear.addEventListener('click', function () {
      obsQuickSearch.value = '';
      currentSearchQuery = '';
      obsSearchClear.style.display = 'none';
      obsQuickSearch.focus();
      applyNotesFilters();
    });
  }

  // 10. Obsidian Vault — Sort buttons
  var obsSortBtns = document.querySelectorAll('.obs-sort-btn');
  var obsContainer = document.getElementById('obs-notes-container');
  if (obsSortBtns.length > 0 && obsContainer) {
    obsSortBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        obsSortBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var sortBy = btn.getAttribute('data-sort');
        obsContainer.querySelectorAll('.obs-folder-section').forEach(function (section) {
          var list = section.querySelector('.obs-notes-list');
          if (!list) return;
          var rows = Array.from(list.querySelectorAll('.obs-note-row'));
          rows.sort(function (a, b) {
            if (sortBy === 'title') {
              var ta = (a.querySelector('.obs-note-row-title')||{}).textContent||'';
              var tb = (b.querySelector('.obs-note-row-title')||{}).textContent||'';
              return ta.localeCompare(tb);
            }
            var da = (a.querySelector('.obs-note-row-date')||{}).textContent||'';
            var db = (b.querySelector('.obs-note-row-date')||{}).textContent||'';
            return db.localeCompare(da);
          });
          rows.forEach(function (r) { list.appendChild(r); });
        });
      });
    });
  }

  // 11. Obsidian sidebar search → global search modal
  var obsSidebarSearch = document.querySelector('.obs-sidebar-search');
  if (obsSidebarSearch) {
    obsSidebarSearch.addEventListener('click', function () {
      var searchBtn = document.querySelector('.header-search');
      if (searchBtn) searchBtn.click();
    });
  }
});

