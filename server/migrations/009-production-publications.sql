ALTER TABLE hubpages_studio_publications DROP CONSTRAINT hubpages_studio_publications_mode_check;
ALTER TABLE hubpages_studio_publications ADD CHECK(mode IN ('dev-free','temporary-free'));
INSERT INTO hubpages_schema_migrations(version) VALUES(9);
