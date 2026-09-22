-- Sincroniza `certificado` con prisma/schema.prisma.
--
-- `estadoId` quedó de la migración 20260901034057 (diseño anterior con tabla
-- de estados) y nunca se eliminó cuando `estado` pasó a ser un enum. El
-- modelo no lo tiene. Además, el enum `estado` no tenía el DEFAULT que
-- declara el schema. El job "Migraciones vs schema" del CI fallaba por esto
-- desde su primera corrida.
--
-- Seguro en prod: la tabla `certificado` no tiene filas al 2026-09-22.

-- AlterTable
ALTER TABLE `certificado` DROP COLUMN `estadoId`,
    MODIFY `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'VENCIDO') NOT NULL DEFAULT 'PENDIENTE';
