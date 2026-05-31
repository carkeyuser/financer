#!/bin/sh
set -e
cd /app
./node_modules/.bin/prisma db push
exec node server.js
