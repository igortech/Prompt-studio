"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_js_1 = __importDefault(require("../services/prisma.js"));
// Run every day at midnight
node_cron_1.default.schedule('0 0 * * *', async () => {
    console.log('Starting automatic history cleanup job...');
    const job = await prisma_js_1.default.cleanupJob.create({
        data: {
            type: 'messages_cleanup',
            status: 'running',
            startedAt: new Date()
        }
    });
    try {
        const prompts = await prisma_js_1.default.prompt.findMany({
            where: { autoCleanup: true }
        });
        let totalDeleted = 0;
        for (const prompt of prompts) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - prompt.cleanupDays);
            const deleted = await prisma_js_1.default.message.deleteMany({
                where: {
                    promptId: prompt.id,
                    createdAt: {
                        lt: cutoffDate
                    }
                }
            });
            totalDeleted += deleted.count;
        }
        // Log the job
        await prisma_js_1.default.cleanupJob.update({
            where: { id: job.id },
            data: {
                deletedCount: totalDeleted,
                status: 'completed',
                completedAt: new Date()
            }
        });
        console.log(`Cleanup job completed successfully. Processed ${prompts.length} prompts, deleted ${totalDeleted} messages.`);
    }
    catch (error) {
        console.error('Error during cleanup job:', error);
        await prisma_js_1.default.cleanupJob.update({
            where: { id: job.id },
            data: {
                status: 'failed',
                completedAt: new Date()
            }
        });
    }
});
