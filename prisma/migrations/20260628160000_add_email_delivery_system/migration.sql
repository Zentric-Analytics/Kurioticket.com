CREATE TABLE IF NOT EXISTS email_deliveries (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT UNIQUE,
  idempotency_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_error_status INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_deliveries_to_email_idx ON email_deliveries (to_email);
CREATE INDEX IF NOT EXISTS email_deliveries_template_idx ON email_deliveries (template);
CREATE INDEX IF NOT EXISTS email_deliveries_status_idx ON email_deliveries (status);
CREATE INDEX IF NOT EXISTS email_deliveries_created_at_idx ON email_deliveries (created_at);
CREATE INDEX IF NOT EXISTS email_deliveries_provider_message_id_idx ON email_deliveries (provider_message_id);

CREATE TABLE IF NOT EXISTS email_events (
  id TEXT PRIMARY KEY,
  delivery_id TEXT REFERENCES email_deliveries(id) ON DELETE SET NULL,
  provider_event_id TEXT UNIQUE,
  provider_message_id TEXT,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_events_delivery_id_idx ON email_events (delivery_id);
CREATE INDEX IF NOT EXISTS email_events_provider_message_id_idx ON email_events (provider_message_id);
CREATE INDEX IF NOT EXISTS email_events_type_idx ON email_events (type);
CREATE INDEX IF NOT EXISTS email_events_created_at_idx ON email_events (created_at);

CREATE TABLE IF NOT EXISTS email_suppressions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  provider_message_id TEXT,
  last_event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_suppressions_reason_idx ON email_suppressions (reason);
CREATE INDEX IF NOT EXISTS email_suppressions_created_at_idx ON email_suppressions (created_at);
