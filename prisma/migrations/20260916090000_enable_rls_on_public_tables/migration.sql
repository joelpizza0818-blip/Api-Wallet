-- Enable Row Level Security on every application table exposed through the
-- public schema.  Policies are intentionally managed by the API layer: the
-- server connects with its private database connection and remains the sole
-- data access path for the application.
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      table_record.schemaname,
      table_record.tablename
    );
  END LOOP;
END
$$;
