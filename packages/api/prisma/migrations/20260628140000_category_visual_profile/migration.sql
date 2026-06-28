-- AlterTable
ALTER TABLE "Category" ADD COLUMN "accentColor" TEXT NOT NULL DEFAULT '#F26522';
ALTER TABLE "Category" ADD COLUMN "isIceCreamHub" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Category" ADD COLUMN "showCustomBadge" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Category" SET "isIceCreamHub" = true, "showCustomBadge" = true WHERE "id" = 'icecream';

UPDATE "Category" SET "accentColor" = '#FF8C4D' WHERE "id" = 'icecream';
UPDATE "Category" SET "accentColor" = '#e85d8a' WHERE "id" = 'fresh';
UPDATE "Category" SET "accentColor" = '#8b6914' WHERE "id" = 'arabica';
UPDATE "Category" SET "accentColor" = '#a67c52' WHERE "id" = 'coffee5050';
UPDATE "Category" SET "accentColor" = '#4a8a60' WHERE "id" = 'herbal';
UPDATE "Category" SET "accentColor" = '#D94E10' WHERE "id" = 'hotcup';
UPDATE "Category" SET "accentColor" = '#FF8C4D' WHERE "id" = 'breakfast';
UPDATE "Category" SET "accentColor" = '#E8A87C' WHERE "id" = 'waffle';
UPDATE "Category" SET "accentColor" = '#FF2D7B' WHERE "id" = 'cake';
UPDATE "Category" SET "accentColor" = '#4a8a60' WHERE "id" = 'salad';
UPDATE "Category" SET "accentColor" = '#F26522' WHERE "id" = 'icedcoffee';
UPDATE "Category" SET "accentColor" = '#e85d8a' WHERE "id" = 'shake';
UPDATE "Category" SET "accentColor" = '#E8A87C' WHERE "id" = 'milkmix';
