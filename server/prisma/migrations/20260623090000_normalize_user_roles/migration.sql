-- Preserve existing local users while aligning persisted role values with the production enums.
-- The public API still serializes roles as lowercase for frontend compatibility.
UPDATE "User"
SET "role" = CASE lower("role")
  WHEN 'admin' THEN 'ADMIN'
  WHEN 'sales' THEN 'SALES'
  WHEN 'supervisor' THEN 'SUPERVISOR'
  ELSE 'CLIENT'
END;
