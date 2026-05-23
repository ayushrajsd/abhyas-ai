-- 006_task_unique_constraint.sql
-- Safety net: prevent double-generation from inserting duplicate tasks.
-- A milestone can only have one task at each order_index position.
-- The server-side guard (count check) handles the normal case;
-- this constraint catches the Strict Mode / concurrent-request race.

alter table public.tasks
  add constraint tasks_milestone_order_unique unique (milestone_id, order_index);
