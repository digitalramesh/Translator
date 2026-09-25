# Indian Language Translator

Translate documents (PDF, DOCX, TXT) and text into 12+ major Indian languages using the Google Gemini AI API. Built with React (Vite), Tailwind CSS, and a serverless Express backend configured for instant Vercel deployment.

---

## 🚀 Quick GitHub Connection & Vercel Deployment

### Step 1: Connect to GitHub

You can connect this project to GitHub using any of the following methods:

#### Method A: Direct Export from AI Studio (Recommended)
1. In the top right header of the Google AI Studio project interface, look for the **Export** or **GitHub** menu.
2. Click **Export to GitHub** (or **Push to GitHub**).
3. Authorize your GitHub account and choose a repository name (e.g. `indian-language-translator`).
4. AI Studio will automatically push all files and commits to your new GitHub repository.

#### Method B: Push using Git CLI
If you have created a repository on GitHub (e.g., `https://github.com/<your-username>/indian-language-translator`):
```bash
# Add your GitHub repository as origin
git remote add origin https://github.com/<your-username>/indian-language-translator.git

# Set main branch
git branch -M main

# Push project files
git push -u origin main
```

---

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** > **"Project"**.
3. Select your GitHub repository (`indian-language-translator`) and click **"Import"**.
4. Configure your project:
   - **Framework Preset**: Vite (detected automatically).
   - **Build Command**: `vite build` (default).
   - **Output Directory**: `dist` (default).
5. **Add Environment Variable**:
   - In the **Environment Variables** section:
     - **Name**: `GEMINI_API_KEY`
     - **Value**: Your Google Gemini API key (obtain from [Google AI Studio](https://aistudio.google.com/apikey)).
6. Click **"Deploy"**.

Vercel will build the frontend, deploy the backend serverless function (`/api/*`), and assign a live production URL (e.g., `https://your-project.vercel.app`).

---

## 🛠 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Add your GEMINI_API_KEY in .env

# 3. Start development server (serves frontend & backend on port 3000)
npm run dev
```

---

## 📁 Project Architecture

- **`src/`**: React + Vite frontend application with Tailwind CSS.
- **`server/app.ts`**: Express backend containing AI translation endpoints and document parser utilities.
- **`server.ts`**: Local development server bundling Vite and Express middleware on port 3000.
- **`api/index.ts`**: Production entrypoint for Vercel Serverless Functions.
- **`vercel.json`**: Vercel routing rules directing `/api/*` to the serverless function and client routes to `index.html`.
