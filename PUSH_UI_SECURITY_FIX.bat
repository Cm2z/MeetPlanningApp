@echo off
setlocal EnableExtensions
chcp 65001 >nul

cd /d "%~dp0"
title MeetPlanning - Verify, Commit and Push

echo ============================================================
echo   MeetPlanning: verify UI/security fixes and push to GitHub
echo ============================================================
echo.

where git >nul 2>nul || goto :missing_git
where node >nul 2>nul || goto :missing_node
where npm >nul 2>nul || goto :missing_npm

git rev-parse --is-inside-work-tree >nul 2>nul || goto :not_repo

echo [1/6] Building frontend...
pushd frontend
call npm run build
if errorlevel 1 goto :frontend_failed

echo.
echo [2/6] Auditing frontend dependencies...
call npm audit --audit-level=high
if errorlevel 1 goto :frontend_audit_failed
popd

echo.
echo [3/6] Checking backend syntax...
pushd backend
node --check src/server.js || goto :backend_failed
node --check src/middleware/auth.js || goto :backend_failed
node --check src/routes/auth.js || goto :backend_failed
node --check src/routes/backup.js || goto :backend_failed
node --check src/routes/bookings.js || goto :backend_failed
node --check src/routes/notifications.js || goto :backend_failed
node --check src/routes/profile.js || goto :backend_failed
node --check src/routes/settings.js || goto :backend_failed
node --check src/utils/passwordMigration.js || goto :backend_failed

echo.
echo [4/6] Auditing backend production dependencies...
call npm audit --omit=dev --audit-level=high
if errorlevel 1 goto :backend_audit_failed
popd

echo.
echo [5/6] Staging only the UI, timezone and security files...
git add -- ^
  backend/.env.example ^
  backend/package-lock.json ^
  backend/src/config/db.js ^
  backend/src/middleware/auth.js ^
  backend/src/routes/auth.js ^
  backend/src/routes/backup.js ^
  backend/src/routes/bookings.js ^
  backend/src/routes/notifications.js ^
  backend/src/routes/profile.js ^
  backend/src/routes/settings.js ^
  backend/src/server.js ^
  backend/src/utils/bookingLifecycle.js ^
  backend/src/utils/passwordMigration.js ^
  docker-compose.yml ^
  frontend/package-lock.json ^
  frontend/index.html ^
  frontend/public/favicon.png ^
  frontend/public/meetplanning-logo.webp ^
  frontend/public/robots.txt ^
  frontend/src/api.js ^
  frontend/src/components/AppSidebar.vue ^
  frontend/src/components/CookieConsent.vue ^
  frontend/src/dialog.js ^
  frontend/src/composables/useMeetPlanning.js ^
  frontend/src/components/AppDialog.vue ^
  frontend/src/style.css ^
  frontend/src/App.vue ^
  frontend/src/views/AuthView.vue ^
  frontend/src/views/BackupView.vue ^
  frontend/src/views/BookingsView.vue ^
  frontend/src/views/ReserveView.vue ^
  frontend/src/views/RoomManagementView.vue ^
  frontend/src/views/ProfileView.vue ^
  frontend/src/views/SettingsView.vue ^
  frontend/src/views/UserManagementView.vue ^
  frontend/vite.config.js ^
  PUSH_UI_SECURITY_FIX.bat
if errorlevel 1 goto :git_add_failed

git diff --cached --check
if errorlevel 1 goto :diff_failed

git diff --cached --quiet
if not errorlevel 1 goto :nothing_to_commit

set "COMMIT_MESSAGE=fix: responsive booking popup and security hardening"
if not "%~1"=="" set "COMMIT_MESSAGE=%~1"

git commit -m "%COMMIT_MESSAGE%"
if errorlevel 1 goto :commit_failed

echo.
echo [6/6] Pushing the current branch to origin...
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH goto :branch_failed
git push -u origin "%CURRENT_BRANCH%"
if errorlevel 1 goto :push_failed

echo.
echo ============================================================
echo   SUCCESS: pushed branch %CURRENT_BRANCH% to GitHub
echo ============================================================
echo.
echo Railway variables required for production:
echo   NODE_ENV=production
echo   JWT_SECRET=(random value, at least 32 characters)
echo   CLIENT_ORIGIN=(your exact frontend URL)
echo   ADMIN_DELETE_CODE=(a long random code)
echo   ALLOW_DATABASE_RESTORE=false
echo.
pause
exit /b 0

:frontend_failed
popd
echo ERROR: Frontend build failed. Nothing was committed or pushed.
goto :failed

:frontend_audit_failed
popd
echo ERROR: Frontend security audit failed. Run npm audit in frontend.
goto :failed

:backend_failed
popd
echo ERROR: Backend syntax check failed. Nothing was committed or pushed.
goto :failed

:backend_audit_failed
popd
echo ERROR: Backend security audit failed. Run npm audit in backend.
goto :failed

:missing_git
echo ERROR: Git is not installed or is not in PATH.
goto :failed
:missing_node
echo ERROR: Node.js is not installed or is not in PATH.
goto :failed
:missing_npm
echo ERROR: npm is not installed or is not in PATH.
goto :failed
:not_repo
echo ERROR: This BAT file must be inside the MeetPlanning Git repository.
goto :failed
:git_add_failed
echo ERROR: Could not stage the requested files.
goto :failed
:diff_failed
echo ERROR: Git found whitespace errors in the staged changes.
goto :failed
:nothing_to_commit
echo INFO: There are no staged changes to commit.
echo Existing unrelated files were intentionally left untouched.
goto :failed
:commit_failed
echo ERROR: Git commit failed. Check your Git name and email settings.
goto :failed
:branch_failed
echo ERROR: Could not detect the current Git branch.
goto :failed
:push_failed
echo ERROR: Push failed. Check internet access and GitHub authentication.
goto :failed

:failed
echo.
pause
exit /b 1
