export function getOptimizedProfileImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const profileFolder = '/profile-pictures/';
  const folderIndex = url.indexOf(profileFolder);
  if (folderIndex < 0) return url;

  return `${url.slice(0, folderIndex)}/tr:w-100,h-100,c-maintain_ratio,q-auto,f-auto${url.slice(folderIndex)}`;
}
