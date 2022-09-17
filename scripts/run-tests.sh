#!/bin/bash

docker-compose -f ./scripts/docker-compose.yml down

if [ $1 != "better_sqlite" ] && [ $1 != "sqlite" ]; then
    docker-compose -f ./scripts/docker-compose.yml up -d $1
fi

DB=$1 FORCE_COLOR=true node -r @adonisjs/require-ts/build/register ./bin/test.ts
