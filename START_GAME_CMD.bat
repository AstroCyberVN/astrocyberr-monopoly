@echo off
title AstroCyberr Monopoly - 3D Voxel Dev Server
cd /d "%~dp0"
echo Starting AstroCyberr Monopoly on http://localhost:5173 ...
start "" "http://localhost:5173"
npm run dev
pause
