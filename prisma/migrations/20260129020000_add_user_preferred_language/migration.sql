-- Add preferred language for UI (default vi)
ALTER TABLE `User` ADD COLUMN `preferredLanguage` VARCHAR(191) NOT NULL DEFAULT 'vi';
