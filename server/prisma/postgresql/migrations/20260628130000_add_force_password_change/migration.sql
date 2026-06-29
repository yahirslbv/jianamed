-- Add forcePasswordChange to User.
-- Default false: existing users are not forced to change.
-- Application sets true on CREATE and admin password reset.
ALTER TABLE "User" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
