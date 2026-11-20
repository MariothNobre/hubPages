-- One current asset per slot. Historical publication documents remain immutable.
ALTER TABLE hubpages_studio_images DROP CONSTRAINT hubpages_studio_images_mime_check;
ALTER TABLE hubpages_studio_images DROP CONSTRAINT hubpages_studio_images_content_check;
ALTER TABLE hubpages_studio_images ADD CHECK(mime IN ('image/png','image/jpeg','image/webp','video/mp4','video/webm'));
ALTER TABLE hubpages_studio_images ADD CHECK(octet_length(content)<=CASE WHEN mime LIKE 'video/%' THEN 26214400 ELSE 2097152 END);
ALTER TABLE hubpages_studio_publication_images DROP CONSTRAINT hubpages_studio_publication_images_mime_check;
ALTER TABLE hubpages_studio_publication_images DROP CONSTRAINT hubpages_studio_publication_images_content_check;
ALTER TABLE hubpages_studio_publication_images ADD CHECK(mime IN ('image/png','image/jpeg','image/webp','video/mp4','video/webm'));
ALTER TABLE hubpages_studio_publication_images ADD CHECK(octet_length(content)<=CASE WHEN mime LIKE 'video/%' THEN 26214400 ELSE 2097152 END);
CREATE OR REPLACE FUNCTION hubpages_keep_studio_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; row_page text;
BEGIN
  IF TG_OP='DELETE' AND TG_TABLE_NAME='hubpages_studio_publication_images' THEN
    SELECT page_id::text INTO row_page FROM hubpages_studio_publications WHERE id=OLD.publication_id;
    IF row_page=current_setting('hubpages.media_prune_page',true) THEN RETURN OLD; END IF;
  END IF;
  target:=current_setting('hubpages.purge_page',true);
  IF TG_OP='DELETE' AND COALESCE(target,'')<>'' THEN
    IF TG_TABLE_NAME='hubpages_studio_publication_images' THEN
      SELECT page_id::text INTO row_page FROM hubpages_studio_publications WHERE id=OLD.publication_id;
    ELSE row_page:=OLD.page_id::text;
    END IF;
    IF row_page=target THEN RETURN OLD; END IF;
  END IF;
  RAISE EXCEPTION 'Studio history is append-only';
END $$;
INSERT INTO hubpages_schema_migrations(version) VALUES(7);
