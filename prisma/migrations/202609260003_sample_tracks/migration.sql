ALTER TABLE `Sample`
  ADD COLUMN `product` VARCHAR(24) NOT NULL DEFAULT 'other',
  ADD COLUMN `track1Count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `track2Count` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `track3Count` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `Sample`
  ADD CONSTRAINT `Sample_track_counts_check` CHECK (
    `track1Count` BETWEEN 0 AND 100
    AND `track2Count` BETWEEN 0 AND 100
    AND `track3Count` BETWEEN 0 AND 100
    AND (
      (`product` = 'other' AND `track1Count` = 0 AND `track2Count` = 0 AND `track3Count` = 0)
      OR (`product` IN ('sleeper', 'ot-slab') AND `material` = 'Бетон'
        AND `count` = `track1Count` + `track2Count` + `track3Count`
        AND `count` BETWEEN 1 AND 100)
    )
  );
