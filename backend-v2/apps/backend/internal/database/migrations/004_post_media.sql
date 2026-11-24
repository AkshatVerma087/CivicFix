-- One row per image or video attached to a post (Cloudinary metadata).
CREATE TABLE post_media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id       UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    kind          TEXT NOT NULL CHECK (kind IN ('image', 'video')),
    position      INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    url           TEXT NOT NULL,
    public_id     TEXT,
    resource_type TEXT CHECK (resource_type IN ('image', 'video')),
    format        TEXT,
    bytes         BIGINT CHECK (bytes >= 0),
    duration      DOUBLE PRECISION CHECK (duration >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- a post's media keep a stable order; this also indexes post_id for "all media of post X"
    UNIQUE (post_id, position)
);

---- create above / drop below ----

DROP TABLE IF EXISTS post_media;
