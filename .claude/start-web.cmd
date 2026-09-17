@echo off
set NODE_EXTRA_CA_CERTS=C:\ProgramData\Avast Software\Avast\wscert.pem
set NODE_USE_SYSTEM_CA=1
npm run server
