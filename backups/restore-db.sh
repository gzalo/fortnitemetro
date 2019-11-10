#!/bin/sh

docker cp influxdb_backup_latest fortnite_influxdb_1:/var/lib/

docker exec -it fortnite_influxdb_1 influxd restore -portable -database fortnite /var/lib/influxdb_backup_latest
