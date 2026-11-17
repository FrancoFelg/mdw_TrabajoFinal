-- Parte 1 de certificados (docs/superpowers/specs/2026-11-16-cursos-certificados-design.md §5.1).
-- REQUIERE la tabla `certificado` vacía: las columnas nuevas NOT NULL no tienen default y, según el
-- sql_mode, MySQL podría completar filas existentes con '' en lugar de fallar.
-- Antes de aplicar en prod: SELECT COUNT(*) FROM certificado;  -> debe dar 0.
-- Generada con prisma migrate diff (sin DB local).

-- DropIndex
DROP INDEX `Certificado_codigoVerificacion_key` ON `Certificado`;

-- AlterTable
ALTER TABLE `Certificado` ADD COLUMN `archivoNombre` VARCHAR(191) NOT NULL,
    ADD COLUMN `archivoTipo` VARCHAR(191) NOT NULL,
    ADD COLUMN `entidadEmisora` VARCHAR(191) NOT NULL,
    ADD COLUMN `fechaActualizacion` DATETIME(3) NOT NULL,
    ADD COLUMN `fechaRevision` DATETIME(3) NULL,
    ADD COLUMN `motivoRechazo` TEXT NULL,
    ADD COLUMN `nombre` VARCHAR(191) NOT NULL,
    ADD COLUMN `usuarioRevisionId` VARCHAR(191) NULL,
    MODIFY `codigoVerificacion` VARCHAR(191) NULL,
    MODIFY `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    ALTER COLUMN `fechaEmision` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `Certificado_usuarioRevisionId_idx` ON `Certificado`(`usuarioRevisionId`);

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_usuarioRevisionId_fkey` FOREIGN KEY (`usuarioRevisionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

