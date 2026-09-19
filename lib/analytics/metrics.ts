export interface ContentMetrics {
  reach: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

export function rate(value: number, base: number): number {
  return base > 0 ? value / base : 0;
}

export function engagementRate(metrics: ContentMetrics): number {
  return rate(
    metrics.likes + metrics.comments + metrics.shares + metrics.saves,
    metrics.reach
  );
}

export function shareRate(metrics: ContentMetrics): number {
  return rate(metrics.shares, metrics.reach);
}

export function saveRate(metrics: ContentMetrics): number {
  return rate(metrics.saves, metrics.reach);
}

export function followerGrowth(current: number, previous: number): number {
  return current - previous;
}
