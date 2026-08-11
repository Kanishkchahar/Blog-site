const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const SITE_DIR = path.join(ROOT, 'site');
const ASSETS_SRC = path.join(ROOT, 'site-assets');

// ---- site-wide config -----------------------------------------------------
const SITE = {
  title: 'kanishk.dev',
  tagline: 'notes from a Linux box that mostly works',
  author: 'Kanishk',
  repoUrl: 'https://github.com/Kanishkchahar/Blog-site',
  giscus: {
    // Fill these in from https://giscus.app once Discussions are enabled on your repo.
    repo: 'Kanishkchahar/Blog-site',
    repoId: 'REPLACE_ME',
    category: 'Comments',
    categoryId: 'REPLACE_ME',
  },
};

// ---- helpers ---------------------------------------------------------------
function readPosts() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    const slug = file.replace(/\.md$/, '');
    return {
      slug,
      title: data.title,
      date: data.date,
      tags: data.tags || [],
      excerpt: data.excerpt || '',
      html: md.render(content),
    };
  });
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

function fmtDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

function isoDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

// ---- shared partials --------------------------------------------------------
function head(title, description, isPost = false) {
  const cssPath = isPost ? '../assets/style.css' : './assets/style.css';
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
<link rel="stylesheet" href="${cssPath}">
</head>
<body>`;
}

function header(active, isPost = false) {
  const relPath = isPost ? '..' : '.';
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;
  return `<header class="shell-bar">
  <div class="shell-bar-inner">
    <a href="${relPath}/index.html" class="shell-brand">
      KANISHK.DEV
    </a>
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
function buildIndex(posts) {
  const cards = posts.length > 0
    ? posts
        .map((p) => {
          const tags = p.tags.map((t) => `<span class="tag">${t}</span>`).join('');
          return `<li>
            <a href="./posts/${p.slug}.html" style="text-decoration: none;">
              <div class="wu-corner-card">
                <div class="wu-corner-marks">
                  <span class="mark top-left"></span>
                  <span class="mark top-right"></span>
                  <span class="mark bottom-left"></span>
                  <span class="mark bottom-right"></span>
                </div>
                <div class="post-card-header">
                  <span>${isoDate(p.date)}</span>
                  <span>Fedora How-To</span>
                </div>
                <div class="post-card-title">${p.title}</div>
                <p class="post-card-excerpt">${p.excerpt}</p>
                <div class="tag-row">${tags}</div>
              </div>
            </a>
          </li>`;
        })
        .join('\n')
    : `<div class="wu-corner-card" style="grid-column: 1 / -1; text-align: center;">
        <div class="post-card-title" style="color: var(--text-muted);">No documentation posts found</div>
        <p class="post-card-excerpt">Add your <code>.md</code> files into <code>content/</code> and run <code>node build.js</code> to generate posts.</p>
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
        <div class="terminal-output">&#10004; Parsed Markdown content</div>
        <div class="terminal-output">&#10004; Generated static HTML into ./site</div>
        <div class="terminal-output">&#10004; Ready for GitHub Pages deployment</div>
      </div>
    </div>
  </div>

</div>

<main class="page" id="guides">
  <div class="section-header">
    <h2>Fedora Linux How-To & Documentation</h2>
    <p>Everything tested on actual hardware and documented step-by-step.</p>
  </div>
  <ul class="post-grid">
    ${cards}
  </ul>
</main>
${footer()}`;
}

function buildPost(post, allPosts) {
  const sidebarLinks = allPosts
    .map(
      (p) =>
        `<li><a href="./${p.slug}.html"${p.slug === post.slug ? ' class="active"' : ''}>${p.title}</a></li>`
    )
    .join('\n');

  return `${head(`${post.title} — ${SITE.title}`, post.excerpt, true)}
${header('', true)}

<div class="doc-layout">
  <!-- Left Navigation Sidebar (Screenshot 2) -->
  <aside class="doc-sidebar-left">
    <div class="sidebar-group">
      <div class="sidebar-title">User Guide <span>&#9662;</span></div>
      <ul class="sidebar-links">
        <li><a href="../index.html">Overview</a></li>
        <li><a href="../about.html">About nullptr.log</a></li>
      </ul>
    </div>
    <div class="sidebar-group">
      <div class="sidebar-title">Fedora Guides <span>&#9662;</span></div>
      <ul class="sidebar-links">
        ${sidebarLinks}
      </ul>
    </div>
  </aside>

  <!-- Central Documentation Content -->
  <main class="doc-content">
    <div class="breadcrumb"><a href="../index.html">Documentation</a> / ${post.slug}.md</div>
    <h1>${post.title}</h1>
    
    <div class="callout">
      <div class="callout-title">&#9888; Note</div>
      <div class="callout-body">Tested on Fedora 40 Workstation Edition. Keep your system updated via <code>sudo dnf upgrade</code> before applying kernel and driver tweaks.</div>
    </div>

    <article class="post-body">
      ${post.html}
    </article>

  </main>

  <!-- Right TOC Sidebar (Screenshot 2) -->
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

function buildNotes(posts) {
  const sidebarLinks = posts
    .map((p) => `<li><a href="./posts/${p.slug}.html">${p.title}</a></li>`)
    .join('\n');

  const noteRows = posts.length > 0
    ? posts.map((p) => {
        const tags = p.tags.map((t) => `<span class="tag">${t}</span>`).join('');
        return `<a href="./posts/${p.slug}.html" class="note-row">
          <div class="note-row-title">${p.title}</div>
          <div class="note-row-meta">
            <span class="note-row-date">${isoDate(p.date)}</span>
            <div class="tag-row">${tags}</div>
          </div>
          <p class="note-row-excerpt">${p.excerpt}</p>
        </a>`;
      }).join('\n')
    : `<p style="color:var(--text-muted)">No notes yet. Add <code>.md</code> files in <code>content/</code> and run <code>node build.js</code>.</p>`;

  return `${head(`Notes — ${SITE.title}`, 'All notes and guides')}
${header('notes')}
<div class="doc-layout">
  <aside class="doc-sidebar-left">
    <div class="sidebar-group">
      <div class="sidebar-title">Overview</div>
      <ul class="sidebar-links">
        <li><a href="./index.html">Home</a></li>
        <li><a href="./notes.html" class="active">All Notes</a></li>
      </ul>
    </div>
    <div class="sidebar-group">
      <div class="sidebar-title">Notes</div>
      <ul class="sidebar-links">
        ${sidebarLinks}
      </ul>
    </div>
  </aside>

  <main class="doc-content">
    <div class="breadcrumb"><a href="./index.html">Home</a> / Notes</div>
    <h1>All Notes</h1>
    <p style="color:var(--text-muted);margin-bottom:36px">Real-world guides on Linux, dev tools, system setup, and engineering workflows.</p>
    <div class="notes-list">
      ${noteRows}
    </div>
  </main>

  <aside class="doc-sidebar-right">
    <div class="toc-title">On this page</div>
    <ul class="toc-links">
      <li><a href="#">All Notes</a></li>
      ${posts.map((p) => `<li><a href="./posts/${p.slug}.html">${p.title}</a></li>`).join('\n      ')}
    </ul>
  </aside>
</div>
${footer()}`;
}

function buildAbout() {
  return `${head(`About — ${SITE.title}`, 'About this blog')}
${header('about')}
<main class="page">
  <div class="post-header">
    <div class="breadcrumb"><a href="./index.html">Documentation</a> / about.md</div>
    <h1>About nullptr.log</h1>
  </div>
  <article class="post-body">
    <p>This site serves as a practical, technical documentation log for Linux maintenance, specifically Fedora setups, driver troubleshooting, system performance optimizations, and dev tooling.</p>
    <p>All posts are written in standard Markdown and generated with a lightweight build script. Free hosting on GitHub Pages and zero server maintenance.</p>
  </article>
</main>
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

  const posts = readPosts();

  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), buildIndex(posts));
  fs.writeFileSync(path.join(SITE_DIR, 'about.html'), buildAbout());
  fs.writeFileSync(path.join(SITE_DIR, 'notes.html'), buildNotes(posts));
  for (const post of posts) {
    fs.writeFileSync(path.join(SITE_DIR, 'posts', `${post.slug}.html`), buildPost(post, posts));
  }

  console.log(`Built ${posts.length} post(s) into ${SITE_DIR}`);
}

build();
