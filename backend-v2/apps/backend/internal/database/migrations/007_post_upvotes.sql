-- One row = one user upvoted one post. The (post_id, user_id) primary key allows only one upvote per user per post.
CREATE TABLE post_upvotes (
    post_id    UUID NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- "all posts user Y upvoted" (the primary key starts with post_id, so it can't serve this)
CREATE INDEX post_upvotes_user_id_idx ON post_upvotes (user_id);

---- create above / drop below ----

DROP TABLE IF EXISTS post_upvotes;
