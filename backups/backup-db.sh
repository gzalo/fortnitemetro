#!/bin/sh

docker exec -it fortnite_influxdb_1 influxd backup -database fortnite -portable /var/lib/influxdb_backup_latest

docker cp fortnite_influxdb_1:/var/lib/influxdb_backup_latest ./
