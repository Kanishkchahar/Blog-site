# kanishk.dev — Static Markdown Blog & Digital Garden

A zero-bloat, high-performance static blog generator built with Node.js and Vanilla CSS. Write your posts in Markdown, organize them using folder directories, save media assets in a dedicated `images/` directory, and deploy automatically to GitHub Pages.

---

## 📁 Repository Structure

```
.
├── content/              # Your Markdown posts (.md files grouped into topic subfolders)
│   ├── fedora/           # e.g., content/fedora/fedora-gpu-drivers.md
│   └── web-dev/          # e.g., content/web-dev/setup-vite-app.md
├── images/               # Media attachments (PNG, JPG, SVG, WebP, etc.)
├── site-assets/          # Core CSS styling & JavaScript client interactions
│   ├── style.css         # Custom Dark UI styling (Zero Tailwind)
│   └── script.js         # Client-side search modal, code copy buttons, sidebar toggles
├── .github/workflows/    # Automated GitHub Actions deployment pipeline
│   └── deploy.yml        # Automatically builds and publishes site/ to GitHub Pages
├── build.js              # Custom Node.js Static Site Generator (SSG)
├── up.sh                 # Local build & preview bash script (http://localhost:8000)
└── site/                 # Generated static website output (published to GitHub Pages)
```

---

## ⚡ Features & Workflow

- **Markdown-Based Writing**: Write articles using standard `.md` syntax with front matter support (`title`, `date`, `tags`, `excerpt`).
- **Separate Images Directory**: Keep raw media out of view; images in `images/` are automatically copied to the build destination and linked seamlessly.
- **Folder Directories**: Subfolders under `content/` automatically create category cards on the landing page and navigation groups in the sidebar.
- **Instant Search (`Ctrl + K`)**: Modal search indexing all titles, excerpts, tags, and topics in real time.
- **Obsidian-Style Reader View**: Dynamic Table of Contents (TOC), heading anchor IDs, and hoverable code copy buttons.
- **Automated Deployments**: Powered by GitHub Actions (`deploy.yml`). Pushing changes to `main` automatically updates your live site on GitHub Pages.

---

## ✍️ Writing a New Post

1. **Add attachments**: Place any images or screenshots in the `images/` directory.
2. **Create a `.md` file**: Add your file into `content/` (or a topic subfolder like `content/fedora/my-guide.md`):

   ```markdown
   ---
   title: My Guide Title
   date: 2026-08-14
   tags: [linux, fedora, guide]
   excerpt: A short preview description for the landing page card.
   ---

   ## Introduction

   Your Markdown content starts here.

   ![Demo Image](/images/my-screenshot.png)
   ```

3. **Build & Preview Locally**:
   ```bash
   ./up.sh
   # Opens static site server on http://localhost:8000
   ```

---

## 🚀 Deploying to GitHub Pages

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Add new blog post"
   git push origin main
   ```
2. Go to your GitHub repository **Settings** → **Pages** → set **Source** to **GitHub Actions**.
3. Your site will automatically build and publish live to `https://<your-username>.github.io/<repo-name>/`.
