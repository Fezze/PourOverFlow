@echo off
node scripts\version-proxy.mjs commit
exit /b %errorlevel%
