-- One row per notification shown in a user's bell. Only is_read ever changes, so there is no updated_at.
CREATE TABLE notifications (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id   TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('citizen', 'authority', 'admin')),
    type           TEXT NOT NULL CHECK (type IN ('status-update', 'new-comment', 'resolution-confirmation', 'auto-resolved', 'assigned')),
    title          TEXT NOT NULL CHECK (LENGTH(title) BETWEEN 1 AND 200),
    message        TEXT NOT NULL,
    -- nullable: some notifications aren't about a post, and "auto-resolved" must survive the post's deletion
    post_id        UUID REFERENCES posts (id) ON DELETE SET NULL,
    is_read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- the bell: "this user's notifications, newest first"
CREATE INDEX notifications_recipient_id_created_at_idx ON notifications (recipient_id, created_at DESC);

---- create above / drop below ----

DROP TABLE IF EXISTS notifications;
