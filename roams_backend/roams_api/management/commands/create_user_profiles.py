from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from roams_api.models import UserProfile


class Command(BaseCommand):
    help = 'Create UserProfile objects for all existing users'

    def handle(self, *args, **options):
        created_count = 0
        existing_count = 0

        for user in User.objects.all():
            profile, was_created = UserProfile.objects.get_or_create(user=user)
            if was_created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created profile for user: {user.username}')
                )
            else:
                existing_count += 1
                self.stdout.write(
                    self.style.WARNING(f'- Profile already exists for user: {user.username}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSummary: {created_count} profiles created, {existing_count} already existing'
            )
        )
