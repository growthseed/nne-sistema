-- Rate limit counters para edge functions
-- Usado por _shared/rateLimit.ts (verify-turnstile, save-public-cadastro)

CREATE TABLE IF NOT EXISTS rate_limit_counters (
  ip       TEXT        NOT NULL,
  endpoint TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count    INTEGER     NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, endpoint, window_start)
);

-- Nenhuma linha visível via anon/authenticated — somente service_role escreve
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Incremento atômico via upsert (evita race condition no contador)
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_ip          TEXT,
  p_endpoint    TEXT,
  p_window_start TIMESTAMPTZ,
  p_window_sec  INTEGER DEFAULT 60
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Limpeza probabilística de janelas expiradas (~1% das chamadas)
  IF random() < 0.01 THEN
    DELETE FROM rate_limit_counters
    WHERE window_start < NOW() - (p_window_sec * 4 || ' seconds')::INTERVAL;
  END IF;

  INSERT INTO rate_limit_counters (ip, endpoint, window_start, count)
  VALUES (p_ip, p_endpoint, p_window_start, 1)
  ON CONFLICT (ip, endpoint, window_start)
  DO UPDATE SET count = rate_limit_counters.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_rate_limit TO service_role;
