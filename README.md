# 🏆 AI Study Buddy

Upload your notes or PDFs, ask questions about them, and generate quizzes and flashcards — all grounded in *your* material.

No accounts, no database, no build step, **$0 cost**. Notes live in the browser (`localStorage`); a tiny serverless backend keeps your API key private and calls Google's Gemini API, which has a genuinely free tier — no credit card required.

**Live demo:** _add your deployed URL here once you've deployed it_

---

## How it works

- **Frontend** — plain HTML/CSS/JS in `/public`. Parses PDFs client-side with [pdf.js](https://mozilla.github.io/pdf.js/), no upload to any server. Notes are saved in the browser's `localStorage`.
- **Backend** — three tiny serverless functions in `/api` (`ask.js`, `quiz.js`, `flashcards.js`). Each one takes your notes text + a request, calls the Gemini API server-side (so your API key never reaches the browser), and returns an answer / quiz / flashcard set.
- **Model** — `gemini-2.5-flash`, on Google AI Studio's free tier. As of mid-2026 that's roughly 10 requests/minute and 250–500 requests/day at no cost, no credit card — comfortably enough for a class of 20–50 students. (Google's free tier terms allow your prompts to be used to improve their products — worth knowing if students will paste in sensitive material; see [Gemini API terms](https://ai.google.dev/gemini-api/terms) for the current policy.)

```
study-buddy/
├── public/          # everything the browser loads
│   ├── index.html
│   ├── style.css
│   └── app.js
├── api/              # serverless functions (Node)
│   ├── ask.js
│   ├── quiz.js
│   ├── flashcards.js
│   └── _shared.js
├── package.json
├── vercel.json
└── .env.example
```

---

## 1. Get a free API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Sign in with any Google account.
3. Click **Create API key**. No credit card, no payment info needed.

That's it — you have a working key on Google's free tier.

---

## 2. Run it locally

```bash
npm install -g vercel     # one-time
git clone <your-fork-url>
cd study-buddy
cp .env.example .env      # then paste your GEMINI_API_KEY into .env
vercel dev
```

Open the URL Vercel prints (usually `http://localhost:3000`). Upload a PDF, ask it a question, generate a quiz.

---

## 3. Deploy it for free (so students can actually use it)

The simplest path is [Vercel](https://vercel.com) — free tier, no server to manage, deploys straight from GitHub.

1. Push this repo to your own GitHub account (see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In the project's **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your key from step 1
4. Click **Deploy**. You'll get a URL like `ai-study-buddy-yourname.vercel.app` — that's the link you share with students.

That's it — no database, no server maintenance, no bill. Vercel's free tier and Gemini's free tier both comfortably handle a class of 20–50 people.

**A note on limits:** the free Gemini tier is rate-limited (roughly 10 requests/minute, a few hundred/day, shared across everyone using your deployed link). That's plenty for a class pilot, but if usage spikes right before an exam and people start seeing errors, that's why — either wait a minute and retry, or add billing to the same Google Cloud project later to lift the cap.

---

## 4. Get 20–50 students using it

A few things that actually move the needle for a class pilot:

- **Piggyback on a real deadline.** Share the link the week before a midterm or quiz — "paste in your notes, quiz yourself before Thursday" converts much better than sharing it with no urgency.
- **Drop it where students already are** — your class group chat, Discord, or LMS announcement, not a new channel they have to check.
- **Show, don't explain.** A 20-second screen recording of you uploading a PDF and getting a quiz out of it will get more usage than a paragraph of instructions.
- **Ask for one piece of feedback**, not a survey — "did the quiz questions actually match what's on your notes?" is easy to answer and tells you if the grounding is working.
- **Watch your usage** in [Google AI Studio](https://aistudio.google.com/) the first few days — it's free, but if you're right at the edge of the daily limit, you'll want to know before students hit a wall.

---

## 5. Open-source it on GitHub

```bash
cd study-buddy
git init
git add .
git commit -m "Initial commit: AI Study Buddy"
gh repo create ai-study-buddy --public --source=. --push
# or: create a repo on github.com, then
# git remote add origin <your-repo-url>
# git push -u origin main
```

The repo already includes an MIT `LICENSE` and a `.gitignore` that keeps your `.env` (and your API key) out of version control — double check `.env` never gets committed before you push.

Nice-to-haves if you want other people to contribute:
- Add a screenshot or short GIF to this README.
- Open a few `good first issue` tickets (e.g. "export flashcards to Anki", "dark/light toggle", "support .docx uploads").
- Add a `CONTRIBUTING.md` if you want to set expectations for PRs.

---

## Notes on scope (and how to extend it)

This is intentionally a lean MVP:

- **No accounts / no shared database** — each student's notes live only in their own browser. Good for a pilot, not for a shared class library. To add that, you'd swap `localStorage` for a small database (e.g. Postgres via [Neon](https://neon.tech) or [Supabase](https://supabase.com)) and add simple auth.
- **No rate limiting** — fine for 20–50 trusted users; add per-IP rate limiting in `api/_shared.js` before opening it up publicly.
- **Text-only PDFs** — scanned/image-only PDFs won't extract text (pdf.js can't OCR). A future improvement would be to run OCR server-side for those.

## License

MIT — see [LICENSE](./LICENSE).
