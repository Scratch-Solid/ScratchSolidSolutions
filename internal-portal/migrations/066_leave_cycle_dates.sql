-- leave_requests/leave_balances (migration 005) were created but never wired
-- to any API or UI - adding the cycle-period columns needed to show staff
-- when their current sick/annual leave cycle started and ends.
ALTER TABLE leave_balances ADD COLUMN cycle_start_date TEXT;
ALTER TABLE leave_balances ADD COLUMN cycle_end_date TEXT;
