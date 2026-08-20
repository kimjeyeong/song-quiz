/* 진행자 화면과 팀 화면이 함께 쓰는 것들 */

const STAGES = [
  { label: "0.5초", points: 3 },
  { label: "1초", points: 2 },
  { label: "1.5초", points: 1 },
];

function initFirebase() {
  const config = window.FIREBASE_CONFIG || {};
  const required = ["apiKey", "databaseURL", "projectId", "appId"];
  const invalid = required.some((key) => !config[key] || config[key] === "PASTE_HERE");
  if (invalid || !window.firebase) {
    document.body.innerHTML = `
      <div class="fatal">
        <h1>Firebase 설정이 필요합니다</h1>
        <p><code>firebase-config.js</code>에 Firebase 웹 앱 설정값을 입력해주세요.</p>
      </div>`;
    throw new Error("Firebase 설정값이 비어 있습니다.");
  }
  if (!firebase.apps.length) firebase.initializeApp(config);
  return firebase.database();
}

/* 채점용 문자열 정규화 — 공백·문장부호·괄호 내용을 걷어낸다 */
function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[\s.,!?~·"'`\-_/\\]/g, "")
    .trim();
}

/* 정규화한 제목 또는 등록된 별칭과 정확히 일치할 때만 정답 처리 */
function autoGrade(answer, song) {
  const given = normalize(answer);
  if (!given) return false;
  const targets = [song.title, ...(song.aliases || [])].map(normalize);
  return targets.includes(given);
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* 점수 계산 — 진행자 화면과 팀 화면이 같은 규칙을 쓴다 */
function computeRanking(teams, answers, overrides, songs) {
  const rows = Object.entries(teams).map(([id, t]) => {
    let pts = 0, correct = 0;
    const mine = answers[id] || {};
    for (const [q, a] of Object.entries(mine)) {
      const ov = overrides[q] && overrides[q][id];
      const song = songs.find((s) => String(s.q) === String(q));
      const ok = ov === undefined || ov === null
        ? (song ? autoGrade(a.text, song) : false)
        : !!ov;
      if (ok) { pts += STAGES[a.stage].points; correct++; }
    }
    return { id, name: t.name, pts, correct };
  });

  rows.sort((a, b) => b.pts - a.pts || b.correct - a.correct || a.name.localeCompare(b.name));

  let rank = 0, prev = null;
  rows.forEach((r, i) => {
    const key = `${r.pts}:${r.correct}`;
    if (key !== prev) { rank = i + 1; prev = key; }
    r.rank = rank;
  });
  return rows;
}
