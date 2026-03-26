import cron from 'node-cron';
import prisma from '../services/prisma.js';

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Starting automatic history cleanup job...');
  
  const job = await prisma.cleanupJob.create({
    data: {
      type: 'messages_cleanup',
      status: 'running',
      startedAt: new Date()
    }
  });

  try {
    const prompts = await prisma.prompt.findMany({
      where: { autoCleanup: true }
    });

    let totalDeleted = 0;

    for (const prompt of prompts) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - prompt.cleanupDays);

      const deleted = await prisma.message.deleteMany({
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
    await prisma.cleanupJob.update({
      where: { id: job.id },
      data: {
        deletedCount: totalDeleted,
        status: 'completed',
        completedAt: new Date()
      }
    });

    console.log(`Cleanup job completed successfully. Processed ${prompts.length} prompts, deleted ${totalDeleted} messages.`);
  } catch (error: any) {
    console.error('Error during cleanup job:', error);
    
    await prisma.cleanupJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completedAt: new Date()
      }
    });
  }
});
