-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(36) NOT NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `username` VARCHAR(64) NOT NULL,
    `passwordHash` VARCHAR(100) NOT NULL,
    `role` ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(36) NOT NULL,
    `userId` VARCHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `key` CHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 1,
    `resetAt` DATETIME(3) NOT NULL,

    INDEX `LoginAttempt_resetAt_idx`(`resetAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(36) NULL,
    `action` VARCHAR(40) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `beforeData` JSON NULL,
    `afterData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entityType_entityId_createdAt_idx`(`entityType`, `entityId`, `createdAt`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RealtimeEvent` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `eventType` VARCHAR(40) NOT NULL,
    `entityType` VARCHAR(40) NOT NULL,
    `entityId` VARCHAR(64) NOT NULL,
    `payload` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RealtimeEvent_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventSequence` (
    `id` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ErpRecord` (
    `id` VARCHAR(36) NOT NULL,
    `module` VARCHAR(24) NOT NULL,
    `date` DATE NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(36) NOT NULL,
    `updatedById` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ErpRecord_module_isActive_date_idx`(`module`, `isActive`, `date`),
    INDEX `ErpRecord_createdById_idx`(`createdById`),
    INDEX `ErpRecord_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sample` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `material` VARCHAR(100) NOT NULL,
    `grade` VARCHAR(100) NOT NULL,
    `project` VARCHAR(200) NOT NULL,
    `element` VARCHAR(200) NOT NULL,
    `castingDate` DATE NOT NULL,
    `registeredDate` DATE NOT NULL,
    `age` INTEGER NOT NULL,
    `count` INTEGER NOT NULL,
    `status` VARCHAR(40) NOT NULL,
    `technician` VARCHAR(120) NOT NULL,
    `photos` JSON NOT NULL,

    UNIQUE INDEX `Sample_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestRecord` (
    `id` VARCHAR(36) NOT NULL,
    `kind` VARCHAR(24) NOT NULL,
    `sampleId` VARCHAR(36) NULL,
    `sampleCode` VARCHAR(100) NOT NULL,
    `result` DECIMAL(20, 8) NOT NULL,
    `state` VARCHAR(10) NOT NULL,
    `approved` BOOLEAN NOT NULL DEFAULT false,
    `technician` VARCHAR(120) NOT NULL,
    `photos` JSON NOT NULL,

    INDEX `TestRecord_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestValue` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `testId` VARCHAR(36) NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `textValue` TEXT NOT NULL,
    `numericValue` DECIMAL(20, 8) NULL,

    UNIQUE INDEX `TestValue_testId_name_key`(`testId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SleeperTrack` (
    `id` VARCHAR(36) NOT NULL,
    `date` DATE NOT NULL,
    `track` INTEGER NOT NULL,
    `temperature` DECIMAL(12, 4) NULL,
    `notes` TEXT NOT NULL,

    UNIQUE INDEX `SleeperTrack_date_track_key`(`date`, `track`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemperatureEntry` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sleeperId` VARCHAR(36) NOT NULL,
    `hour` INTEGER NOT NULL,
    `time` CHAR(5) NOT NULL,
    `value` DECIMAL(12, 4) NULL,
    `note` VARCHAR(2000) NOT NULL,

    UNIQUE INDEX `TemperatureEntry_sleeperId_hour_key`(`sleeperId`, `hour`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SecretTrial` (
    `id` VARCHAR(36) NOT NULL,
    `number` INTEGER NULL,
    `spread` DECIMAL(12, 4) NULL,
    `concreteTemperature` DECIMAL(12, 4) NULL,
    `airTemperature` DECIMAL(12, 4) NULL,
    `airContent` DECIMAL(12, 4) NULL,
    `time` VARCHAR(5) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Composition` (
    `id` VARCHAR(36) NOT NULL,
    `time` VARCHAR(5) NOT NULL,
    `date` DATE NOT NULL,

    UNIQUE INDEX `Composition_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompositionEntry` (
    `id` VARCHAR(36) NOT NULL,
    `compositionId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `fine` DECIMAL(20, 8) NULL,
    `medium` DECIMAL(20, 8) NULL,
    `coarse` DECIMAL(20, 8) NULL,

    UNIQUE INDEX `CompositionEntry_compositionId_position_key`(`compositionId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductBatch` (
    `id` VARCHAR(36) NOT NULL,
    `product` VARCHAR(10) NOT NULL,
    `number` INTEGER NOT NULL,

    UNIQUE INDEX `ProductBatch_product_number_key`(`product`, `number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductEntry` (
    `id` VARCHAR(36) NOT NULL,
    `batchId` VARCHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `date` DATE NULL,
    `time` VARCHAR(5) NOT NULL,
    `count` INTEGER NULL,
    `code` VARCHAR(100) NOT NULL,
    `size` VARCHAR(100) NOT NULL,
    `curing` VARCHAR(40) NOT NULL,
    `note` VARCHAR(2000) NOT NULL,

    UNIQUE INDEX `ProductEntry_batchId_position_key`(`batchId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Equipment` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `model` VARCHAR(120) NOT NULL,
    `serial` VARCHAR(100) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `status` VARCHAR(40) NOT NULL,
    `healthStatus` VARCHAR(100) NOT NULL,
    `lastInspection` DATE NULL,
    `nextInspection` DATE NULL,
    `calibrationDate` DATE NULL,
    `technician` VARCHAR(120) NOT NULL,
    `purpose` TEXT NOT NULL,
    `specimens` TEXT NOT NULL,
    `tools` TEXT NOT NULL,
    `form` VARCHAR(24) NOT NULL,
    `steps` JSON NOT NULL,
    `failureInfo` TEXT NOT NULL,
    `maintenanceInfo` TEXT NOT NULL,
    `notes` TEXT NOT NULL,

    UNIQUE INDEX `Equipment_serial_key`(`serial`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EquipmentReading` (
    `id` VARCHAR(36) NOT NULL,
    `equipmentId` VARCHAR(36) NOT NULL,
    `value` DECIMAL(20, 8) NOT NULL,
    `unit` VARCHAR(24) NOT NULL,
    `measuredAt` DATETIME(3) NOT NULL,
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recordedBy` VARCHAR(36) NOT NULL,

    INDEX `EquipmentReading_equipmentId_measuredAt_idx`(`equipmentId`, `measuredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaintenanceHistory` (
    `id` VARCHAR(36) NOT NULL,
    `equipmentId` VARCHAR(36) NOT NULL,
    `performedAt` DATETIME(3) NOT NULL,
    `description` TEXT NOT NULL,
    `recordedBy` VARCHAR(36) NOT NULL,

    INDEX `MaintenanceHistory_equipmentId_performedAt_idx`(`equipmentId`, `performedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Standard` (
    `id` VARCHAR(36) NOT NULL,
    `number` VARCHAR(100) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `material` VARCHAR(100) NOT NULL,
    `equipment` VARCHAR(120) NOT NULL,
    `equipmentId` VARCHAR(36) NULL,
    `form` VARCHAR(24) NOT NULL,
    `size` VARCHAR(200) NOT NULL,
    `condition` TEXT NOT NULL,
    `formula` VARCHAR(500) NOT NULL,
    `steps` JSON NOT NULL,

    UNIQUE INDEX `Standard_number_key`(`number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Checklist` (
    `id` VARCHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `checks` JSON NOT NULL,
    `ownerId` VARCHAR(36) NOT NULL,

    UNIQUE INDEX `Checklist_ownerId_key_key`(`ownerId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationRead` (
    `userId` VARCHAR(36) NOT NULL,
    `eventId` BIGINT NOT NULL,

    PRIMARY KEY (`userId`, `eventId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ErpRecord` ADD CONSTRAINT `ErpRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ErpRecord` ADD CONSTRAINT `ErpRecord_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sample` ADD CONSTRAINT `Sample_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestRecord` ADD CONSTRAINT `TestRecord_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestRecord` ADD CONSTRAINT `TestRecord_sampleId_fkey` FOREIGN KEY (`sampleId`) REFERENCES `Sample`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestValue` ADD CONSTRAINT `TestValue_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `TestRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SleeperTrack` ADD CONSTRAINT `SleeperTrack_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemperatureEntry` ADD CONSTRAINT `TemperatureEntry_sleeperId_fkey` FOREIGN KEY (`sleeperId`) REFERENCES `SleeperTrack`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SecretTrial` ADD CONSTRAINT `SecretTrial_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Composition` ADD CONSTRAINT `Composition_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompositionEntry` ADD CONSTRAINT `CompositionEntry_compositionId_fkey` FOREIGN KEY (`compositionId`) REFERENCES `Composition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductBatch` ADD CONSTRAINT `ProductBatch_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductEntry` ADD CONSTRAINT `ProductEntry_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `ProductBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Equipment` ADD CONSTRAINT `Equipment_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentReading` ADD CONSTRAINT `EquipmentReading_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EquipmentReading` ADD CONSTRAINT `EquipmentReading_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceHistory` ADD CONSTRAINT `MaintenanceHistory_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaintenanceHistory` ADD CONSTRAINT `MaintenanceHistory_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Standard` ADD CONSTRAINT `Standard_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Standard` ADD CONSTRAINT `Standard_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `Equipment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Checklist` ADD CONSTRAINT `Checklist_id_fkey` FOREIGN KEY (`id`) REFERENCES `ErpRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Checklist` ADD CONSTRAINT `Checklist_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationRead` ADD CONSTRAINT `NotificationRead_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationRead` ADD CONSTRAINT `NotificationRead_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `RealtimeEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
