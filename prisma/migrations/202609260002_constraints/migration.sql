ALTER TABLE `SleeperTrack` ADD CONSTRAINT `SleeperTrack_track_range` CHECK (`track` BETWEEN 1 AND 3);
ALTER TABLE `TemperatureEntry` ADD CONSTRAINT `TemperatureEntry_hour_range` CHECK (`hour` BETWEEN 1 AND 8);
ALTER TABLE `Sample` ADD CONSTRAINT `Sample_count_range` CHECK (`count` BETWEEN 1 AND 100);
ALTER TABLE `Sample` ADD CONSTRAINT `Sample_age_range` CHECK (`age` IN (3, 7, 28));
ALTER TABLE `ProductEntry` ADD CONSTRAINT `ProductEntry_count_range` CHECK (`count` IS NULL OR `count` BETWEEN 0 AND 100000);
ALTER TABLE `ProductBatch` ADD CONSTRAINT `ProductBatch_product_range` CHECK (`product` IN ('pipe', 'ring'));
ALTER TABLE `CompositionEntry` ADD CONSTRAINT `CompositionEntry_nonnegative` CHECK ((`fine` IS NULL OR `fine` >= 0) AND (`medium` IS NULL OR `medium` >= 0) AND (`coarse` IS NULL OR `coarse` >= 0));
ALTER TABLE `ErpRecord` ADD CONSTRAINT `ErpRecord_version_positive` CHECK (`version` >= 1);
