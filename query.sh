#!/bin/bash
# This script allows to execute query on docker db with syntax ```query.sh "select * from tblUsers"``` when sourced

if [ "$#" -ne 1 ]; then
    echo "Incorrect syntax, correct use: ./query.sh \"select * from tblUsers\""
else
    source .env
    docker-compose exec db /opt/mssql-tools/bin/sqlcmd -S localhost -U $DB_USER -P $DB_PASSWORD -Q "use $DB_NAME; $1"
fi
