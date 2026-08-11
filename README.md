# nullptr.log — blog starter

A tiny static blog: write posts in Markdown, run one command, get a styled
site with comments. No framework, no server to run, free to host.

## How it's structured

```
content/            # your posts, one .md file each
site-assets/         # style.css + script.js (copied into every build)
build.js             # the generator — reads content/, writes site/
site/                 # generated output — this is what you deploy (don't hand-edit it)
```

## Writing a new post

1. Add a file to `content/`, e.g. `content/my-new-post.md`
2. Give it front matter at the top:

   ```markdown
   ---
   title: My New Post
   date: 2026-08-20
   tags: [linux, fedora]
   excerpt: One sentence describing the post for the homepage listing.
   ---

   Your Markdown content starts here.
   ```

3. Rebuild:

   ```bash
   node build.js
   ```

4. Preview locally before pushing:

   ```bash
   cd site && python3 -m http.server 8000
   # open http://localhost:8000
   ```

The filename (minus `.md`) becomes the URL slug — `content/my-new-post.md` →
`/posts/my-new-post.html`.

## Deploying to GitHub Pages (free)

1. Create a new GitHub repo (public — Pages on the free tier needs a public
   repo, or GitHub Pro for private).
2. Push this whole project to it.
3. In the repo, go to **Settings → Pages**, and set the source to deploy
   from the `site/` folder on your main branch (or set up a small GitHub
   Action that runs `node build.js` and publishes `site/` — either works,
   the Action is nicer since you never forget to rebuild before pushing).
4. Your blog will be live at `https://your-username.github.io/your-repo/`.

If you want the site at the repo root instead of a subpath, name the repo
`your-username.github.io` — GitHub treats that repo specially and serves it
at the domain root.

## Turning on comments (Giscus)

Comments are wired up but pointed at placeholder values until you connect
them to your own repo:

1. Make sure the GitHub repo you deployed to is **public**, and that the
   **Discussions** feature is turned on for it (Settings → General →
   Features → Discussions).
2. Go to **https://giscus.app**, enter your repo name, and it'll generate
   a config for you (it checks the repo is set up correctly as you go).
3. Copy the four values it gives you — `data-repo-id`, `data-category`,
   `data-category-id`, and confirm the repo name — into the `SITE.giscus`
   object near the top of `build.js`.
4. Rebuild (`node build.js`) and redeploy. Comments will now show up at
   the bottom of every post, threaded through GitHub Discussions.

Visitors need a GitHub account to comment — no account, no separate
database, no spam form to moderate.

## Customizing

- Site title / tagline: top of `build.js`, in the `SITE` object.
- Colors, type, spacing: `site-assets/style.css` (all tokens are CSS
  variables at the top of the file).
- Homepage hero copy: the `terminal-sub` line inside `buildIndex()` in
  `build.js`.
