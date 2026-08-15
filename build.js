const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Custom plugin to add id to headings and record TOC
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractExcerpt(rawContent, userExcerpt) {
  if (userExcerpt && userExcerpt.trim()) return userExcerpt.trim();
  const clean = rawContent
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#+.*$/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= 150) return clean;
  return clean.slice(0, 145).trim() + '...';
}


const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const SITE_DIR = path.join(ROOT, 'site');
const ASSETS_SRC = path.join(ROOT, 'site-assets');
const IMAGES_DIR = path.join(ROOT, 'images');

// ---- site-wide config -----------------------------------------------------
const SITE = {
  title: 'kanishk.dev',
  tagline: 'notes from a Linux box that mostly works',
  author: 'Kanishk',
  repoUrl: 'https://github.com/Kanishkchahar/Blog-site',
  giscus: {
    repo: 'Kanishkchahar/Blog-site',
    repoId: 'REPLACE_ME',
    category: 'Comments',
    categoryId: 'REPLACE_ME',
  },
};

// ---- helpers ---------------------------------------------------------------
// ---- image copy & helper ---------------------------------------------------
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']);

function copyImages() {
  function copyDirRecursive(srcDir, destDir) {
    if (!fs.existsSync(srcDir)) return;
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(srcDir, entry.name);
      const destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        copyDirRecursive(srcPath, destPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IMAGE_EXTS.has(ext)) {
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }
  }

  // 1. Copy images from root images/ directory to site/images and site/
  copyDirRecursive(IMAGES_DIR, path.join(SITE_DIR, 'images'));
  copyDirRecursive(IMAGES_DIR, SITE_DIR);

  // 2. Copy images from content directory as well
  copyDirRecursive(CONTENT_DIR, path.join(SITE_DIR, 'images'));
  copyDirRecursive(CONTENT_DIR, SITE_DIR);
}

function formatTitle(slug) {
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Convert any folder name or filename (including spaces & special chars) to a URL-safe slug
function sanitizeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // spaces and special chars → hyphens
    .replace(/^-+|-+$/g, '');       // strip leading/trailing hyphens
}

function processMarkdown(content) {
  const headings = [];
  let html = md.render(content);

  // 1. Inject IDs into headings
  html = html.replace(/<h([2-4])>(.*?)<\/h\1>/g, (match, level, text) => {
    const cleanText = text.replace(/<[^>]+>/g, '').trim();
    const id = slugify(cleanText);
    headings.push({ level: parseInt(level), text: cleanText, id });
    return `<h${level} id="${id}">${text}</h${level}>`;
  });

  // 2. Parse GitHub-style alerts: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
  html = html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*?)<\/blockquote>/gi,
    (match, type, body) => {
      const alertType = type.toLowerCase();
      let icon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
      if (alertType === 'tip') {
        icon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>';
      } else if (alertType === 'warning' || alertType === 'caution') {
        icon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      } else if (alertType === 'important') {
        icon = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
      }
      return `<div class="callout callout-${alertType}"><div class="callout-title">${icon}<span>${type.toUpperCase()}</span></div><div class="callout-body"><p>${body}</div>`;
    }
  );

  return { html, headings };
}

