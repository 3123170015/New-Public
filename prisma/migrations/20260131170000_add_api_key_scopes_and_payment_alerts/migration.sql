ALTER TABLE `ApiKey`
  ADD COLUMN `strictScopes` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `description` TEXT NULL;

ALTER TABLE `PaymentConfig`
  ADD COLUMN `depositMemoFormat` VARCHAR(191) NOT NULL DEFAULT 'DEPOSIT:{depositId}',
  ADD COLUMN `telegramBotToken` TEXT NULL,
  ADD COLUMN `telegramChatId` TEXT NULL,
  ADD COLUMN `confirmationsJson` TEXT NOT NULL DEFAULT '{\"ETHEREUM\":12,\"POLYGON\":10,\"BSC\":5,\"BASE\":12,\"SOLANA\":32,\"TRON\":20}',
  ADD COLUMN `deadmanMinutes` INT NOT NULL DEFAULT 30;
