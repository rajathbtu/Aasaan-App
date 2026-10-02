export function isModerator(userId: string): boolean {
  const moderatorUserIds = new Set(
    (process.env.ADMIN_MODERATOR_USER_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  );
  return moderatorUserIds.has(userId);
}