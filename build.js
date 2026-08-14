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

function readPosts() {
  const posts = [];
  const foldersMap = {};

  function getFolderMeta(folderSlug) {
    if (foldersMap[folderSlug]) return foldersMap[folderSlug];

    const folderPath = path.join(CONTENT_DIR, folderSlug);
    let title = formatTitle(folderSlug);
    let description = `Guides and notes in ${title}.`;

    if (folderSlug !== 'general') {
      const metaPath = path.join(folderPath, 'meta.json');
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          if (meta.title) title = meta.title;
          if (meta.description) description = meta.description;
        } catch (e) {
          console.error(`Error parsing meta.json in content/${folderSlug}:`, e);
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
      const folderMeta = getFolderMeta(entry);

      for (const file of files) {
        const raw = fs.readFileSync(path.join(fullPath, file), 'utf8');
        const { data, content } = matter(raw);
        const slug = file.replace(/\.md$/, '');
        const title = data.title || formatTitle(slug);
        const date = data.date || new Date().toISOString().split('T')[0];
        const excerpt = data.excerpt || (content.trim().replace(/^#+.*$/gm, '').slice(0, 140).trim() + '...');

        // Extract headings for Table of Contents and inject IDs into headings
        const headings = [];
        const renderedHtml = md.render(content).replace(/<h([2-3])>(.*?)<\/h\1>/g, (match, level, text) => {
          const cleanText = text.replace(/<[^>]+>/g, '').trim();
          const id = slugify(cleanText);
          headings.push({ level: parseInt(level), text: cleanText, id });
          return `<h${level} id="${id}">${text}</h${level}>`;
        });

        const post = {
          slug,
          title,
          date,
          tags: data.tags || [],
          excerpt,
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
      const slug = entry.replace(/\.md$/, '');
      const title = data.title || formatTitle(slug);
      const date = data.date || new Date().toISOString().split('T')[0];
      const excerpt = data.excerpt || (content.trim().replace(/^#+.*$/gm, '').slice(0, 140).trim() + '...');

      const headings = [];
      const renderedHtml = md.render(content).replace(/<h([2-3])>(.*?)<\/h\1>/g, (match, level, text) => {
        const cleanText = text.replace(/<[^>]+>/g, '').trim();
        const id = slugify(cleanText);
        headings.push({ level: parseInt(level), text: cleanText, id });
        return `<h${level} id="${id}">${text}</h${level}>`;
      });

      const post = {
        slug,
        title,
        date,
        tags: data.tags || [],
        excerpt,
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
function head(title, description, relPath = '.') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${relPath}/assets/style.css">
</head>
<body>
<script src="${relPath}/assets/script.js" defer><\/script>`;
}

function header(active, relPath = '.') {
  const nav = (href, label, key) =>
    `<a href="${href}" class="nav-link${active === key ? ' active' : ''}">${label}</a>`;
  return `<header class="shell-bar">
  <div class="shell-bar-inner">
    <a href="${relPath}/index.html" class="shell-brand">
      KANISHK.DEV
    </a>
    <nav class="shell-nav">
      ${nav(`${relPath}/index.html`, 'Home', 'home')}
      ${nav(`${relPath}/notes.html`, 'Notes', 'notes')}
    </nav>
    <div class="header-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <span>Search</span>
      <kbd>Ctrl K</kbd>
    </div>
  </div>
</header>`;
}

function footer(relPath = '.') {
  return `<footer class="shell-footer">
  <span>nullptr.log &middot; Open source Linux Documentation &middot; Powered by Node.js & Markdown</span>
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
  </div>
</div>
</body>
</html>`;
}

// ---- page builders -----------------------------------------------------------
function buildIndex(posts, folders) {
  const totalPosts = posts.length;
  const totalFolders = folders.length;
  const recentPosts = posts.slice(0, 4);

  const recentPostsCards = recentPosts.length > 0
    ? recentPosts.map((p) => {
        const tags = (p.tags || []).map((t) => `<span class="tag">${t}</span>`).join('');
        return `
        <a href="./posts/${p.folder.slug}/${p.slug}.html" class="recent-post-card">
          <div class="recent-post-badge">
            <span class="folder-title-badge">${p.folder.title}</span>
            <span class="post-link-date">${isoDate(p.date)}</span>
          </div>
          <h3 class="recent-post-title">${p.title}</h3>
          <p class="recent-post-excerpt">${p.excerpt}</p>
          <div class="tag-row">${tags}</div>
        </a>`;
      }).join('\n')
    : `<p style="color:var(--text-muted)">No posts published yet.</p>`;

  const folderCards = folders.length > 0
    ? folders
        .map((f) => {
          const postLinks = f.posts.length > 0
            ? f.posts
                .slice(0, 3)
                .map((p) => {
                  return `<li>
                    <a href="./posts/${f.slug}/${p.slug}.html" class="folder-post-link">
                      <span class="post-link-bullet">&bull;</span>
                      <span class="post-link-title">${p.title}</span>
                      <span class="post-link-date">${isoDate(p.date)}</span>
                    </a>
                  </li>`;
                })
                .join('\n')
            : `<li class="no-posts">No guides in this category yet</li>`;

          return `<li>
            <div class="wu-corner-card folder-card" onclick="if(!event.target.closest('a')){window.location.href='./posts/${f.slug}/index.html'}">
              <div class="wu-corner-marks">
                <span class="mark top-left"></span>
                <span class="mark top-right"></span>
                <span class="mark bottom-left"></span>
                <span class="mark bottom-right"></span>
              </div>
              <div class="folder-card-header">
                <div class="folder-title-wrapper">
                  <div class="folder-icon-wrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="folder-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <h3 class="folder-card-title">${f.title}</h3>
                </div>
                <span class="folder-post-count">${f.posts.length} ${f.posts.length === 1 ? 'post' : 'posts'}</span>
              </div>
              <p class="folder-card-excerpt">${f.description}</p>
              <div class="folder-posts-section">
                <div class="section-divider"></div>
                <ul class="folder-posts-list">
                  ${postLinks}
                </ul>
              </div>
            </div>
          </li>`;
        })
        .join('\n')
    : `<div class="wu-corner-card" style="grid-column: 1 / -1; text-align: center;">
        <div class="post-card-title" style="color: var(--text-muted);">No documentation categories found</div>
        <p class="post-card-excerpt">Add subfolders and <code>.md</code> files into <code>content/</code> and run <code>node build.js</code> to generate your category boxes.</p>
       </div>`;

  return `${head(SITE.title, SITE.tagline)}
${header('home')}

<div class="hero-wrapper">
  <div class="hero-content">
    <div>
      <div class="hero-subtitle">
        <span class="live-dot"></span> Digital Garden &amp; Engineering Journal
      </div>
      <h1 class="hero-title">Linux, Code &amp; System Architecture</h1>
      <p class="hero-desc">Real-world walkthroughs, driver configuration, terminal setups, and software engineering notes — organized cleanly in Markdown.</p>

      <div class="hero-stats-bar">
        <div class="stat-pill">
          <span class="stat-num">${totalPosts}</span>
          <span class="stat-label">Notes Published</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">${totalFolders}</span>
          <span class="stat-label">Folders</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">100%</span>
          <span class="stat-label">Static &amp; Fast</span>
        </div>
      </div>
      
      <div class="hero-actions">
        <a href="./notes.html" class="btn-primary">Browse All Notes &rarr;</a>
        <a href="${SITE.repoUrl}" target="_blank" class="btn-secondary">GitHub Repository &nearr;</a>
      </div>
    </div>

    <div class="terminal-window">
      <div class="window-titlebar">
        <span>fedora-workstation ~ bash</span>
        <div class="window-controls">
          <span class="window-dot"></span>
          <span class="window-dot"></span>
          <span class="window-dot"></span>
        </div>
      </div>
      <div class="window-body">
        <div><span class="terminal-prompt">[kanishk@fedora ~]$</span> <span class="terminal-cmd">cat /etc/fedora-release</span></div>
        <div class="terminal-output">Fedora release 40 (Workstation Edition)</div>
        <br>
        <div><span class="terminal-prompt">[kanishk@fedora ~]$</span> <span class="terminal-cmd">git status</span></div>
        <div class="terminal-output">On branch main</div>
        <div class="terminal-output">Your branch is up to date with 'origin/main'.</div>
        <br>
        <div><span class="terminal-prompt">[kanishk@fedora ~]$</span> <span class="terminal-cmd">node build.js</span></div>
        <div class="terminal-output">&#10004; Parsed Markdown files &amp; folder structure</div>
        <div class="terminal-output">&#10004; Built static site &amp; search index</div>
      </div>
    </div>
  </div>
</div>

<main class="page" id="guides">
  <div class="section-header">
    <h2>Recent Notes &amp; Guides</h2>
    <p>Latest articles and documentation updates.</p>
  </div>
  <div class="recent-posts-grid">
    ${recentPostsCards}
  </div>

  <div class="section-header" style="margin-top: 60px;">
    <h2>Content Folders</h2>
    <p>Browse guides grouped by topic directory.</p>
  </div>
  <ul class="post-grid">
    ${folderCards}
  </ul>
</main>
${footer()}`;
}

function buildPost(post, folders) {
  const relPath = '../..';

  const sidebarLinks = folders
    .map((f) => {
      if (f.posts.length === 0) return '';
      const isCurrentFolder = f.slug === post.folder.slug;
      const links = f.posts
        .map((p) => {
          const href = `${relPath}/posts/${f.slug}/${p.slug}.html`;
          const isActive = p.slug === post.slug && isCurrentFolder;
          return `<li><a href="${href}"${isActive ? ' class="active"' : ''}>${p.title}</a></li>`;
        })
        .join('\n');
      return `<div class="sidebar-group${isCurrentFolder ? '' : ' collapsed'}">
        <div class="sidebar-title">
          <span>${f.title}</span>
          <span class="sidebar-arrow">&#9662;</span>
        </div>
        <ul class="sidebar-links">
          ${links}
        </ul>
      </div>`;
    })
    .join('\n');

  const tocMarkup = post.headings && post.headings.length > 0
    ? post.headings
        .map((h) => `<li style="padding-left: ${(h.level - 2) * 12}px"><a href="#${h.id}">${h.text}</a></li>`)
        .join('\n')
    : `<li><a href="#">Overview</a></li>`;

  return `${head(`${post.title} — ${SITE.title}`, post.excerpt, relPath)}
${header('', relPath)}

<div class="doc-layout">
  <!-- Left Navigation Sidebar -->
  <aside class="doc-sidebar-left">
    ${sidebarLinks}
  </aside>

  <!-- Central Documentation Content -->
  <main class="doc-content">
    <div class="breadcrumb"><a href="${relPath}/index.html">Documentation</a> / <a href="${relPath}/notes.html">${post.folder.title}</a> / ${post.slug}.md</div>
    <h1>${post.title}</h1>

    <article class="post-body">
      ${post.html}
    </article>

  </main>

  <!-- Right TOC Sidebar -->
  <aside class="doc-sidebar-right">
    <div class="toc-title">On this page</div>
    <ul class="toc-links">
      ${tocMarkup}
    </ul>
  </aside>
</div>
${footer(relPath)}`;
}

function buildNotes(posts, folders) {
  const sidebarLinks = folders
    .map((f) => {
      if (f.posts.length === 0) return '';
      const links = f.posts
        .map((p) => `<li><a href="./posts/${f.slug}/${p.slug}.html">${p.title}</a></li>`)
        .join('\n');
      return `<div class="sidebar-group">
        <div class="sidebar-title">
          <span>${f.title}</span>
          <span class="sidebar-arrow">&#9662;</span>
        </div>
        <ul class="sidebar-links">
          ${links}
        </ul>
      </div>`;
    })
    .join('\n');

  const noteSections = folders.length > 0
    ? folders
        .map((f) => {
          if (f.posts.length === 0) return '';
          const mdFiles = f.posts
            .map((p) => {
              const tags = p.tags.map((t) => `<span class="tag">${t}</span>`).join('');
              return `<a href="./posts/${f.slug}/${p.slug}.html" class="md-file-row">
                <div class="md-file-header">
                  <div class="md-file-name">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <span>${p.slug}.md</span>
                  </div>
                  <span class="md-file-date">${isoDate(p.date)}</span>
                </div>
                <div class="md-file-title">${p.title}</div>
                <p class="md-file-excerpt">${p.excerpt}</p>
                <div class="tag-row">${tags}</div>
              </a>`;
            })
            .join('\n');

          return `<div class="folder-container-card">
            <div class="folder-header-bar">
              <div class="folder-header-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="folder-icon" style="color: var(--cyan);"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                <span class="folder-path-name">content/${f.slug}/</span>
                <span class="folder-title-badge">${f.title}</span>
              </div>
              <span class="folder-file-count">${f.posts.length} ${f.posts.length === 1 ? 'file' : 'files'}</span>
            </div>
            <p class="folder-desc">${f.description}</p>
            <div class="folder-files-list">
              ${mdFiles}
            </div>
          </div>`;
        })
        .join('\n')
    : `<p style="color:var(--text-muted)">No notes yet. Add <code>.md</code> files in subdirectories under <code>content/</code> and run <code>node build.js</code>.</p>`;

  return `${head(`Notes — ${SITE.title}`, 'All notes and guides')}
${header('notes')}
<div class="doc-layout">
  <aside class="doc-sidebar-left">
    ${sidebarLinks}
  </aside>

  <main class="doc-content">
    <div class="breadcrumb"><a href="./index.html">Home</a> / Notes</div>
    <h1>All Notes</h1>
    <p style="color:var(--text-muted);margin-bottom:36px">Real-world guides on Linux, dev tools, system setup, and engineering workflows.</p>
    <div>
      ${noteSections}
    </div>
  </main>

  <aside class="doc-sidebar-right">
    <div class="toc-title">On this page</div>
    <ul class="toc-links">
      <li><a href="#">All Notes</a></li>
      ${posts.map((p) => `<li><a href="./posts/${p.folder.slug}/${p.slug}.html">${p.title}</a></li>`).join('\n      ')}
    </ul>
  </aside>
${footer()}`;
}

function buildCategory(folder, folders) {
  const relPath = '../..';

  const sidebarLinks = folders
    .map((f) => {
      if (f.posts.length === 0) return '';
      const isCurrentFolder = f.slug === folder.slug;
      const links = f.posts
        .map((p) => `<li><a href="${relPath}/posts/${f.slug}/${p.slug}.html">${p.title}</a></li>`)
        .join('\n');
      return `<div class="sidebar-group${isCurrentFolder ? '' : ' collapsed'}">
        <div class="sidebar-title">
          <span>${f.title}</span>
          <span class="sidebar-arrow">&#9662;</span>
        </div>
        <ul class="sidebar-links">
          ${links}
        </ul>
      </div>`;
    })
    .join('\n');

  const postCards = folder.posts.length > 0
    ? folder.posts.map((p) => {
        const tags = p.tags.map((t) => `<span class="tag">${t}</span>`).join('');
        return `<a href="${relPath}/posts/${folder.slug}/${p.slug}.html" class="note-row">
          <div class="note-row-title">${p.title}</div>
          <div class="note-row-meta">
            <span class="note-row-date">${isoDate(p.date)}</span>
            <div class="tag-row">${tags}</div>
          </div>
          <p class="note-row-excerpt">${p.excerpt}</p>
        </a>`;
      }).join('\n')
    : `<p style="color:var(--text-muted)">No posts in this category yet.</p>`;

  const tocLinks = folder.posts
    .map((p) => `<li><a href="${relPath}/posts/${folder.slug}/${p.slug}.html">${p.title}</a></li>`)
    .join('\n');

  return `${head(`${folder.title} — ${SITE.title}`, folder.description, relPath)}
${header('notes', relPath)}
<div class="doc-layout">
  <aside class="doc-sidebar-left">
    ${sidebarLinks}
  </aside>

  <main class="doc-content">
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
      buildCategory(folder, folders)
    );
    // Generate individual post pages
    for (const post of folder.posts) {
      fs.writeFileSync(
        path.join(SITE_DIR, 'posts', folder.slug, `${post.slug}.html`),
        buildPost(post, folders)
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
