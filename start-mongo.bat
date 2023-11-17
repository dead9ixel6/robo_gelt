@echo off
SET "MONGO_PATH=C:\Program Files\MongoDB\Server\6.0\bin"

FOR /F "tokens=*" %%i IN ('tasklist ^| findstr mongod.exe') DO SET Process=%%i
IF NOT DEFINED Process (
    echo Starting MongoDB...
    START "" "%MONGO_PATH%\mongod.exe"
) ELSE (
    echo MongoDB is already running.
)
