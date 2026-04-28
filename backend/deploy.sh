#!/bin/bash
cd /var/www/kayaCRM/backend
git pull origin master
npm install
pm2 restart all