function readPosts() {
  const posts = [];
  const foldersMap = {};

  function getFolderMeta(folderEntry, folderSlugOverride) {
    // folderEntry = actual filesystem folder name, folderSlug = URL-safe slug
    const folderSlug = folderSlugOverride || sanitizeSlug(folderEntry);
    if (foldersMap[folderSlug]) return foldersMap[folderSlug];

    const folderPath = path.join(CONTENT_DIR, folderEntry);
    let title = folderEntry; // use original name as default title
    let description = `Guides and notes in ${title}.`;

    if (folderSlug !== 'general') {
      const metaPath = path.join(folderPath, 'meta.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          if (meta.title) title = meta.title;
          if (meta.description) description = meta.description;
        } catch (e) {
          console.error(`Error parsing meta.json in content/${folderEntry}:`, e);
        }
      }
    } else {
      title = 'General';
      description = 'General guides, notes, and references.';
    }

    foldersMap[folderSlug] = { slug: folderSlug, title, description, posts: [] };
    return foldersMap[folderSlug];
  }

  if (!fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(CONTENT_DIR);
  for (const entry of entries) {
    const fullPath = path.join(CONTENT_DIR, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'images' || entry.startsWith('.')) continue;

      const files = fs.readdirSync(fullPath).filter((f) => f.endsWith('.md'));
      const folderMeta = getFolderMeta(entry); // entry = raw fs name, slug computed internally

      for (const file of files) {
        const raw = fs.readFileSync(path.join(fullPath, file), 'utf8');
        const { data, content } = matter(raw);
        const slug = sanitizeSlug(file.replace(/\.md$/, '')); // sanitize filename too
        const title = data.title || formatTitle(slug);
        const date = data.date || new Date().toISOString().split('T')[0];
        const excerpt = extractExcerpt(content, data.excerpt);

        // Calculate estimated reading time
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));

        const { html: renderedHtml, headings } = processMarkdown(content);

        const post = {
          slug,
          title,
          date,
          tags: data.tags || [],
          excerpt,
          readingTime,
          html: renderedHtml,
          headings,
          folder: {
            slug: folderMeta.slug,
            title: folderMeta.title,
            description: folderMeta.description,
          },
        };
        posts.push(post);
        folderMeta.posts.push(post);
      }
    } else if (stat.isFile() && entry.endsWith('.md')) {
      const folderMeta = getFolderMeta('general');
      const raw = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(raw);
      const slug = sanitizeSlug(entry.replace(/\.md$/, ''));
      const title = data.title || formatTitle(slug);
      const date = data.date || new Date().toISOString().split('T')[0];
      const excerpt = extractExcerpt(content, data.excerpt);

      const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const { html: renderedHtml, headings } = processMarkdown(content);

      const post = {
        slug,
        title,
        date,
        tags: data.tags || [],
        excerpt,
        readingTime,
        html: renderedHtml,
        headings,
        folder: {
          slug: folderMeta.slug,
          title: folderMeta.title,
          description: folderMeta.description,
        },
      };
      posts.push(post);
      folderMeta.posts.push(post);
    }
  }

  for (const folderSlug in foldersMap) {
    foldersMap[folderSlug].posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  posts.sort((a, b) => new Date(b.date) - new Date(a.date));

  const sortedFolders = Object.values(foldersMap).sort((a, b) => {
    if (a.slug === 'general') return 1;
    if (b.slug === 'general') return -1;
    return a.title.localeCompare(b.title);
  });

  return { posts, folders: sortedFolders };
}

function fmtDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function isoDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

// ---- shared partials --------------------------------------------------------
function head(title, description, relPath = '.', skipId = 'main-content') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="theme-color" content="#0C0D0E">
<link rel="icon" type="image/svg+xml" href="${relPath}/images/favicon.svg?v=1">
<link href="https://fonts.cdnfonts.com/css/geist" rel="stylesheet">
<link href="https://fonts.cdnfonts.com/css/geist-mono" rel="stylesheet">
<link rel="stylesheet" href="${relPath}/assets/style.css">
</head>
<body>
<a href="#${skipId}" class="skip-link">Skip to content</a>
<script src="${relPath}/assets/script.js" defer></script>`;
}

function header(activeTab = '', relPath = '.') {
  return `<header class="shell-bar">
  <div class="shell-bar-inner">
    <div class="shell-left-controls">
      <button class="mobile-sidebar-toggle" id="sidebar-toggle" aria-label="Toggle Sidebar Navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
      <a href="${relPath}/index.html" class="shell-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6-6-6"></path><path d="M12 19h8"></path></svg>
        KANISHK.DEV
      </a>
    </div>
    <nav class="shell-nav">
      <a href="${relPath}/index.html" class="nav-link${activeTab === 'home' ? ' active' : ''}">Home</a>
      <a href="${relPath}/notes.html" class="nav-link${activeTab === 'notes' ? ' active' : ''}">Notes</a>
      <a href="${SITE.repoUrl}" target="_blank" rel="noreferrer" class="nav-link nav-github">GitHub <span aria-hidden="true">↗</span></a>
    </nav>
    <button class="header-search" type="button" aria-label="Search guides">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <span>Search...</span>
      <kbd>Ctrl K</kbd>
    </button>
  </div>
</header>
<div class="reading-progress-container"><div class="reading-progress-bar" id="reading-progress"></div></div>`;
}

function footer(relPath = '.') {
  return `<footer class="shell-footer">
  <span>kanishk.dev &middot; Personal engineering notes &middot; Built with Node.js &amp; Markdown</span>
</footer>

