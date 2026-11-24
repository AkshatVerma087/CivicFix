CREATE TABLE users (
    id         TEXT PRIMARY KEY,
    role       TEXT NOT NULL CHECK(role IN ('citizen', 'authority', 'admin')),
    name       TEXT NOT NULL DEFAULT '',
    email      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE UNIQUE INDEX users_email_key ON users (LOWER(email));
CREATE INDEX users_role_idx ON users (role);


CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();



-------------------------------------------------------------------------------------

CREATE TABLE citizen_profiles (
    user_id     TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    address     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TRIGGER set_updated_at BEFORE UPDATE ON citizen_profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();




---------------------------------------------------------------------------------------

CREATE TABLE authority_profiles (
    user_id     TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    phone       TEXT NOT NULL,
    department  TEXT NOT NULL CHECK (department IN ('water', 'electricity', 'road', 'sanitation', 'other')),
    zone        TEXT NOT NULL,                   -- ward or area
    latitude    DOUBLE PRECISION CHECK (latitude BETWEEN -90 AND 90),
    longitude   DOUBLE PRECISION CHECK (longitude BETWEEN -180 AND 180),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- a location is either fully set or not set at all
    CHECK ((latitude IS NULL) = (longitude IS NULL))
);


CREATE INDEX authority_profiles_department_zone_idx ON authority_profiles (department, zone);

CREATE TRIGGER set_updated_at BEFORE UPDATE ON authority_profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();






