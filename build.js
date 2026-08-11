const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

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

        const post = {
          slug,
          title,
          date,
          tags: data.tags || [],
          excerpt,
          html: md.render(content),
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

      const post = {
        slug,
        title,
        date,
        tags: data.tags || [],
        excerpt,
        html: md.render(content),
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
      ${nav(`${relPath}/about.html`, 'About', 'about')}
    </nav>
    <div class="header-search">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <span>Search</span>
      <kbd>Ctrl K</kbd>
    </div>
  </div>
</header>`;
}

function footer() {
  return `<footer class="shell-footer">
  <span>nullptr.log &middot; Open source Linux Documentation &middot; Powered by Node.js & Markdown</span>
</footer>
</body>
</html>`;
}

// ---- page builders -----------------------------------------------------------
function buildIndex(posts, folders) {
  const folderCards = folders.length > 0
    ? folders
        .map((f) => {
          const postLinks = f.posts.length > 0
            ? f.posts
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
            <div class="wu-corner-card folder-card">
              <div class="wu-corner-marks">
                <span class="mark top-left"></span>
                <span class="mark top-right"></span>
                <span class="mark bottom-left"></span>
                <span class="mark bottom-right"></span>
              </div>
              <div class="folder-card-header">
                <a href="./posts/${f.slug}/index.html" class="folder-title-link">
                  <div class="folder-icon-wrapper">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="folder-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <h3 class="folder-card-title">${f.title}</h3>
                </a>
                <span class="folder-post-count">${f.posts.length} ${f.posts.length === 1 ? 'post' : 'posts'}</span>
              </div>
              <p class="folder-card-excerpt">${f.description}</p>
              <div class="folder-posts-section">
                <div class="section-divider"></div>
                <ul class="folder-posts-list">
                  ${postLinks}
                </ul>
                <div style="margin-top: 12px; text-align: right;">
                  <a href="./posts/${f.slug}/index.html" class="view-folder-link">View all in folder &rarr;</a>
                </div>
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
      <div class="hero-subtitle">Notes for Engineers &amp; CS Students</div>
      <h1 class="hero-title">Learn and fix things</h1>
      <p class="hero-desc">Real-world guides on Linux, dev tools, system setup, and engineering workflows — straight from hands-on experience, no fluff.</p>
      
      <div class="hero-actions">
        <a href="./notes.html" class="btn-primary">Browse Notes &rarr;</a>
        <a href="${SITE.repoUrl}" target="_blank" class="btn-secondary">View on GitHub &nearr;</a>
      </div>
      <div class="hero-footnote">Free. Open source. Written in Markdown. Built with Node.js.</div>
    </div>

    <div class="terminal-window">
      <div class="window-titlebar">
        <span>fedora-setup.sh — bash</span>
        <div class="window-controls">
          <span class="window-dot"></span>
          <span class="window-dot"></span>
          <span class="window-dot"></span>
        </div>
      </div>
      <div class="window-body">
        <div><span class="terminal-prompt">[kanishk@fedora ~]$</span> <span class="terminal-cmd">cat /etc/fedora-release</span></div>
        <div class="terminal-output">Fedora release 40 (Thirty-Nine / Workstation Edition)</div>
        <br>
        <div><span class="terminal-prompt">[kanishk@fedora ~]$</span> <span class="terminal-cmd">node build.js</span></div>
        <div class="terminal-output">&#10004; Scanned content subdirectories</div>
        <div class="terminal-output">&#10004; Generated category folders on index page</div>
        <div class="terminal-output">&#10004; Ready for GitHub Pages deployment</div>
      </div>
    </div>
  </div>

</div>

<main class="page" id="guides">
  <div class="section-header">
    <h2>Knowledge Base Categories</h2>
    <p>Select a category or jump straight to a guide below.</p>
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
    
    <div class="callout">
      <div class="callout-title">&#9888; Note</div>
      <div class="callout-body">Tested on Fedora 40 Workstation Edition. Keep your system updated via <code>sudo dnf upgrade</code> before applying kernel and driver tweaks.</div>
    </div>

    <article class="post-body">
      ${post.html}
    </article>

  </main>

  <!-- Right TOC Sidebar -->
  <aside class="doc-sidebar-right">
    <div class="toc-title">On this page</div>
    <ul class="toc-links">
      <li><a href="#">Overview</a></li>
      <li><a href="#">Installation Steps</a></li>
      <li><a href="#">Verification & Status</a></li>
    </ul>
  </aside>
</div>

${footer()}`;
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
</div>
${footer()}`;
}

function buildAbout() {
  return `${head(`About — ${SITE.title}`, 'About this blog')}
${header('about')}
<main class="page">
  <div class="about-container">
    <div class="breadcrumb"><a href="./index.html">Home</a> / About</div>

    <!-- Profile Card -->
    <div class="about-profile-card">
      <div class="about-avatar">K</div>
      <div class="about-profile-info">
        <h2>Kanishk Chahar</h2>
        <div class="about-profile-handle">@kanishkchahar &middot; kanishk.dev</div>
        <p class="about-profile-bio">
          Engineering notes, hardware walkthroughs, and Linux Workstation documentation. 
          Building minimal, high-performance static tools with zero runtime dependencies.
        </p>
        <div class="hero-actions" style="margin-top: 12px;">
          <a href="https://github.com/Kanishkchahar/Blog-site" target="_blank" class="btn-secondary" style="padding: 6px 14px; font-size: 13px;">View GitHub &nearr;</a>
          <a href="./notes.html" class="btn-primary" style="padding: 6px 14px; font-size: 13px;">Browse All Notes &rarr;</a>
        </div>
      </div>
    </div>

    <!-- 2 Column Grid -->
    <div class="about-grid">
      <!-- Left: Specs & Environment -->
      <div class="about-card">
        <div class="about-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 16V8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8m16 0H4m16 0l1.28 2.55A1 1 0 0 1 20.38 20H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>
          Environment &amp; Stack
        </div>
        <ul class="spec-list">
          <li class="spec-item"><span class="spec-label">Primary OS</span><span class="spec-val">Fedora Linux Workstation</span></li>
          <li class="spec-item"><span class="spec-label">Shell &amp; Terminal</span><span class="spec-val">Bash / GNOME Terminal</span></li>
          <li class="spec-item"><span class="spec-label">Site Generator</span><span class="spec-val">Custom Node.js SSG</span></li>
          <li class="spec-item"><span class="spec-label">Markdown Parser</span><span class="spec-val">gray-matter + markdown-it</span></li>
          <li class="spec-item"><span class="spec-label">Styling Engine</span><span class="spec-val">Vanilla CSS (Zero Tailwind)</span></li>
          <li class="spec-item"><span class="spec-label">Hosting Platform</span><span class="spec-val">GitHub Pages</span></li>
        </ul>
      </div>

      <!-- Right: Site Mission & Architecture -->
      <div class="about-card">
        <div class="about-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Blog Philosophy
        </div>
        <ul class="feature-list">
          <li class="feature-item">
            <span class="feature-icon">&#10004;</span>
            <div><strong>Practical &amp; Verified:</strong> Step-by-step guides tested on actual hardware and real Linux installations.</div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">&#10004;</span>
            <div><strong>Folder Categories:</strong> Auto-grouped markdown articles indexed by directory subfolders &amp; metadata.</div>
          </li>
          <li class="feature-item">
            <span class="feature-icon">&#10004;</span>
            <div><strong>Zero Bloat:</strong> Blazing-fast static HTML loaded with zero client-side JavaScript frameworks.</div>
          </li>
        </ul>
        <div class="tech-stack-row">
          <span class="tag">Linux</span>
          <span class="tag">Fedora</span>
          <span class="tag">Node.js</span>
          <span class="tag">Markdown</span>
          <span class="tag">JavaScript</span>
          <span class="tag">CSS3</span>
        </div>
      </div>
    </div>
  </div>
</main>
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
${footer()}`;
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
  fs.writeFileSync(path.join(SITE_DIR, 'about.html'), buildAbout());
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

  console.log(`Built ${posts.length} post(s) into ${SITE_DIR}`);
}

build();
