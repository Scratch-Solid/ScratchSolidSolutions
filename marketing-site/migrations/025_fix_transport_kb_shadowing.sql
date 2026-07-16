-- 024_ai_kb_transport_digital.sql gave the general "Do you offer
-- transportation services" entry keywords that literally duplicate its own
-- sibling entries' distinguishing phrases ("personal transport", "corporate
-- transport", plus bare "transport"). Because keyword scoring in
-- src/app/api/chatbot/route.ts weights exact/substring keyword hits heavily,
-- that made the general entry out-score "What is personal transport", "What
-- is corporate transport" and "When does transportation launch" on their own
-- exact question text - those three entries never actually surfaced.
-- Verified on staging after 024: querying "What is corporate transport" and
-- "When does transportation launch" both returned the generic answer
-- instead of the specific one.
--
-- Trims the general entry's keywords down to non-overlapping terms so the
-- more specific entries can win on their own distinguishing phrases.
UPDATE ai_responses
SET keywords = 'transportation,ride,lift,shuttle,driver,cab,launching,coming soon,when transport,do you have transport',
    updated_at = datetime('now')
WHERE question = 'Do you offer transportation services';
