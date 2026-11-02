-- "check" sources: permission pending. Their ratings are stored admin-only
-- to compare against ours; they never count toward a rating or reach users.
alter table trusted_sources drop constraint trusted_sources_use_as_check;
alter table trusted_sources
  add constraint trusted_sources_use_as_check check (use_as in ('data', 'reference', 'check'));
