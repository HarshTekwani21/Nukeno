@echo off
echo ===== Nukeno Firebase Deploy =====

set PROJECT_ID=nukeno-deploy
set REGION=us-central1

echo [1/4] Building frontend...
cd frontend
call npm run build
cd ..

echo [2/4] Deploying backend to Cloud Run...
cd backend
gcloud run deploy nukeno-backend ^
  --source . ^
  --platform managed ^
  --region %REGION% ^
  --allow-unauthenticated ^
  --set-env-vars GEMINI_API_KEY=YOUR_GEMINI_API_KEY ^
  --project %PROJECT_ID%
cd ..

echo [3/4] Deploying frontend to Firebase Hosting...
call firebase deploy --only hosting --project %PROJECT_ID%

echo [4/4] Done!
echo Your app is live at: https://%PROJECT_ID%.web.app
pause
