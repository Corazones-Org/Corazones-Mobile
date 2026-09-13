-- handle_new_user must only run as the auth.users trigger, never as a
-- directly-callable RPC (it would let any signed-in user re-run it).
-- Note: EXECUTE is granted to PUBLIC by default in Postgres, and anon/
-- authenticated inherit from it — revoking directly from those roles has
-- no effect while PUBLIC still grants it.
revoke execute on function handle_new_user() from public;
