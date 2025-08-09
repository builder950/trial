# Network Dashboard

A modern React dashboard with Google Apps Script integration for managing network data.

## Features
- Real-time data visualization with Recharts  
- Dark/light mode toggle  
- Responsive design  
- Google Sheets integration via Apps Script  
- Editable data with modal forms  
- Automatic data refresh every 15 seconds  
- Toast notifications  

## Setup Instructions

### Google Apps Script
1. Go to https://script.google.com  
2. Create a new project  
3. Replace `apps-script/Code.gs` and `apps-script/appsscript.json` with the provided code  
4. Insert your `<<SHEET_ID>>` and `<<SECRET>>`  
5. Deploy → New deployment → Web app → Execute as “Me” → Access “Anyone” → Deploy  
6. Copy the deployment URL

### React App
1. `npm install`  
2. In `src/lib/api.js`, replace `YOUR_SCRIPT_ID` and `YOUR_SECRET_KEY`  
3. `npm run dev`

### Deployment (Cloudflare Pages)
1. `npm run build`  
2. Connect GitHub repo to Cloudflare Pages  
3. Build command: `npm run build`, Publish directory: `dist`
