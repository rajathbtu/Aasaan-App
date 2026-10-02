export function getVisibleProfilePhotoUrl(
  picModeration: 'under_review' | 'approved' | 'blocked',
  picUrl: string | null,
): string | null {
  return picModeration === 'approved' ? picUrl : null;
}