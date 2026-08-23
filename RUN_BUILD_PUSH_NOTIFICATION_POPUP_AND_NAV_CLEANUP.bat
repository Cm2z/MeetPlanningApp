@echo off
setlocal EnableExtensions
cd /d P:\MeetPlanning

echo [1/3] Building frontend...
call npm --prefix frontend run build
if errorlevel 1 goto :failed

echo [2/3] Creating Git commit...
git add -- "frontend/src/App.vue" "frontend/src/components/AppSidebar.vue" "frontend/src/views/NotificationsView.vue" "RUN_BUILD_PUSH_NOTIFICATION_POPUP_AND_NAV_CLEANUP.bat"
git diff --cached --quiet
if %ERRORLEVEL% EQU 0 goto :push
git commit -m "Update notification modal and simplify navigation"
if errorlevel 1 goto :failed

:push
echo [3/3] Pushing to GitHub...
git push origin main
if errorlevel 1 goto :failed

echo Completed. Railway will deploy automatically.
pause
exit /b 0

:failed
echo Failed. Copy the message above and send it to Codex.
pause
exit /b 1
