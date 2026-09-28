ALTER TABLE `Sample` ADD COLUMN `companyPlannedDate` DATE NULL;
ALTER TABLE `SampleRecord` ADD COLUMN `sourceSampleId` VARCHAR(36) NULL;
CREATE UNIQUE INDEX `SampleRecord_sourceSampleId_key` ON `SampleRecord`(`sourceSampleId`);
ALTER TABLE `SampleRecord` ADD CONSTRAINT `SampleRecord_sourceSampleId_fkey`
  FOREIGN KEY (`sourceSampleId`) REFERENCES `Sample`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing registrations with the same unique code refer to the original sample.
UPDATE `SampleRecord` AS r
INNER JOIN `Sample` AS s ON s.`code` = r.`code`
SET r.`sourceSampleId` = s.`id`;
