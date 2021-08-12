# fortnitemetro
Fortnite statistic tracker - https://fortnite.gzalo.com/

## Basic installation (outdated)
- Run `php composer install` inside `app/`
- Manually patch Tustin/fortnite-php to https://github.com/TimVerheul/fortnite-php
- Define `GAME_USERNAME=...` and `GAME_PASSWORD=...` in .env
- Run `docker-compose up -d` to start the services
- Restore latest database backup using `restore-db.sh` script found in backups directory
- Add a line similar to `*/15 * * * * /path/to/fortnite/update.sh >/dev/null 2>&1` to your crontab
- Test the site in http://hostIP:1234
