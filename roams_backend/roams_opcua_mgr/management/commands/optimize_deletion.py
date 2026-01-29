"""
Management command to optimize database for deletions.
Checks and reports potential issues with deletion performance.
"""

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Optimize database for efficient client config deletion'

    def handle(self, *args, **options):
        self.stdout.write("Checking for deletion optimization opportunities...\n")
        
        with connection.cursor() as cursor:
            # Check for indexes on foreign keys
            self.stdout.write(self.style.WARNING("Checking foreign key indexes..."))
            
            cursor.execute("""
                SELECT 
                    t.tablename,
                    ix.indexname,
                    ix.indexdef
                FROM pg_indexes ix
                JOIN pg_tables t ON ix.schemaname = t.schemaname AND ix.tablename = t.tablename
                WHERE ix.tablename IN (
                    'roams_opcua_mgr_authenticationsetting',
                    'roams_opcua_mgr_opcuanode'
                )
                ORDER BY t.tablename, ix.indexname
            """)
            
            results = cursor.fetchall()
            if results:
                self.stdout.write(self.style.SUCCESS("Existing indexes:"))
                for row in results:
                    self.stdout.write(f"  Table: {row[0]}, Index: {row[1]}")
            else:
                self.stdout.write(self.style.WARNING("No indexes found"))
            
            # Create missing indexes if needed
            self.stdout.write("\nEnsuring optimal indexes exist...")
            
            try:
                # Index on foreign key for AuthenticationSetting
                cursor.execute("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS
                    idx_auth_setting_client_config
                    ON roams_opcua_mgr_authenticationsetting(client_config_id)
                """)
                self.stdout.write(self.style.SUCCESS("Created index on authenticationsetting.client_config_id"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not create index: {e}"))
            
            try:
                # Index on foreign key for OPCUANode
                cursor.execute("""
                    CREATE INDEX CONCURRENTLY IF NOT EXISTS
                    idx_opcua_node_client_config
                    ON roams_opcua_mgr_opcuanode(client_config_id)
                """)
                self.stdout.write(self.style.SUCCESS("Created index on opcuanode.client_config_id"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not create index: {e}"))
            
            try:
                # Index on node_id for various tables
                for table in ["roams_opcua_mgr_thresholdbreach", 
                              "roams_opcua_mgr_alarmlog"]:
                    cursor.execute(f"""
                        CREATE INDEX CONCURRENTLY IF NOT EXISTS
                        idx_{table.split('_')[-1]}_node_id
                        ON {table}(node_id)
                    """)
                self.stdout.write(self.style.SUCCESS(f"Created indexes on node_id for related tables"))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not create indexes: {e}"))
        
        self.stdout.write(self.style.SUCCESS("\nDatabase optimization complete!"))
