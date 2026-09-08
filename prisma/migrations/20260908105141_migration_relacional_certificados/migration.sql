/*
  Warnings:

  - You are about to drop the column `certificadoId` on the `certificadoatributo` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `certificadoatributo` DROP FOREIGN KEY `CertificadoAtributo_certificadoId_fkey`;

-- AlterTable
ALTER TABLE `certificadoatributo` DROP COLUMN `certificadoId`;
