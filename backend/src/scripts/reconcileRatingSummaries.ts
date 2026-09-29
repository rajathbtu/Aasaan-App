import prisma from '../utils/prisma';

async function reconcileRatingSummaries() {
  const updatedUsers = await prisma.$executeRaw`
    UPDATE "User" AS user_record
    SET "ratingsScoreSum" = totals.score_sum,
      "ratingsCount" = totals.rating_count
    FROM (
      SELECT user_row."id",
             COALESCE(SUM(rating."stars"), 0)::INTEGER AS score_sum,
             COUNT(rating."id")::INTEGER AS rating_count
      FROM "User" AS user_row
      LEFT JOIN "Rating" AS rating ON rating."ratedUserId" = user_row."id"
      GROUP BY user_row."id"
    ) AS totals
    WHERE user_record."id" = totals."id"
      AND (user_record."ratingsScoreSum", user_record."ratingsCount")
          IS DISTINCT FROM (totals.score_sum, totals.rating_count)
  `;

  console.log(`Reconciled rating summaries for ${updatedUsers} users.`);
}

reconcileRatingSummaries()
  .catch((error) => {
    console.error('Rating summary reconciliation failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());