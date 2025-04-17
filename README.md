# 🌐 create-webflow-starter

A powerful CLI to scaffold **modern Webflow projects** using **Vite** and deploy them to GitHub/CDN — all with a single command.

---

## 1. 🚀 Introduction

### What is `create-webflow-starter`?

A zero-config CLI to initialize a production-ready Webflow + Vite setup with modular JS/CSS, modern tooling, and optional GitHub deployment.

### Features

- ✅ Interactive CLI prompts
- 🔧 Project scaffolding (`vite.config.js`, `starter.config.js`, `package.json`, etc.)
- 🧱 Auto-setup:
  - [`vite-plugin-webflow-bundler`](https://github.com/kobono-studio/vite-plugin-webflow-bundler)
  - [`vite-plugin-github-deploy`](https://github.com/kobono-studio/vite-plugin-github-deploy)
- 🔐 SSH & GitHub authentication
- 🚀 GitHub deployment (public or split repo)
- 📦 CDN-ready output (jsDelivr compatible)

### Why use this?

This tool saves hours of setup by giving you a complete dev + deploy pipeline for modern Webflow-based sites. Everything is pre-configured, and the output is tailored for use with jsDelivr CDN and Webflow custom code.

### Benefits

- ⏳ Fast setup, from zero to ready in minutes
- 🧠 Built-in GitHub + SSH workflow
- 📁 Production-ready, CDN-compatible output
- 🔁 Versioned deploys with Git and jsDelivr fallback support

---

## 2. ⚙️ Prerequisites, Installation & Dev Commands

### Requirements

- Node.js >= 18
- Git + GitHub CLI
- SSH key (`id_ed25519`) added to your GitHub account

> Don't have an SSH key? No worries! If `create-webflow-starter` doesn't detect a key, it will **generate one for you** and optionally upload it to GitHub.

You’ll also be guided through authentication using the GitHub CLI (`gh auth login`) if needed.

### Install the CLI

```bash
npm install -g @kobono-studio/create-webflow-starter
# or via npx
npx @kobono-studio/create-webflow-starter
```

### Available commands

```bash
npm run dev            # Start local development server
npm run build          # Build for production
npm run deploy         # Deploy full project (single public repo)
npm run build:pages    # Build multiple JS files for each page
```

### What is `build:pages` mode?

Running `npm run build:pages` generates **independent JS bundles** for each file inside `src/pages/`. This is useful when you want to load different scripts per Webflow page, without loading unnecessary code.

---

## 3. 🚀 Quick Start + Git Modes + Configuration

### Run the CLI

```bash
create-webflow-starter
```

This will prompt you with the following questions:

1. 📄 Project name
2. 📁 Create a new folder for your project?
3. 🔳 GitHub deployment mode: `none`, `public-only`, or `split`
4. 🔑 GitHub user/org, repo name, and branch (if needed)

After answering these, the CLI:

- Scaffolds your project structure
- Creates the `starter.config.js` file based on your answers
- Generates SSH keys if necessary
- Authenticates with GitHub CLI (`gh`)

### GitHub Deployment Modes

- **none**: No GitHub setup or deploy
- **public-only**: Push full project to one **public repo** (ideal for open-source)
- **split**: Push `dist/` to a **public CDN repo**, and source to a **private repo** (ideal for Webflow + jsDelivr)

### Generated Configuration: `starter.config.js`

This config powers both the deployment and the loader system.

```js
export default {
  cdn: {
    baseUrl: 'https://cdn.jsdelivr.net/gh',
    user: 'your-github-user',
    repo: 'your-cdn-repo',
    branch: 'main',
    org: true, // set to true for GitHub organizations
  },
  deploy: {
    mode: 'split', // or 'none', 'public-only'
    publicRepo: 'webflow-assets',
    privateRepo: 'source-code',
    branch: 'main',
  },
  cssOrder: ['reset.css', 'layout.css', 'style.css'], // defines the precise order for the bundled CSS
}
```

> 💡 `cssOrder` is optional. If provided, the plugin will enforce the order of minified CSS in the `bundle.min.css` file.

---

## 4. 📂 Project Structures

### Minimal Project (Single CSS + JS)

```bash
src/
├── main.js
├── css/
│   └── style.css
```

This setup works perfectly for simple Webflow sites.

### Advanced CSS Structure

When working with several stylesheets, use `cssOrder` in your config to ensure correct bundling order.

```bash
src/
├── css/
│   ├── reset.css
│   ├── variables.css
│   ├── layout.css
│   └── style.css
```

Each file will be minified individually and also merged in the correct order into `bundle.min.css`.

### Advanced JS: Modular & Page-Based

```bash
src/
├── main.js                 # entry point for shared/global logic
├── modules/                # JS modules used across the project
│   ├── nav.js
│   └── slider.js
├── pages/                  # page-specific JS files
│   ├── home.js             # only loaded on home page
│   └── about.js            # only loaded on about page
```

- `modules/`: contains reusable logic that can be imported into `main.js` or any page script
- `pages/`: auto-discovered and bundled independently if `build:pages` is used

> You can reference these via `data-module` and `data-page` in your Webflow markup for conditional loading.

---

## 5. 🌐 Webflow Integration + Scripts

### Output files

After running `npm run build` or `npm run build:pages`, your output in `dist/` includes:

- `css/bundle.min.css` — merged + minified CSS
- `css/*.min.css` — individual minified CSS files (based on `cssOrder`)
- `scripts/main.min.js` — main JS bundle
- `scripts/pages/*.min.js` — page-specific JS bundles
- `manifest.json` — mapping for loaders/CDN fallback

### Automatic Loader Snippets

Each file generates a dynamic loader snippet with **fallback from localhost to CDN**:

```js
;(function () {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  fetch('http://localhost:3000/src/css/style.css', { method: 'HEAD' })
    .then(() => (link.href = 'http://localhost:3000/src/css/style.css'))
    .catch(
      () =>
        (link.href =
          'https://cdn.jsdelivr.net/gh/your-user/your-repo@main/css/style.min.css')
    )
  document.head.appendChild(link)
})()
```

This ensures that in dev mode, files load locally, and in production (like in Webflow), they fall back to jsDelivr CDN.

### Preview Interface: `/webflow`

```bash
npm run dev
→ http://localhost:3000/webflow
```

You’ll get:

- 📃 Copy-ready `<script>` blocks for CSS and JS (main + page-based)
- 👀 Visual confirmation of all generated loaders
- ✨ Perfect for integrating with Webflow custom code embeds

---

## 6. 👤 Author

Made with ❤️ by [Pierre Lovenfosse](https://github.com/meetpilou)

---

## 7. 📄 License

MIT — © [Pierre Lovenfosse](https://github.com/meetpilou)
