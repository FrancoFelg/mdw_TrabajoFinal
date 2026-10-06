-- DropForeignKey
ALTER TABLE `certificado` DROP FOREIGN KEY `Certificado_cursoId_fkey`;

-- AlterTable
ALTER TABLE `certificado` MODIFY `cursoId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Cursos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
