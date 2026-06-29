@echo off
cd /d "C:\Users\Victo\OneDrive\Documentos\jianamed"
echo Eliminando lock file si existe...
del /f ".git\index.lock" 2>nul
del /f ".git\COMMIT_EDITMSG.lock" 2>nul
echo Staging todos los cambios...
git add .
echo Creando commit...
git commit -m "feat: produccion — Stripe, email, pino, Dockerfile, fly.toml, CI/CD, migrations"
echo Haciendo push a main...
git push origin main
echo.
echo Listo. Presiona cualquier tecla para cerrar.
pause
