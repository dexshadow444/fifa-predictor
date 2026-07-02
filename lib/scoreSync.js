// Free, no-key-required public ESPN endpoint for FIFA World Cup scores.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

function mapEvent(event) {
  try {
    const comp = event.competitions?.[0];
    if (!comp) return null;

    const home = comp.competitors?.find((c) => c.homeAway === 'home');
    const away = comp.competitors?.find((c) => c.homeAway === 'away');
    if (!home || !away) return null;

    const espnStatus = comp.status?.type;
    let status = 'UPCOMING';
    if (espnStatus?.completed) status = 'FINISHED';
    else if (espnStatus?.state === 'in') status = 'LIVE';

    return {
      espnId: String(event.id),
      teamA: home.team?.name || '',
      teamB: away.team?.name || '',
      scoreA: parseInt(home.score ?? '0', 10) || 0,
      scoreB: parseInt(away.score ?? '0', 10) || 0,
      status,
      liveMinute: comp.status?.displayClock ? (parseInt(comp.status.displayClock, 10) || undefined) : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchForDate(yyyymmdd) {
  try {
    const res = await fetch(`${ESPN_BASE}?dates=${yyyymmdd}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || []).map(mapEvent).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Fetches World Cup matches for a window of +/-4 days around today so it
 * covers any active round including yesterday's / tomorrow's fixtures.
 */
export async function fetchWorldCupScores() {
  const today = new Date();
  const dateKeys = [];

  for (let offset = -4; offset <= 4; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    dateKeys.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }

  const results = await Promise.all(dateKeys.map(fetchForDate));
  const allMatches = results.flat();

  const seen = new Set();
  return allMatches.filter((m) => {
    if (seen.has(m.espnId)) return false;
    seen.add(m.espnId);
    return true;
  });
}

/**
 * Matches our stored fixtures against live ESPN data by fuzzy team-name
 * inclusion and updates score/status/liveMinute in Firestore for anything
 * that changed. Matches already marked FINISHED are left alone so a manual
 * admin correction never gets clobbered by a later sync.
 */
export async function syncMatchesWithFirestore(db) {
  const espnMatches = await fetchWorldCupScores();

  const snapshot = await db.collection('matches').get();
  let updated = 0;

  if (espnMatches.length > 0 && !snapshot.empty) {
    const batch = db.batch();

    snapshot.forEach((doc) => {
      const m = doc.data();
      if (m.status === 'FINISHED') return;

      const a = String(m.teamA || '').toLowerCase();
      const b = String(m.teamB || '').toLowerCase();

      const found = espnMatches.find((f) => {
        const home = f.teamA.toLowerCase();
        const away = f.teamB.toLowerCase();
        return (home.includes(a) && away.includes(b)) || (home.includes(b) && away.includes(a));
      });
      if (!found) return;

      const homeIsTeamA = found.teamA.toLowerCase().includes(a);
      const scoreA = homeIsTeamA ? found.scoreA : found.scoreB;
      const scoreB = homeIsTeamA ? found.scoreB : found.scoreA;

      if (scoreA !== m.scoreA || scoreB !== m.scoreB || found.status !== m.status) {
        batch.update(doc.ref, {
          scoreA,
          scoreB,
          status: found.status,
          liveMinute: found.liveMinute ?? m.liveMinute ?? null,
        });
        updated += 1;
      }
    });

    if (updated > 0) await batch.commit();
  }

  await db.collection('meta').doc('sync').set({ lastSyncedAt: new Date().toISOString() }, { merge: true });

  return { updated, checked: snapshot.size, espnMatchesFound: espnMatches.length };
}

/**
 * Called opportunistically from GET /api/matches so scores update
 * automatically as long as at least one visitor is polling the site -
 * without needing a paid/frequent cron job. Skips the ESPN call entirely
 * if we synced recently.
 */
export async function throttledAutoSync(db, minIntervalMs = 45000) {
  try {
    const metaRef = db.collection('meta').doc('sync');
    const metaDoc = await metaRef.get();
    const last = metaDoc.exists ? metaDoc.data().lastSyncedAt : null;
    if (last && Date.now() - new Date(last).getTime() < minIntervalMs) {
      return null;
    }
    return await syncMatchesWithFirestore(db);
  } catch (err) {
    console.error('Auto score sync failed:', err);
    return null;
  }
}
