-- AlterTable
ALTER TABLE "topographic_symbols" ADD COLUMN     "fillColor" VARCHAR(64),
ADD COLUMN     "inheritColor" BOOLEAN NOT NULL DEFAULT true;
