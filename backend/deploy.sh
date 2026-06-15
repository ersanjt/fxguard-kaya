#!/bin/bash
cd /var/www/fxguard-kaya/backend
git pull origin master
npm install
pm2 restart all
