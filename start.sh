#!/bin/bash

/wait-for-it.sh -t 30 mysql_legacy:3306 && /wait-for-it.sh  -t 30 mysql_replica_1:3306 && /wait-for-it.sh -t 30 mysql_replica_2:3306 && /wait-for-it.sh -t 30 mysql:3306 && /wait-for-it.sh -t 30 pg:5432 && /wait-for-it.sh -t 30 microsoftsql:1433 && npm run test:docker
