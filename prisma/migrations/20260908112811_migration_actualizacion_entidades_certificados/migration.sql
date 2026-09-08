/*
  Warnings:

  - Added the required column `nombre` to the `CertificadoAtributo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `valor` to the `CertificadosRelAtributos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `certificadoatributo` ADD COLUMN `nombre` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `certificadosrelatributos` ADD COLUMN `valor` VARCHAR(191) NOT NULL;
