-- Add forcePasswordChange to User.
-- Default 0 (false): existing users are not forced to change.
-- Application sets 1 (true) on CREATE and admin password reset.
ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT 0;
