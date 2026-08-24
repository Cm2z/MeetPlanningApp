@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo [1/3] Building frontend...
call npm --prefix frontend run build
if errorlevel 1 goto :failed

echo [2/3] Creating Git commit...
git add -- "backend/src/routes/admin.js" "backend/src/routes/bookings.js" "backend/src/routes/dashboard.js" "backend/src/routes/notifications.js" "backend/src/routes/rooms.js" "frontend/src/App.vue" "frontend/src/components/AppSidebar.vue" "frontend/src/components/AppTopbar.vue" "frontend/src/components/BookingDetailModal.vue" "frontend/src/composables/useMeetPlanning.js" "frontend/src/views/BookingsView.vue" "frontend/src/views/NotificationsView.vue" "frontend/src/views/ProfileView.vue" "frontend/src/views/UserHistoryView.vue" "frontend/src/views/UserManagementView.vue" "RUN_BUILD_PUSH_BOOKING_DETAIL_POPUP.bat"
git diff --cached --quiet
if %ERRORLEVEL% EQU 0 goto :push
git commit -m "Add staff roles and improve booking notifications"
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
