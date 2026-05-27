export interface ApifyReel {
  videoUrl: string;
  url: string;
  videoPlayCount: number;
  likesCount: number;
  commentsCount: number;
  ownerUsername: string;
  images: string[];
  displayUrl: string;
  thumbnailUrl: string;
  previewUrl: string;
  timestamp: string;
  type: string;
}

interface ApifyProfileResult {
  profilePicUrl: string;
  followersCount: number;
}

export interface CreatorStats {
  profilePicUrl: string;
  followers: number;
  reelsCount30d: number;
  avgViews30d: number;
}

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not set");
  return token;
}

export async function scrapeReels(
  username: string,
  maxVideos: number,
  nDays: number
): Promise<ApifyReel[]> {
  const token = getToken();
  const sinceDate = new Date(Date.now() - nDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Request more posts than needed to ensure we get enough reels
  // after filtering out photos and carousels
  const fetchLimit = maxVideos * 4;

  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addParentData: false,
        directUrls: [`https://www.instagram.com/${username}/`],
        enhanceUserSearchWithFacebookPage: false,
        isUserReelFeedURL: false,
        isUserTaggedFeedURL: false,
        onlyPostsNewerThan: sinceDate,
        resultsLimit: fetchLimit,
        resultsType: "posts",
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify error ${response.status}: ${text}`);
  }

  const data = await response.json() as ApifyReel[];

  // Filter to only video/reel content
  return data.filter((r) => r.videoUrl && r.videoUrl.length > 0);
}

export async function scrapeCreatorStats(username: string): Promise<CreatorStats> {
  const token = getToken();

  const profileRes = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        directUrls: [`https://www.instagram.com/${username}/`],
        resultsType: "details",
        resultsLimit: 1,
      }),
    }
  );

  if (!profileRes.ok) {
    const text = await profileRes.text();
    throw new Error(`Apify profile error ${profileRes.status}: ${text}`);
  }

  const profileData = await profileRes.json() as ApifyProfileResult[];
  const profile = profileData[0] || {};

  // Scrape last 30 days of reels
  const reels = await scrapeReels(username, 50, 30);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const reels30d = reels.filter((r) => r.timestamp && new Date(r.timestamp) >= cutoff);
  const avgViews30d = reels30d.length > 0
    ? Math.round(reels30d.reduce((sum, r) => sum + (r.videoPlayCount || 0), 0) / reels30d.length)
    : 0;

  return {
    profilePicUrl: profile.profilePicUrl || "",
    followers: profile.followersCount || 0,
    reelsCount30d: reels30d.length,
    avgViews30d,
  };
}
