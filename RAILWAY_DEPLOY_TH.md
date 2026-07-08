
# Deploy MeetPlanning à¸”à¹‰à¸§à¸¢ GitHub + Railway

à¸„à¸¹à¹ˆà¸¡à¸·à¸­à¸™à¸µà¹‰à¹ƒà¸Šà¹‰à¹‚à¸„à¸£à¸‡à¸ªà¸£à¹‰à¸²à¸‡:

'''text
P:\MeetPlanning
  backend/
  frontend/
  database/
'''

## 1. à¹€à¸•à¸£à¸µà¸¢à¸¡ Git

à¹€à¸›à¸´à¸” PowerShell:

'''powershell
cd P:\MeetPlanning
git init
git add .
git commit -m "Initial MeetPlanning app"
'''

à¸ªà¸£à¹‰à¸²à¸‡ repository à¹ƒà¸«à¸¡à¹ˆà¹ƒà¸™ GitHub à¹à¸¥à¹‰à¸§à¸œà¸¹à¸ remote:

'''powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/meetplanning.git
git push -u origin main
'''

à¸–à¹‰à¸²à¸¡à¸µ remote à¸­à¸¢à¸¹à¹ˆà¹à¸¥à¹‰à¸§:

'''powershell
git remote set-url origin https://github.com/YOUR_USERNAME/meetplanning.git
git push -u origin main
'''

## 2. à¸ªà¸£à¹‰à¸²à¸‡ Railway Project

1. à¹€à¸‚à¹‰à¸² Railway
2. New Project
3. Deploy from GitHub repo
4. à¹€à¸¥à¸·à¸­à¸ repo 'meetplanning'

à¹à¸™à¸°à¸™à¸³à¹ƒà¸«à¹‰à¸ªà¸£à¹‰à¸²à¸‡ 3 services:

- MySQL Database
- Backend service
- Frontend service

## 3. MySQL à¸šà¸™ Railway

à¹€à¸žà¸´à¹ˆà¸¡ service à¹€à¸›à¹‡à¸™ MySQL

Railway à¸ˆà¸°à¸¡à¸µà¸•à¸±à¸§à¹à¸›à¸£à¸›à¸£à¸°à¸¡à¸²à¸“à¸™à¸µà¹‰à¹ƒà¸«à¹‰:

'''text
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
'''

backend à¸–à¸¹à¸à¸›à¸£à¸±à¸šà¹ƒà¸«à¹‰à¹ƒà¸Šà¹‰à¸•à¸±à¸§à¹à¸›à¸£ Railway à¹€à¸«à¸¥à¹ˆà¸²à¸™à¸µà¹‰à¹à¸¥à¹‰à¸§

## 4. Deploy Backend

à¸ªà¸£à¹‰à¸²à¸‡ service à¸ˆà¸²à¸ GitHub repo à¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸™ à¹à¸¥à¹‰à¸§à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²:

'''text
Root Directory: backend
Build Command: npm install
Start Command: npm run start
'''

à¸•à¸±à¹‰à¸‡ Environment Variables:

'''text
JWT_SECRET=à¹ƒà¸ªà¹ˆà¸‚à¹‰à¸­à¸„à¸§à¸²à¸¡à¸¥à¸±à¸šà¸¢à¸²à¸§à¹†
CLIENT_ORIGIN=https://URL-FRONTEND-RAILWAY
'''

à¸–à¹‰à¸² Railway à¹„à¸¡à¹ˆ map MySQL variables à¹ƒà¸«à¹‰à¸­à¸±à¸•à¹‚à¸™à¸¡à¸±à¸•à¸´ à¹ƒà¸«à¹‰à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸­à¸‡:

'''text
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
'''

## 5. Migrate Database

à¸«à¸¥à¸±à¸‡ backend deploy à¹à¸¥à¹‰à¸§ à¹ƒà¸«à¹‰à¸£à¸±à¸™ migration à¸«à¸™à¸¶à¹ˆà¸‡à¸„à¸£à¸±à¹‰à¸‡

à¸–à¹‰à¸²à¹ƒà¸Šà¹‰ Railway CLI:

'''powershell
railway login
railway link
railway run npm run migrate
'''

