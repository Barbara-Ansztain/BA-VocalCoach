@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  BA - Vocal Coach - Subir a GitHub (Netlify publica solo)
echo  --------------------------------------------------------
where git >nul 2>nul || (echo  Falta instalar Git: https://git-scm.com/download/win & goto fin)
if not exist .git git init
git config user.name >nul 2>nul || git config user.name "Barbara Ansztain"
git config user.email >nul 2>nul || git config user.email "bavocalcoach@users.noreply.github.com"
git remote remove origin >nul 2>nul
git remote add origin https://github.com/Barbara-Ansztain/BA-VocalCoach.git
git add -A
git commit -m "Actualizacion %date% %time%" >nul 2>nul
git branch -M main
echo  Subiendo... (si pide iniciar sesion en GitHub, hacelo en la ventana que se abre)
git push -u origin main
if errorlevel 1 (
  echo  Traigo lo que ya habia en GitHub y vuelvo a intentar...
  git pull origin main --allow-unrelated-histories --no-edit -X ours
  git push -u origin main
)
if errorlevel 1 (echo. & echo  No se pudo subir. Mandale una captura de esta ventana a Claude.) else (echo. & echo  Listo, subido. Netlify lo publica en un par de minutos.)
:fin
echo.
pause
