/*
  Sincroniza la DB con prisma/schema.prisma. Entre la migración 20260908112811 y este
  commit se mergearon cambios de schema sin migración (CRUD cursos, SolicitudAscenso,
  rename valor->dato en CertificadosRelAtributos, índices y enums de tipo).

  Generada con: prisma migrate diff --from-schema-datamodel <schema@de6feed> --to-schema-datamodel prisma/schema.prisma --script

  Warnings:
  - En una DB CON DATOS puede fallar: agrega columnas NOT NULL sin default e índices
    únicos sobre `nombre`. En prod la DB arranca vacía. En dev, si tenés datos, usá
    `prisma migrate reset`.
*/

-- DropForeignKey
ALTER TABLE `CursosAtributos` DROP FOREIGN KEY `CursosAtributos_cursoId_fkey`;

-- DropForeignKey
ALTER TABLE `Certificado` DROP FOREIGN KEY `Certificado_cursoId_fkey`;

-- AlterTable
ALTER TABLE `CursosAtributos` DROP COLUMN `cursoId`,
    ADD COLUMN `nombre` VARCHAR(191) NOT NULL,
    ADD COLUMN `tipo` ENUM('TEXTO', 'NUMERO', 'FECHA', 'BOOLEANO') NOT NULL DEFAULT 'TEXTO';

-- AlterTable
ALTER TABLE `CursosRelAtributos` MODIFY `fechaHasta` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Certificado` MODIFY `cursoId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `CertificadoAtributo` ADD COLUMN `tipo` ENUM('TEXTO', 'NUMERO', 'FECHA', 'BOOLEANO') NOT NULL DEFAULT 'TEXTO';

-- AlterTable
ALTER TABLE `CertificadosRelAtributos` DROP COLUMN `valor`,
    ADD COLUMN `dato` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `SolicitudAscenso` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `CursosAtributos_nombre_key` ON `CursosAtributos`(`nombre`);

-- CreateIndex
CREATE INDEX `CursosRelAtributos_campoId_idx` ON `CursosRelAtributos`(`campoId`);

-- CreateIndex
CREATE UNIQUE INDEX `CursosRelAtributos_cursoId_campoId_key` ON `CursosRelAtributos`(`cursoId`, `campoId`);

-- CreateIndex
CREATE INDEX `Certificado_cursoId_idx` ON `Certificado`(`cursoId`);

-- CreateIndex
CREATE INDEX `Certificado_usuarioId_idx` ON `Certificado`(`usuarioId`);

-- CreateIndex
CREATE UNIQUE INDEX `CertificadoAtributo_nombre_key` ON `CertificadoAtributo`(`nombre`);

-- CreateIndex
CREATE INDEX `CertificadosRelAtributos_campoId_idx` ON `CertificadosRelAtributos`(`campoId`);

-- CreateIndex
CREATE UNIQUE INDEX `CertificadosRelAtributos_certificadoId_campoId_key` ON `CertificadosRelAtributos`(`certificadoId`, `campoId`);

-- CreateIndex
CREATE INDEX `Emergencia_ubicacionId_idx` ON `Emergencia`(`ubicacionId`);

-- CreateIndex
CREATE INDEX `UsuarioEmergencia_emergenciaId_idx` ON `UsuarioEmergencia`(`emergenciaId`);

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitudAscenso` ADD CONSTRAINT `SolicitudAscenso_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