<!-- Interactive Search Modal Overlay -->
<div id="search-modal" class="search-modal-overlay" style="display:none;">
  <div class="search-modal-container">
    <div class="search-modal-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input type="text" id="search-input" placeholder="Search documentation, tags, topics..." autocomplete="off" />
      <span class="search-modal-close">&times;</span>
    </div>
    <div id="search-results" class="search-results-list" data-relpath="${relPath}">
      <div class="search-placeholder">Type to search notes and guides...</div>
    </div>
    <div class="search-modal-footer">
      <span><kbd>&uarr;</kbd> <kbd>&darr;</kbd> Navigate</span>
      <span><kbd>&crarr;</kbd> Open</span>
      <span><kbd>Esc</kbd> Close</span>
    </div>
  </div>
</div>
</body>
</html>`;
}

// ---- page builders -----------------------------------------------------------
function buildIndex(posts, folders) {
  const totalPosts = posts.length;
  const totalFolders = folders.length;
  const recentPosts = posts.slice(0, 6);

  const folderPills = folders
    .map((f) => `<a href="./posts/${f.slug}/index.html" class="hero-category-chip">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      <span>${f.title}</span>
      <span class="chip-count">${f.posts.length}</span>
    </a>`)
    .join('\n');

  const recentPostsCards = recentPosts.length > 0
    ? recentPosts.map((p) => {
        const tags = (p.tags || []).map((t) => `<span class="tag">${t}</span>`).join('');
        return `
        <a href="./posts/${p.folder.slug}/${p.slug}.html" class="recent-post-card">
          <div class="recent-post-badge">
            <span class="folder-title-badge">${p.folder.title}</span>
            <span class="post-link-date">${fmtDate(p.date)}</span>
          </div>
          <h3 class="recent-post-title">${p.title}</h3>
          <p class="recent-post-excerpt">${p.excerpt}</p>
          <div class="card-meta-bottom">
            <div class="tag-row">${tags}</div>
            <span class="card-read-time">${p.readingTime} min read</span>
          </div>
        </a>`;
      }).join('\n')
    : `<p style="color:var(--text-muted)">No posts published yet.</p>`;

  const folderCards = folders.length > 0
    ? folders
        .map((f) => {
          const postLinks = f.posts.length > 0
            ? f.posts
                .slice(0, 4)
                .map((p) => {
                  return `<li>
                    <a href="./posts/${f.slug}/${p.slug}.html" class="folder-post-link">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span class="post-link-title">${p.title}</span>
                      <span class="post-link-date">${fmtDate(p.date)}</span>
                    </a>
                  </li>`;
                })
                .join('\n')
            : `<li class="no-posts">No guides in this category yet</li>`;

          return `
            <div class="folder-card">
              <div class="folder-card-header">
                <div class="folder-title-wrapper">
                  <div class="folder-icon-wrapper">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="folder-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <h3 class="folder-card-title"><a href="./posts/${f.slug}/index.html" class="folder-title-link">${f.title}</a></h3>
                </div>
                <span class="folder-post-count">${f.posts.length} ${f.posts.length === 1 ? 'note' : 'notes'}</span>
              </div>
              <p class="folder-card-excerpt">${f.description}</p>
              <div class="folder-posts-section">
                <div class="section-divider"></div>
                <ul class="folder-posts-list">
                  ${postLinks}
                </ul>
              </div>
              <div class="folder-card-footer">
                <a href="./posts/${f.slug}/index.html" class="view-folder-link">View topic &rarr;</a>
              </div>
            </div>`;
        })
        .join('\n')
    : `<div class="wu-corner-card" style="grid-column: 1 / -1; text-align: center;">
        <div class="post-card-title" style="color: var(--text-muted);">No documentation topics found</div>
        <p class="post-card-excerpt">Add subfolders and <code>.md</code> files into <code>content/</code> and run <code>node build.js</code> to generate your topic boxes.</p>
       </div>`;

  return `${head(SITE.title, SITE.tagline, '.', 'main-content')}
${header('home')}

<div class="hero-wrapper">
  <div class="hero-inner">
    <div class="hero-left">
      <div class="hero-eyebrow">kanishk.dev</div>
      <h1 class="hero-title">Linux notes from my<br>real setups.</h1>
      <p class="hero-desc">Practical notes I keep for myself and share when useful — setup guides, fixes, and commands that actually worked.</p>
      
      <a href="./notes.html" class="hero-cta">Browse notes &rarr;</a>

      <div class="hero-chips-row">
        <span class="hero-chips-label">Topics:</span>
        <div class="hero-chips-list">
          ${folderPills}
        </div>
      </div>
    </div>
  </div>
