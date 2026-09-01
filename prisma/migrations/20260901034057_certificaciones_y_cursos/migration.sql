-- CreateTable
CREATE TABLE `Persona` (
    `id` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `fechaNac` DATETIME(3) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `nombreUsuario` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMIN', 'COORDINADOR', 'VOLUNTARIO') NOT NULL DEFAULT 'VOLUNTARIO',
    `personaId` VARCHAR(191) NOT NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuario_nombreUsuario_key`(`nombreUsuario`),
    UNIQUE INDEX `Usuario_personaId_key`(`personaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cursos` (
    `id` VARCHAR(191) NOT NULL,
    `titulo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `fechaDesde` DATETIME(3) NOT NULL,
    `fechaHasta` DATETIME(3) NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioCreacionId` VARCHAR(191) NOT NULL,
    `fechaEliminacion` DATETIME(3) NULL,
    `usuarioEliminacionId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CursosAtributos` (
    `id` VARCHAR(191) NOT NULL,
    `cursoId` VARCHAR(191) NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioCreacionId` VARCHAR(191) NOT NULL,
    `fechaEliminacion` DATETIME(3) NULL,
    `usuarioEliminacionId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CursosRelAtributos` (
    `id` VARCHAR(191) NOT NULL,
    `cursoId` VARCHAR(191) NOT NULL,
    `campoId` VARCHAR(191) NOT NULL,
    `dato` VARCHAR(191) NOT NULL,
    `fechaHasta` DATETIME(3) NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioCreacionId` VARCHAR(191) NOT NULL,
    `fechaEliminacion` DATETIME(3) NULL,
    `usuarioEliminacionId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Certificado` (
    `id` VARCHAR(191) NOT NULL,
    `cursoId` VARCHAR(191) NOT NULL,
    `estadoId` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `codigoVerificacion` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO', 'VENCIDO') NOT NULL,
    `fechaEmision` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioCreacionId` VARCHAR(191) NOT NULL,
    `fechaEliminacion` DATETIME(3) NULL,
    `usuarioEliminacionId` VARCHAR(191) NULL,

    UNIQUE INDEX `Certificado_codigoVerificacion_key`(`codigoVerificacion`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CertificadoAtributo` (
    `id` VARCHAR(191) NOT NULL,
    `certificadoId` VARCHAR(191) NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioCreacionId` VARCHAR(191) NOT NULL,
    `fechaEliminacion` DATETIME(3) NULL,
    `usuarioEliminacionId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CertificadosRelAtributos` (
    `id` VARCHAR(191) NOT NULL,
    `certificadoId` VARCHAR(191) NOT NULL,
    `campoId` VARCHAR(191) NOT NULL,
    `fechaHasta` DATETIME(3) NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioCreacionId` VARCHAR(191) NOT NULL,
    `fechaEliminacion` DATETIME(3) NULL,
    `usuarioEliminacionId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_personaId_fkey` FOREIGN KEY (`personaId`) REFERENCES `Persona`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cursos` ADD CONSTRAINT `Cursos_usuarioCreacionId_fkey` FOREIGN KEY (`usuarioCreacionId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cursos` ADD CONSTRAINT `Cursos_usuarioEliminacionId_fkey` FOREIGN KEY (`usuarioEliminacionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosAtributos` ADD CONSTRAINT `CursosAtributos_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosAtributos` ADD CONSTRAINT `CursosAtributos_usuarioCreacionId_fkey` FOREIGN KEY (`usuarioCreacionId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosAtributos` ADD CONSTRAINT `CursosAtributos_usuarioEliminacionId_fkey` FOREIGN KEY (`usuarioEliminacionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosRelAtributos` ADD CONSTRAINT `CursosRelAtributos_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosRelAtributos` ADD CONSTRAINT `CursosRelAtributos_campoId_fkey` FOREIGN KEY (`campoId`) REFERENCES `CursosAtributos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosRelAtributos` ADD CONSTRAINT `CursosRelAtributos_usuarioCreacionId_fkey` FOREIGN KEY (`usuarioCreacionId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CursosRelAtributos` ADD CONSTRAINT `CursosRelAtributos_usuarioEliminacionId_fkey` FOREIGN KEY (`usuarioEliminacionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `Cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_usuarioCreacionId_fkey` FOREIGN KEY (`usuarioCreacionId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Certificado` ADD CONSTRAINT `Certificado_usuarioEliminacionId_fkey` FOREIGN KEY (`usuarioEliminacionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadoAtributo` ADD CONSTRAINT `CertificadoAtributo_certificadoId_fkey` FOREIGN KEY (`certificadoId`) REFERENCES `Certificado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadoAtributo` ADD CONSTRAINT `CertificadoAtributo_usuarioCreacionId_fkey` FOREIGN KEY (`usuarioCreacionId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadoAtributo` ADD CONSTRAINT `CertificadoAtributo_usuarioEliminacionId_fkey` FOREIGN KEY (`usuarioEliminacionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadosRelAtributos` ADD CONSTRAINT `CertificadosRelAtributos_certificadoId_fkey` FOREIGN KEY (`certificadoId`) REFERENCES `Certificado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadosRelAtributos` ADD CONSTRAINT `CertificadosRelAtributos_campoId_fkey` FOREIGN KEY (`campoId`) REFERENCES `CertificadoAtributo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadosRelAtributos` ADD CONSTRAINT `CertificadosRelAtributos_usuarioCreacionId_fkey` FOREIGN KEY (`usuarioCreacionId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CertificadosRelAtributos` ADD CONSTRAINT `CertificadosRelAtributos_usuarioEliminacionId_fkey` FOREIGN KEY (`usuarioEliminacionId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
