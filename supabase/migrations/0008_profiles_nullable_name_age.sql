-- name/age start empty (incomplete profile) and are filled in by the user
-- later (COR-4). Auto-provisioning the row on signup (COR-3) needs both
-- columns to accept no value until then.
alter table profiles alter column name drop not null;
alter table profiles alter column age drop not null;