</div>

<main class="page" id="main-content">
  <div class="section-header">
    <div class="section-header-left">
      <h2>Latest notes</h2>
      <p>Recently added.</p>
    </div>
    <a href="./notes.html" class="section-link">All notes &rarr;</a>
  </div>
  <div class="recent-posts-grid">
    ${recentPostsCards}
  </div>

  <div class="section-header" style="margin-top: 64px;">
    <div class="section-header-left">
      <h2>Topics</h2>
      <p>Notes organized by subject.</p>
    </div>
  </div>
  <div class="post-grid">
    ${folderCards}
</main>
${footer()}`;
}

function renderVaultSidebar({ posts, folders, currentPost = null, currentFolder = null, relPath = '.' }) {
  const fileTreeGroups = folders
    .map((f) => {
      if (f.posts.length === 0) return '';
      const treeFiles = f.posts
        .map((p) => {
          const isActive = currentPost && p.slug === postSlug(p) && f.slug === currentPost.folder.slug;
          return `
          <li class="obs-tree-file">
            <a href="${relPath}/posts/${f.slug}/${p.slug}.html" class="obs-tree-file-link${isActive ? ' active' : ''}" title="${p.title}">
              <span>${p.title}</span>
            </a>
          </li>`;
        })
        .join('');
      return `
        <div class="obs-tree-folder open" data-folder-slug="${f.slug}">
          <div class="obs-tree-folder-header">
            <svg class="obs-tree-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            <span class="obs-tree-folder-title">${f.title}</span>
          </div>
          <ul class="obs-tree-files">${treeFiles}</ul>
        </div>`;
    })
    .join('');

  function postSlug(p) {
    return p.slug;
  }

  const isAllNotesActive = !currentPost && !currentFolder;

  return `
  <aside class="obs-sidebar doc-sidebar-left" id="obs-sidebar">
    <div class="obs-sidebar-resizer" id="obs-sidebar-resizer"></div>
    <div class="obs-sidebar-inner">
      <nav class="obs-file-tree" id="obs-file-tree">
        <div class="obs-tree-root-item">
          <a href="${relPath}/notes.html" class="obs-tree-root-link${isAllNotesActive ? ' active' : ''}">
            <svg class="obs-tree-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform: rotate(90deg);"><polyline points="9 18 15 12 9 6"/></svg>
            <span>Notes</span>
          </a>
        </div>
        <div class="obs-tree-root-group" style="padding-left: 10px; margin-top: 2px;">
          ${fileTreeGroups}
        </div>
      </nav>
    </div>
  </aside>`;
}

function buildPost(post, folders, allPosts) {
  const relPath = '../..';

  // Calculate Next and Previous posts
  const currentIndex = allPosts.findIndex((p) => p.slug === post.slug && p.folder.slug === post.folder.slug);
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

  const prevCard = prevPost
    ? `<a href="${relPath}/posts/${prevPost.folder.slug}/${prevPost.slug}.html" class="pagination-card prev">
        <span class="pagination-label">&larr; Previous Article</span>
        <span class="pagination-title">${prevPost.title}</span>
      </a>`
    : `<div></div>`;

  const nextCard = nextPost
    ? `<a href="${relPath}/posts/${nextPost.folder.slug}/${nextPost.slug}.html" class="pagination-card next">
        <span class="pagination-label">Next Article &rarr;</span>
        <span class="pagination-title">${nextPost.title}</span>
      </a>`
    : `<div></div>`;

  const tocMarkup = post.headings && post.headings.length > 0
    ? post.headings
        .map((h) => `<li style="padding-left: ${(h.level - 2) * 12}px"><a href="#${h.id}">${h.text}</a></li>`)
        .join('\n')
    : `<li><a href="#">Overview</a></li>`;

  return `${head(`${post.title} — ${SITE.title}`, post.excerpt, relPath, 'article-content')}
${header('notes', relPath)}

