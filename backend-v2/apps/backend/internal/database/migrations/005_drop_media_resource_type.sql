-- kind already says image or video; resource_type stored the same fact twice.
ALTER TABLE post_media DROP COLUMN resource_type;

---- create above / drop below ----

ALTER TABLE post_media ADD COLUMN resource_type TEXT CHECK (resource_type IN ('image', 'video'));
