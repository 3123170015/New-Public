CREATE TABLE `ApiKey` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `keyHash` VARCHAR(191) NOT NULL,
  `scopes` VARCHAR(191) NOT NULL DEFAULT '*',
  `allowedOrigins` TEXT NULL,
  `rateLimitPerMinute` INT NOT NULL DEFAULT 600,
  `rateLimitWindowSec` INT NOT NULL DEFAULT 60,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `lastUsedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `ApiKey_keyHash_key`(`keyHash`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
