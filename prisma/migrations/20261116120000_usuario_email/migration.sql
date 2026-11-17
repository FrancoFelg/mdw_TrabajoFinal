ALTER TABLE `Usuario` ADD COLUMN `email` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Usuario_email_key` ON `Usuario`(`email`);
