#!/bin/bash
# Render startup script
cd /opt/render/project/src/social_os_backend-main
export PYTHONPATH=/opt/render/project/src/social_os_backend-main:$PYTHONPATH
exec gunicorn wsgi:app -c gunicorn.conf.py
