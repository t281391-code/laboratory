-- CreateTable
CREATE TABLE `SampleRecord` (
    `id` VARCHAR(36) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `material` VARCHAR(100) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `project` VARCHAR(200) NOT NULL,
    `location` VARCHAR(200) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit` VARCHAR(24) NOT NULL,
    `sampledDate` DATE NOT NULL,
    `registeredDate` DATE NOT NULL,
    `sampledBy` VARCHAR(120) NOT NULL,
    `status` VARCHAR(40) NOT NULL,
    `submittedLaboratory` VARCHAR(200) NULL,
    `sentDate` DATE NULL,
    `notes` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(36) NOT NULL,
    `updatedById` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SampleRecord_code_key`(`code`),
    INDEX `SampleRecord_isActive_registeredDate_idx`(`isActive`, `registeredDate`),
    INDEX `SampleRecord_status_idx`(`status`),
    INDEX `SampleRecord_createdById_idx`(`createdById`),
    INDEX `SampleRecord_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryResult` (
    `id` VARCHAR(36) NOT NULL,
    `sampleRecordId` VARCHAR(36) NOT NULL,
    `reportNumber` VARCHAR(100) NOT NULL,
    `receivedDate` DATE NOT NULL,
    `resultLaboratory` VARCHAR(200) NOT NULL,
    `testedBy` VARCHAR(120) NOT NULL,
    `conclusion` ENUM('PASS', 'FAIL', 'CONDITIONAL', 'NOT_EVALUATED') NOT NULL DEFAULT 'NOT_EVALUATED',
    `isComplete` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `completedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(36) NOT NULL,
    `updatedById` VARCHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `LaboratoryResult_sampleRecordId_isActive_idx`(`sampleRecordId`, `isActive`),
    INDEX `LaboratoryResult_receivedDate_idx`(`receivedDate`),
    INDEX `LaboratoryResult_createdById_idx`(`createdById`),
    INDEX `LaboratoryResult_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryResultItem` (
    `id` VARCHAR(36) NOT NULL,
    `laboratoryResultId` VARCHAR(36) NOT NULL,
    `testName` VARCHAR(200) NOT NULL,
    `resultValue` VARCHAR(200) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `standardRequirement` VARCHAR(300) NOT NULL,
    `testStandard` VARCHAR(200) NOT NULL,
    `itemConclusion` ENUM('PASS', 'FAIL', 'NOT_EVALUATED') NOT NULL DEFAULT 'NOT_EVALUATED',
    `notes` VARCHAR(1000) NOT NULL,
    `sortOrder` INTEGER NOT NULL,

    INDEX `LaboratoryResultItem_laboratoryResultId_sortOrder_idx`(`laboratoryResultId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LaboratoryResultAttachment` (
    `id` VARCHAR(36) NOT NULL,
    `laboratoryResultId` VARCHAR(36) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `storedName` VARCHAR(80) NOT NULL,
    `storagePath` VARCHAR(160) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `extension` VARCHAR(10) NOT NULL,
    `size` INTEGER NOT NULL,
    `sha256` CHAR(64) NOT NULL,
    `uploadedById` VARCHAR(36) NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `removedAt` DATETIME(3) NULL,
    `removedById` VARCHAR(36) NULL,

    INDEX `LaboratoryResultAttachment_laboratoryResultId_removedAt_idx`(`laboratoryResultId`, `removedAt`),
    INDEX `LaboratoryResultAttachment_uploadedById_idx`(`uploadedById`),
    INDEX `LaboratoryResultAttachment_removedById_idx`(`removedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SampleRecord` ADD CONSTRAINT `SampleRecord_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleRecord` ADD CONSTRAINT `SampleRecord_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_sampleRecordId_fkey` FOREIGN KEY (`sampleRecordId`) REFERENCES `SampleRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResultItem` ADD CONSTRAINT `LaboratoryResultItem_laboratoryResultId_fkey` FOREIGN KEY (`laboratoryResultId`) REFERENCES `LaboratoryResult`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResultAttachment` ADD CONSTRAINT `LaboratoryResultAttachment_laboratoryResultId_fkey` FOREIGN KEY (`laboratoryResultId`) REFERENCES `LaboratoryResult`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResultAttachment` ADD CONSTRAINT `LaboratoryResultAttachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LaboratoryResultAttachment` ADD CONSTRAINT `LaboratoryResultAttachment_removedById_fkey` FOREIGN KEY (`removedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Database-level integrity: valid statuses, a dispatch record that agrees with the status, positive versions and bounded uploads.
ALTER TABLE `SampleRecord` ADD CONSTRAINT `SampleRecord_status_check` CHECK (`status` IN ('Бүртгэсэн', 'Лабораторид илгээсэн', 'Хариу хэсэгчлэн авсан', 'Хариу авсан'));
ALTER TABLE `SampleRecord` ADD CONSTRAINT `SampleRecord_quantity_check` CHECK (`quantity` BETWEEN 1 AND 1000000 AND `version` >= 1);
ALTER TABLE `SampleRecord` ADD CONSTRAINT `SampleRecord_dispatch_check` CHECK (
    (`status` = 'Бүртгэсэн' AND `submittedLaboratory` IS NULL AND `sentDate` IS NULL)
    OR (`status` <> 'Бүртгэсэн' AND `submittedLaboratory` IS NOT NULL AND `sentDate` IS NOT NULL)
);
ALTER TABLE `LaboratoryResult` ADD CONSTRAINT `LaboratoryResult_version_check` CHECK (`version` >= 1);
ALTER TABLE `LaboratoryResultAttachment` ADD CONSTRAINT `LaboratoryResultAttachment_size_check` CHECK (`size` BETWEEN 1 AND 10485760);
