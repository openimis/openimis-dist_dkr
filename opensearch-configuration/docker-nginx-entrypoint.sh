#!/bin/sh
set -e

# Perform environment variable substitution
envsubst '$OPENSEARCH_BASIC_TOKEN' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start Nginx
exec nginx -g 'daemon off;'
