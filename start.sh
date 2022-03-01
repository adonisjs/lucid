#!/bin/bash

/wait-for-it.sh mysql_legacy:3306 && /wait-for-it.sh mysql_replica_1:3306 && /wait-for-it.sh mysql_replica_2:3306 && /wait-for-it.sh mysql:3306 && /wait-for-it.sh pg:5432 && /wait-for-it.sh microsoftsql:1433 && npm run test:docker
