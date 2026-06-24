-- Supports the internal-account administration list and active-admin safeguard.
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");
