#!/bin/bash
cd /mnt/d/DJANGO_PROJECTS/roams_b/roams_backend
source venv_new/bin/activate
export PYTHONUNBUFFERED=1
python manage.py runserver 0.0.0.0:8000 --nothreading --noreload
