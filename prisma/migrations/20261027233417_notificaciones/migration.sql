-- CreateTable
CREATE TABLE `Notificacion` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CASO_ROJO', 'VALIDACION_PENDIENTE', 'CASO_SIN_ATENDER') NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `cuerpo` TEXT NOT NULL,
    `enlace` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `leidaEn` DATETIME(3) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notificacion_usuarioId_leidaEn_idx`(`usuarioId`, `leidaEn`),
    UNIQUE INDEX `Notificacion_usuarioId_clave_key`(`usuarioId`, `clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuscripcionPush` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `p256dh` VARCHAR(191) NOT NULL,
    `auth` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SuscripcionPush_endpoint_key`(`endpoint`),
    INDEX `SuscripcionPush_usuarioId_idx`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notificacion` ADD CONSTRAINT `Notificacion_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionPush` ADD CONSTRAINT `SuscripcionPush_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

