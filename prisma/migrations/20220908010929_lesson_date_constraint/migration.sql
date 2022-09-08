/*
  Warnings:

  - A unique constraint covering the columns `[classroomId,date]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Lesson_classroomId_date_key" ON "Lesson"("classroomId", "date");
