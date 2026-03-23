-- Ensure oauth_states can be securely written by the browser before OAuth redirect
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'oauth_states'
      AND policyname = 'Allow anon insert oauth states'
  ) THEN
    CREATE POLICY "Allow anon insert oauth states"
    ON public.oauth_states
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
      state IS NOT NULL
      AND char_length(state) BETWEEN 16 AND 128
      AND code_verifier IS NOT NULL
      AND char_length(code_verifier) BETWEEN 43 AND 128
      AND expires_at > now()
      AND expires_at <= now() + interval '10 minutes'
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_oauth_states_state_active
ON public.oauth_states(state, expires_at)
WHERE used_at IS NULL;