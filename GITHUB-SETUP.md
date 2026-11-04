# Put Setlifest on GitHub

This archive contains the Setlifest source code, not a GitHub Pages static site. Setlifest includes a Node/Express server, Manus OAuth, and a MySQL database; GitHub Pages cannot run those server-side services.

## Create a GitHub repository

1. Extract this ZIP on your computer.
2. On GitHub, create a new **empty** repository. Do not initialize it with a README, license, or `.gitignore`.
3. Open a terminal in the extracted `setlifest` folder and run:

```bash
git init -b main
git add .
git commit -m "Add Setlifest source"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the example GitHub URL with your repository's URL. Alternatively, extract the archive and use GitHub's web upload for the files (do not upload the ZIP as the repository contents).

## Run or host the full application

See `README.md` for the Node.js/pnpm commands and required server environment variable names. Hosting the working app requires a Node-capable host, a MySQL database, and valid Manus OAuth configuration. Keep production secrets in the hosting provider's secret/environment settings; never commit `.env`. The archive intentionally omits `.git`, `.env`, `node_modules`, and generated `dist` output.
