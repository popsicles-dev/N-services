# GitHub Setup Guide

This guide will help you push your SEO Lead Engine project to GitHub.

## Step 1: Configure Git (First Time Only)

If you haven't configured Git on your machine, run these commands:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email (use the email associated with your GitHub account).

## Step 2: Create Initial Commit

```bash
cd "c:\Univeristy\FYP\SEO Module"
git commit -m "Initial commit: SEO Lead Engine with lead generation, enrichment, and audit features"
```

## Step 3: Create GitHub Repository

1. Go to [GitHub](https://github.com) and log in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Repository settings:
   - **Name**: `seo-lead-engine` (or your preferred name)
   - **Description**: "Full-stack lead generation, contact enrichment, and SEO audit platform"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 4: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/johndoe/seo-lead-engine.git
git branch -M main
git push -u origin main
```

## Step 5: Verify Upload

1. Refresh your GitHub repository page
2. You should see all your project files
3. The README.md will be displayed on the repository homepage

## Future Updates

After the initial push, to update your repository:

```bash
# Stage changes
git add .

# Commit with a message
git commit -m "Description of changes"

# Push to GitHub
git push
```

## Important Notes

### Sensitive Information
The `.gitignore` file is configured to exclude:
- `.env` files (API keys and credentials)
- `node_modules/` (frontend dependencies)
- `venv/` and `.venv/` (Python virtual environments)
- `outputs/` (generated CSV files)
- Database files
- `__pycache__/` (Python cache)

**Always verify** that sensitive information is not being committed:
```bash
git status  # Check what will be committed
```

### .env.example
Make sure your `.env.example` file in the backend has placeholder values, not real API keys:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/seo_leads_db
REDIS_URL=redis://localhost:6379/0
SCRAPINGDOG_API_KEY=your_scrapingdog_api_key_here
PAGESPEED_API_KEY=your_google_pagespeed_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

## Troubleshooting

### Authentication Issues
If you encounter authentication errors when pushing:

**Option 1: HTTPS with Personal Access Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use the token as your password when prompted

**Option 2: SSH**
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your.email@example.com"`
2. Add to SSH agent: `ssh-add ~/.ssh/id_ed25519`
3. Add public key to GitHub: Settings → SSH and GPG keys
4. Use SSH URL: `git remote set-url origin git@github.com:USERNAME/REPO.git`

### Large Files
If you get errors about large files:
- Check if `node_modules/` or `venv/` are being tracked (they shouldn't be)
- Run: `git rm -r --cached node_modules/ venv/`
- Commit and try again

## Repository Structure on GitHub

```
seo-lead-engine/
├── .gitignore
├── README.md
├── STARTUP.md
├── Architecture Overview for SEO.png
├── backend/
│   ├── app/
│   ├── config.py
│   ├── main.py
│   ├── celery_app.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
└── frontend/
    ├── src/
    ├── public/
    ├── package.json
    ├── vite.config.js
    └── README.md
```

## Next Steps After Pushing

1. **Add Repository Description**: On GitHub, click "About" → Add description and topics
2. **Add Topics**: `lead-generation`, `seo`, `fastapi`, `react`, `celery`, `web-scraping`
3. **Enable Issues**: If you want to track bugs and features
4. **Add License**: Consider adding an MIT or other open-source license
5. **Update README**: Add screenshots or demo GIFs if desired

## Collaboration

To allow others to contribute:
1. Go to repository Settings → Collaborators
2. Add collaborators by username or email
3. They can clone with: `git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git`

---

**Need Help?** Check the [GitHub Docs](https://docs.github.com) or run `git --help`
