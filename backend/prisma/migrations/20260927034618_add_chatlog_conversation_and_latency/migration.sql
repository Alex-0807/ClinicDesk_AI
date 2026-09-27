/*
  Warnings:

  - Added the required column `conversation_id` to the `chat_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `latency_ms` to the `chat_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat_logs" ADD COLUMN     "conversation_id" TEXT NOT NULL,
ADD COLUMN     "latency_ms" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "chat_logs_conversation_id_idx" ON "chat_logs"("conversation_id");
