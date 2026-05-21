// Threads (Meta) API client for publishing chairman picks

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

interface ThreadsPublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Format the chairman's picks as a Threads post.
 */
export function formatPicksForThreads(picks: Array<{
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  prediction: string;
  homeScore?: number | null;
  awayScore?: number | null;
  correct?: boolean;
}>): string {
  let text = '⚽ VARview Chairman\'s Daily Picks\n\n';

  picks.forEach((pick, i) => {
    const result = pick.homeScore !== null && pick.homeScore !== undefined && pick.awayScore !== null && pick.awayScore !== undefined
      ? ` (${pick.homeScore}-${pick.awayScore})`
      : '';
    text += `${i + 1}. ${pick.homeTeam} vs ${pick.awayTeam} — ${pick.leagueName}${result}\n`;
    text += `   Pick: ${pick.prediction}`;
    if (pick.correct !== undefined) {
      text += pick.correct ? ' ✅' : ' ❌';
    }
    text += '\n\n';
  });

  text += '📊 AI-powered football predictions';
  return text.trim();
}

/**
 * Resolve the Threads user ID from the API if not explicitly provided.
 */
async function resolveThreadsUserId(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${THREADS_API_BASE}/me?access_token=${accessToken}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch {
    return null;
  }
}

/**
 * Publish a text post to Threads.
 */
export async function publishToThreads(text: string): Promise<ThreadsPublishResult> {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  let userId = process.env.THREADS_USER_ID;

  if (!accessToken) {
    return { success: false, error: 'THREADS_ACCESS_TOKEN not configured' };
  }

  // Resolve user ID if not provided
  if (!userId) {
    const resolved = await resolveThreadsUserId(accessToken);
    if (!resolved) {
      return {
        success: false,
        error: 'Could not resolve Threads user ID. Set THREADS_USER_ID env var or check token permissions.',
      };
    }
    userId = resolved;
  }

  try {
    // Step 1: Create content container
    const createRes = await fetch(
      `${THREADS_API_BASE}/${userId}/threads?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          media_type: 'TEXT',
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return { success: false, error: `Failed to create post: ${createRes.status} ${errBody}` };
    }

    const createData = await createRes.json();
    const creationId = createData.id;

    if (!creationId) {
      return { success: false, error: 'No creation ID returned from Threads API' };
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `${THREADS_API_BASE}/${userId}/threads_publish?access_token=${accessToken}&creation_id=${creationId}`,
      { method: 'POST', signal: AbortSignal.timeout(10000) }
    );

    if (!publishRes.ok) {
      const errBody = await publishRes.text();
      return { success: false, error: `Failed to publish post: ${publishRes.status} ${errBody}` };
    }

    const publishData = await publishRes.json();
    return { success: true, postId: publishData.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
