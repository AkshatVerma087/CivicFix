-- A comment on a post. Comments can't be edited, so there is no updated_at.
CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('citizen', 'authority', 'admin')),
    text       TEXT NOT NULL CHECK (LENGTH(text) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- "all comments of post X, oldest first"
CREATE INDEX comments_post_id_created_at_idx ON comments (post_id, created_at);

---- create above / drop below ----

DROP TABLE IF EXISTS comments;
