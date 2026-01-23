/*
  Warnings:

  - The `budget` column on the `leads` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "leads" DROP COLUMN "budget",
ADD COLUMN     "budget" INTEGER;
