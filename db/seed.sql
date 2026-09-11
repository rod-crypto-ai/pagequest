INSERT INTO organizations (id, type, name, settings_json, created_at, updated_at)
VALUES ('org_demo_family', 'family', 'Maya Demo Family', '{}', unixepoch(), unixepoch());

INSERT INTO users (id, organization_id, role, display_name, email, settings_json, created_at, updated_at)
VALUES
  ('user_demo_parent', 'org_demo_family', 'parent', 'Jordan', 'parent@example.invalid', '{}', unixepoch(), unixepoch()),
  ('user_demo_student', 'org_demo_family', 'student', 'Maya', NULL, '{"avatar":"fox"}', unixepoch(), unixepoch());

INSERT INTO student_guardian_links (id, student_id, guardian_id, status, consent_recorded_at, created_at, updated_at)
VALUES ('link_demo_family', 'user_demo_student', 'user_demo_parent', 'active', unixepoch(), unixepoch(), unixepoch());

INSERT INTO books (id, isbn13, title, authors_json, cover_url, publication_year, page_count, metadata_json, created_at, updated_at)
VALUES ('book_moonlit_map', '9780000000001', 'The Moonlit Map', '["Elena Brooks"]', '/assets/moonlit-map-cover.webp', 2026, 144, '{"demo":true}', unixepoch(), unixepoch());

INSERT INTO quiz_sources (id, book_id, organization_id, source_type, content_hash, sufficiency_status, created_by, created_at, updated_at)
VALUES ('source_moonlit_notes', 'book_moonlit_map', 'org_demo_family', 'teacher_notes', 'demo-source-v1', 'sufficient', 'user_demo_parent', unixepoch(), unixepoch());

INSERT INTO quizzes (id, book_id, source_id, organization_id, version, status, grade_band, model, prompt_version, approved_by, approved_at, created_at, updated_at)
VALUES ('quiz_moonlit_v1', 'book_moonlit_map', 'source_moonlit_notes', 'org_demo_family', 1, 'approved', '3-5', NULL, 'seed-v1', 'user_demo_parent', unixepoch(), unixepoch(), unixepoch());

INSERT INTO questions (id, quiz_id, position, prompt, choices_json, correct_index, skill, rationale, source_reference, confidence, visual_json, created_at, updated_at)
VALUES
  ('question_moonlit_1', 'quiz_moonlit_v1', 1, 'Why does Leo ask Nora to join him after he finds the map?', '["She owns a brighter lantern.","She understands maps and he trusts her judgment.","She has already visited the observatory.","She dares him to enter the forest."]', 1, 'character', 'Leo trusts Nora’s map-reading ability.', 'Teacher notes, chapter 2', 0.96, NULL, unixepoch(), unixepoch()),
  ('question_moonlit_2', 'quiz_moonlit_v1', 2, 'What happens immediately before Leo and Nora enter the forest?', '["They climb the observatory stairs.","They hide the map under the table.","They pack a lantern and share their plan.","They watch the sunrise from the hill."]', 2, 'sequence', 'The preparations happen before the forest journey.', 'Teacher notes, chapter 3', 0.95, NULL, unixepoch(), unixepoch());

INSERT INTO goals (id, user_id, period_type, starts_at, ends_at, target_points, created_at, updated_at)
VALUES ('goal_demo_september', 'user_demo_student', 'month', unixepoch('2026-09-01'), unixepoch('2026-10-01'), 20, unixepoch(), unixepoch());