à¹ƒà¸«à¹‰à¹à¸™à¹ˆà¹ƒà¸ˆà¸§à¹ˆà¸² command à¸™à¸µà¹‰à¸£à¸±à¸™à¹ƒà¸™ service backend à¸«à¸£à¸·à¸­ root directory backend

à¸–à¹‰à¸²à¹„à¸¡à¹ˆà¹ƒà¸Šà¹‰ CLI à¹ƒà¸«à¹‰à¹€à¸›à¸´à¸” Railway service backend à¹à¸¥à¹‰à¸§à¹ƒà¸Šà¹‰ shell/command à¸‚à¸­à¸‡ Railway à¸£à¸±à¸™:

'''bash
npm run migrate
'''

## 6. Deploy Frontend

à¸ªà¸£à¹‰à¸²à¸‡ service à¸ˆà¸²à¸ GitHub repo à¹€à¸”à¸µà¸¢à¸§à¸à¸±à¸™à¸­à¸µà¸à¸•à¸±à¸§ à¹à¸¥à¹‰à¸§à¸•à¸±à¹‰à¸‡à¸„à¹ˆà¸²:

'''text
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npm run start
'''

à¸•à¸±à¹‰à¸‡ Environment Variables:

'''text
VITE_API_URL=https://URL-BACKEND-RAILWAY/api
'''

à¸«à¸¥à¸±à¸‡ frontend à¹„à¸”à¹‰ URL à¹à¸¥à¹‰à¸§ à¸à¸¥à¸±à¸šà¹„à¸› backend à¹à¸¥à¹‰à¸§à¸•à¸±à¹‰à¸‡:

'''text
CLIENT_ORIGIN=https://URL-FRONTEND-RAILWAY
'''

à¸ˆà¸²à¸à¸™à¸±à¹‰à¸™ redeploy backend

## 7. à¸•à¸£à¸§à¸ˆà¸«à¸¥à¸±à¸‡ Deploy

à¹€à¸›à¸´à¸”:

'''text
https://URL-BACKEND-RAILWAY/health
'''

à¸„à¸§à¸£à¹„à¸”à¹‰:

'''json
{ "ok": true, "service": "MeetPlanning API" }
'''

à¹€à¸›à¸´à¸” frontend à¹à¸¥à¹‰à¸§à¸—à¸”à¸ªà¸­à¸š:

- login admin
- à¸„à¹‰à¸™à¸«à¸²à¸«à¹‰à¸­à¸‡
- à¸ˆà¸­à¸‡à¸«à¹‰à¸­à¸‡
- à¸­à¸™à¸¸à¸¡à¸±à¸•à¸´
- dashboard
- backup/settings/kiosk

## 8. à¸šà¸±à¸à¸Šà¸µà¹€à¸£à¸´à¹ˆà¸¡à¸•à¹‰à¸™

'''text
admin@meetplanning.local
admin1234
'''

à¸«à¸¥à¸±à¸‡à¹€à¸‚à¹‰à¸²à¹„à¸”à¹‰à¸„à¸§à¸£à¹€à¸›à¸¥à¸µà¹ˆà¸¢à¸™à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¸—à¸±à¸™à¸—à¸µ

## 9. à¸«à¸¡à¸²à¸¢à¹€à¸«à¸•à¸¸

- à¸­à¸¢à¹ˆà¸² push à¹„à¸Ÿà¸¥à¹Œ '.env'
- à¸­à¸¢à¹ˆà¸² push 'node_modules'
- à¸–à¹‰à¸² deploy à¹à¸¥à¹‰à¸§ frontend à¹€à¸£à¸µà¸¢à¸ API à¹„à¸¡à¹ˆà¹„à¸”à¹‰ à¹ƒà¸«à¹‰à¹€à¸Šà¹‡à¸ 'VITE_API_URL'
- à¸–à¹‰à¸² backend à¸‚à¸¶à¹‰à¸™ CORS error à¹ƒà¸«à¹‰à¹€à¸Šà¹‡à¸ 'CLIENT_ORIGIN'
- à¸–à¹‰à¸² database error à¹ƒà¸«à¹‰à¹€à¸Šà¹‡à¸ MySQL variables à¹à¸¥à¸°à¸£à¸±à¸™ 'npm run migrate'
