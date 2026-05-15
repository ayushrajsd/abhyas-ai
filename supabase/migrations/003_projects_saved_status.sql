-- Extend projects.status to allow 'saved' for bookmarked projects
alter table projects
  drop constraint if exists projects_status_check;

alter table projects
  add constraint projects_status_check
    check (status in ('active', 'complete', 'paused', 'saved'));
