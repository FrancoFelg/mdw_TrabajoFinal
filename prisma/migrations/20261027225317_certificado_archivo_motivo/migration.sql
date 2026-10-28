-- AlterTable
ALTER TABLE `certificado` ADD COLUMN `archivoClave` VARCHAR(191) NULL,
    ADD COLUMN `archivoMime` VARCHAR(191) NULL,
    ADD COLUMN `archivoTamano` INTEGER NULL,
    ADD COLUMN `motivoRechazo` TEXT NULL;

