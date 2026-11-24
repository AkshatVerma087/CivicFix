-- An issue reported by a citizen. Photos/videos live in post_media; upvotes and comments get their own tables later.
CREATE TABLE posts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    citizen_id               TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title                    TEXT NOT NULL,
    description              TEXT NOT NULL,
    category                 TEXT NOT NULL CHECK (category IN ('water', 'electricity', 'road', 'sanitation', 'other')),
    latitude                 DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude                DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    status                   TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'inProgress', 'pendingResolution', 'resolved')),
    severity                 TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
    location_priority        INTEGER NOT NULL DEFAULT 0 CHECK (location_priority BETWEEN 0 AND 10),
    priority_score           DOUBLE PRECISION NOT NULL DEFAULT 0,
    upvotes                  INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
    status_note              TEXT NOT NULL DEFAULT '' CHECK (LENGTH(status_note) <= 500),
    assigned_to              TEXT REFERENCES users (id) ON DELETE SET NULL,
    resolved_by_authority_at TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columns the list pages filter or sort by
CREATE INDEX posts_citizen_id_idx ON posts (citizen_id);
CREATE INDEX posts_assigned_to_idx ON posts (assigned_to);
CREATE INDEX posts_status_idx ON posts (status);
CREATE INDEX posts_category_idx ON posts (category);
CREATE INDEX posts_priority_score_idx ON posts (priority_score DESC);
CREATE INDEX posts_created_at_idx ON posts (created_at DESC);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

---- create above / drop below ----

DROP TABLE IF EXISTS posts;
