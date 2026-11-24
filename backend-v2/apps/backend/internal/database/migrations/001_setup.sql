-- Shared trigger function: keeps updated_at current on every UPDATE.
-- Attach to a table with:
--   CREATE TRIGGER set_updated_at BEFORE UPDATE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---- create above / drop below ----

DROP FUNCTION IF EXISTS trigger_set_updated_at();
