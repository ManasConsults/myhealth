-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('push', 'pull', 'legs', 'core', 'cardio', 'stretch');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "biologicalSex" "BiologicalSex";

-- AlterTable
ALTER TABLE "WorkoutLogEntry" ADD COLUMN     "exerciseLibraryId" TEXT;

-- CreateTable
CREATE TABLE "ExerciseLibrary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" TEXT NOT NULL DEFAULT '',
    "type" "ExerciseType",
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseLibrary_name_key" ON "ExerciseLibrary"("name");

-- CreateIndex
CREATE INDEX "ExerciseLibrary_name_idx" ON "ExerciseLibrary"("name");

-- AddForeignKey
ALTER TABLE "WorkoutLogEntry" ADD CONSTRAINT "WorkoutLogEntry_exerciseLibraryId_fkey" FOREIGN KEY ("exerciseLibraryId") REFERENCES "ExerciseLibrary"("id") ON DELETE SET NULL ON UPDATE CASCADE;