<div class="doc-layout">
  <!-- Left Navigation Sidebar -->
  ${renderVaultSidebar({ posts: allPosts, folders, currentPost: post, relPath })}

  <!-- Central Documentation Content -->
  <main class="doc-content" id="article-content">
    <div class="breadcrumb"><a href="${relPath}/index.html">Home</a> / <a href="${relPath}/notes.html">Notes</a> / <a href="${relPath}/posts/${post.folder.slug}/index.html">${post.folder.title}</a></div>
    <h1 class="post-page-title">${post.title}</h1>
    
    <div class="post-meta-header">
      <div class="meta-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> ${fmtDate(post.date)}</div>
      <span aria-hidden="true">&middot;</span>
      <div class="meta-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${post.readingTime} min read</div>
      <span aria-hidden="true">&middot;</span>
      <div class="meta-pill"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> ${post.folder.title}</div>
    </div>

    <article class="post-body">
      ${post.html.replace(/src="\/images\//g, `src="${relPath}/images/`).replace(/src="\.\/images\//g, `src="${relPath}/images/`)}
    </article>

    <div class="article-end-row">
      <a href="${relPath}/notes.html">&larr; Back to notes</a>
      <a href="${relPath}/posts/${post.folder.slug}/index.html">&larr; ${post.folder.title}</a>
      <a href="${SITE.repoUrl}/issues" target="_blank" rel="noreferrer">Report an issue</a>
      <button class="btn-share-link" id="share-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
        Copy link
      </button>
    </div>

    <div class="post-pagination-nav">
      ${prevCard}
      ${nextCard}
    </div>
  </main>

  <!-- Right TOC Sidebar -->
  <aside class="doc-sidebar-right">
    <div class="toc-title">On this page</div>
    <ul class="toc-links">
      ${tocMarkup}
    </ul>
  </aside>
</div>

<div class="toast-notification" id="toast">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
  <span>Article link copied to clipboard!</span>
</div>
${footer(relPath)}`;
}

function buildNotes(posts, folders) {
  const obsFileRows = folders.length > 0
    ? folders.map((f) => {
        if (f.posts.length === 0) return '';
        const rows = f.posts.map((p) => {
          const tags = (p.tags || []).map(t => `<span class="obs-tag">${t}</span>`).join('');
          return `
          <a href="./posts/${f.slug}/${p.slug}.html" class="obs-note-row" data-tags="${(p.tags || []).join(',')}">
            <div class="obs-note-card-top">
              <span class="obs-folder-badge">${f.title}</span>
              <div class="obs-note-meta-right">
                <span class="obs-note-row-date">${fmtDate(p.date)}</span>
                <span class="obs-note-row-time">${p.readingTime} min read</span>
              </div>
            </div>
            <h3 class="obs-note-row-title">${p.title}</h3>
            <p class="obs-note-row-excerpt">${p.excerpt}</p>
            ${tags ? `<div class="obs-tags-inline">${tags}</div>` : ''}
          </a>`;
        }).join('');
        return `
        <div class="obs-folder-section" data-folder="${f.slug}">
          <div class="obs-folder-section-header">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span class="obs-folder-section-name">${f.title}</span>
            <span class="obs-folder-section-count">${f.posts.length} ${f.posts.length === 1 ? 'note' : 'notes'}</span>
          </div>
          <div class="obs-notes-list">${rows}</div>
        </div>`;
      }).join('')
    : `<div class="obs-empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <p>No notes yet. Add <code>.md</code> files in subdirectories under <code>content/</code> and run <code>node build.js</code>.</p>
      </div>`;

  return `${head(`Notes — ${SITE.title}`, 'All notes and guides', '.', 'main-notes')}
${header('notes')}

<div class="obs-layout">

  <!-- Left Sidebar -->
  ${renderVaultSidebar({ posts, folders, relPath: '.' })}

  <!-- Main content area -->
  <main class="obs-main" id="main-notes">

    <!-- Clean Header Banner -->
    <div class="obs-vault-header">
      <div class="obs-vault-header-inner">
        <div class="obs-vault-title-row">
          <h1 class="obs-vault-title">Notes</h1>
          <span class="obs-vault-badge">${posts.length} ${posts.length === 1 ? 'note' : 'notes'}</span>
        </div>
        <p class="obs-vault-desc">Filter by title, tag, or topic to find what you need.</p>
      </div>
    </div>

    <!-- Clean Controls Bar -->
    <div class="obs-controls-bar">
      <div class="obs-controls-inner">
        <div class="obs-inline-search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" id="obs-quick-search" placeholder="Filter this list by title, tag, or content..." autocomplete="off" />
          <button id="obs-search-clear" class="obs-search-clear-btn" aria-label="Clear search" style="display:none;">&times;</button>
        </div>
      </div>
    </div>

    <!-- Centered Content Area -->
    <div class="obs-content-area">
      <div class="obs-content-inner" id="obs-notes-container">
        ${obsFileRows}
        <div id="obs-no-results" class="obs-empty-search" style="display: none;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <p>No notes matched your search or filter.</p>
          <button class="clear-filter-btn" onclick="document.getElementById('obs-quick-search').value=''; document.getElementById('obs-quick-search').dispatchEvent(new Event('input'));">Clear filter</button>
        </div>
      </div>
    </div>

  </main>
</div>
${footer()}`;
}

function buildCategory(folder, folders, allPosts) {
  const relPath = '../..';

  const postCards = folder.posts.length > 0
    ? folder.posts.map((p) => {
        const tags = p.tags.map((t) => `<span class="tag">${t}</span>`).join('');
        return `<a href="${relPath}/posts/${folder.slug}/${p.slug}.html" class="note-row">
          <div class="note-row-title">${p.title}</div>
          <div class="note-row-meta">
            <span class="note-row-date">${fmtDate(p.date)}</span>
            <div class="tag-row">${tags}</div>
          </div>
          <p class="note-row-excerpt">${p.excerpt}</p>
        </a>`;
      }).join('\n')
    : `<p style="color:var(--text-muted)">No posts in this category yet.</p>`;

  const tocLinks = folder.posts
    .map((p) => `<li><a href="${relPath}/posts/${folder.slug}/${p.slug}.html">${p.title}</a></li>`)
    .join('\n');

  return `${head(`${folder.title} — ${SITE.title}`, folder.description, relPath, 'category-content')}
${header('notes', relPath)}
<div class="doc-layout">
  <!-- Left Navigation Sidebar -->
  ${renderVaultSidebar({ posts: allPosts, folders, currentFolder: folder, relPath })}

  <main class="doc-content" id="category-content">
    <div class="breadcrumb"><a href="${relPath}/index.html">Home</a> / <a href="${relPath}/notes.html">Notes</a> / ${folder.title}</div>
    <h1>${folder.title}</h1>
    <p style="color:var(--text-muted);margin-bottom:36px">${folder.description}</p>
    <div style="display:flex;flex-direction:column;gap:16px;">
      ${postCards}
    </div>
  </main>

  <aside class="doc-sidebar-right">
    <div class="toc-title">In this category</div>
    <ul class="toc-links">
      ${tocLinks}
    </ul>
  </aside>
</div>
${footer(relPath)}`;
}

// ---- run ---------------------------------------------------------------------
function build() {
  fs.rmSync(SITE_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(SITE_DIR, 'posts'), { recursive: true });
  fs.mkdirSync(path.join(SITE_DIR, 'assets'), { recursive: true });

  for (const file of fs.readdirSync(ASSETS_SRC)) {
    fs.copyFileSync(path.join(ASSETS_SRC, file), path.join(SITE_DIR, 'assets', file));
  }

  copyImages();

  const { posts, folders } = readPosts();

  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), buildIndex(posts, folders));
  fs.writeFileSync(path.join(SITE_DIR, 'notes.html'), buildNotes(posts, folders));

  for (const folder of folders) {
    fs.mkdirSync(path.join(SITE_DIR, 'posts', folder.slug), { recursive: true });
    // Generate category index page
    fs.writeFileSync(
      path.join(SITE_DIR, 'posts', folder.slug, 'index.html'),
      buildCategory(folder, folders, posts)
    );
    // Generate individual post pages
    for (const post of folder.posts) {
      fs.writeFileSync(
        path.join(SITE_DIR, 'posts', folder.slug, `${post.slug}.html`),
        buildPost(post, folders, posts)
      );
    }
  }

  // Generate search index JSON for fast client-side searching
  const searchIndex = posts.map((p) => ({
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    folder: p.folder,
    url: `./posts/${p.folder.slug}/${p.slug}.html`,
    date: isoDate(p.date),
    tags: p.tags
  }));
  fs.writeFileSync(path.join(SITE_DIR, 'assets', 'search-index.json'), JSON.stringify(searchIndex));

  console.log(`Built ${posts.length} post(s) into ${SITE_DIR}`);
}

build();
