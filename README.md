# StudentSpend — Student Finance Tracker

A lightweight, accessible, vanilla JS finance tracker built for students. No frameworks, no build tools — just HTML, CSS, and ES modules.

 Demo Video Link: https://youtu.be/Ck310LlCEFM

GitHub Pages URL: https://monique-creator.github.io/summative-financial-tracker/

WIREFRAME: https://miro.com/app/board/uXjVG9J42Ew=/?share_link_id=15186864376


## THEME
**Student Finance Tracker** — track daily expenses, set a monthly budget cap, search with regex, and view spending trends.



## Features
- Add, edit, delete transactions with full validation
- Live regex-powered search with match highlighting (safe compiler with try/catch)
- Sort by date (asc/desc), description (A–Z, Z–A), amount (asc/desc)
- Dashboard: total records, total spent, top category, budget cap status
- 7-day bar chart and category breakdown
- Monthly budget cap with ARIA live announcements (polite under, assertive over)
- Import & Export JSON (validated on import)
- Manual currency converter: USD → EUR / GBP (Settings)
- Editable categories (Settings)
- localStorage persistence across sessions
- Fully keyboard-navigable, ARIA live regions, skip link, visible focus


## Accessibility Notes
- Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- All inputs have associated `<label>` elements
- Errors announced via `role="alert"` spans
- Budget cap messages use `aria-live="polite"` (under) and `aria-live="assertive"` (over)
- Visible focus ring on all interactive elements (3px accent outline)
- Skip-to-content link at top of page
- Modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- Color contrast: dark text on light background (ratio ≥ 7:1)
- Bar chart has `role="img"` with `aria-label`


## File Structure

studentspend/
├── index.html          
├── tests.html          
├── seed.json           
├── README.md
├── styles/
│   └── main.css        
└── scripts/
    ├── app.js          
    ├── state.js        
    ├── storage.js      
    ├── validators.js   
    ├── search.js       
    └── ui.js           

## How to Run
1. Clone the repo and open it in a local server 
   ```bash
   npx serve .
   # or
   python3 -m http.server 8080
   ```
2. Open `http://localhost:8080` in your browser
3. To run tests: visit `http://localhost:8080/tests.html`
4. To load sample data: go to Records → Import JSON and select `seed.json`

## Ai usage clarification
i used claude ai for generating seed.json file**. 

AUTHOR
Name:Monique Niyobyose
Github: Monique-creator
Email: m.niyobyose@alustudent.com
