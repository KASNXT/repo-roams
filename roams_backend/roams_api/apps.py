from django.apps import AppConfig


class RoamsApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'roams_api'
    
    def ready(self):
        import roams_api.signals  # ensure signals are loaded