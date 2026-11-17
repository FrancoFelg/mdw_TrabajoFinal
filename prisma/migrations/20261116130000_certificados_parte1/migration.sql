-- Parte 1 de certificados (docs/superpowers/specs/2026-11-16-cursos-certificados-design.md §5.1),
-- integrada sobre 20261116060000_informes_y_archivos_certificados (que ya creó `motivoRechazo` y `archivo`).
--
-- Segura con filas existentes: las columnas obligatorias nuevas se agregan con un valor provisorio,
-- se completan y después se les quita el default para que coincidan con el schema.
-- Los archivos ya subidos siguen en CERTIFICATE_UPLOAD_DIR/<id>.documento; la ruta de descarga
-- es fija (/api/certificados/:id/archivo), por eso la columna `archivo` deja de hacer falta.

-- Sin vencimiento: ningún código asignaba VENCIDO, pero por las dudas no se pierde la fila.
UPDATE `Certificado` SET `estado` = 'RECHAZADO' WHERE `estado` = 'VENCIDO';

-- DropIndex
DROP INDEX `Certificado_codigoVerificacion_key` ON `Certificado`;

-- AlterTable
ALTER TABLE `Certificado` DROP COLUMN `archivo`,
    ADD COLUMN `archivoNombre` VARCHAR(191) NOT NULL DEFAULT 'certificado',
    ADD COLUMN `archivoTipo` VARCHAR(191) NOT NULL DEFAULT 'application/octet-stream',
    ADD COLUMN `entidadEmisora` VARCHAR(191) NOT NULL DEFAULT 'Sin especificar',
    ADD COLUMN `fechaActualizacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `fechaRevision` DATETIME(3) NULL,
    ADD COLUMN `nombre` VARCHAR(191) NOT NULL DEFAULT 'Certificado',
    ADD COLUMN `usuarioRevisionId` VARCHAR(191) NULL,
    MODIFY `codigoVerificacion` VARCHAR(191) NULL,
    MODIFY `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    ALTER COLUMN `fechaEmision` DROP DEFAULT;

-- Certificados cargados antes: el código era lo único que los identificaba.
UPDATE `Certificado` SET `nombre` = `codigoVerificacion` WHERE `codigoVerificacion` IS NOT NULL;

ALTER TABLE `Certificado` ALTER COLUMN `archivoNombre` DROP DEFAULT,
    ALTER COLUMN `archivoTipo` DROP DEFAULT,
    ALTER COLUMN `entidadEmisora` DROP DEFAULT,
    ALTER COLUMN `fechaActualizacion` DROP DEFAULT,
    ALTER COLUMN `nombre` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `Certificado_usuarioRevisionId_idx` ON `Certificado`(`usuarioRevisionId`);

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_usuarioRevisionId_fkey` FOREIGN KEY (`usuarioRevisionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
