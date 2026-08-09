/*
# Fix security warnings on trigger functions

1. Revoke EXECUTE on log_status_change() from anon and authenticated — it is a trigger function
   that should only be called internally by the trigger, not via the REST API.
2. Set explicit search_path on all trigger functions to remove the mutable search_path warning.
*/

REVOKE EXECUTE ON FUNCTION log_status_change() FROM anon, authenticated;

ALTER FUNCTION generate_ticket_id() SET search_path = public, pg_temp;
ALTER FUNCTION set_ticket_id() SET search_path = public, pg_temp;
ALTER FUNCTION update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION log_status_change() SET search_path = public, pg_temp;
