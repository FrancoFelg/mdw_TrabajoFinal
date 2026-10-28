-- CreateTable
CREATE TABLE `EmergenciaAdjunto` (
    `id` VARCHAR(191) NOT NULL,
    `emergenciaId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('IMAGEN', 'AUDIO') NOT NULL,
    `mime` VARCHAR(191) NOT NULL,
    `tamano` INTEGER NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `duracionSegundos` INTEGER NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmergenciaAdjunto_clave_key`(`clave`),
    INDEX `EmergenciaAdjunto_emergenciaId_idx`(`emergenciaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmergenciaAdjunto` ADD CONSTRAINT `EmergenciaAdjunto_emergenciaId_fkey` FOREIGN KEY (`emergenciaId`) REFERENCES `Emergencia`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

