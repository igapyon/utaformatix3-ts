var j = /* @__PURE__ */ ((t) => (t.Vsqx = "Vsqx", t.MusicXml = "MusicXml", t.UfData = "UfData", t.Ust = "Ust", t.Ustx = "Ustx", t.Ccs = "Ccs", t.Svp = "Svp", t))(j || {}), S = /* @__PURE__ */ ((t) => (t.Unknown = "Unknown", t.RomajiCv = "RomajiCv", t.RomajiVcv = "RomajiVcv", t.KanaCv = "KanaCv", t.KanaVcv = "KanaVcv", t))(S || {});
function se(t) {
  return t.tickOff - t.tickOn;
}
function Ct(t) {
  if (t.length === 0)
    return t;
  const e = [...t].sort((r, i) => r.tickOn - i.tickOn), n = [];
  for (let r = 0; r < e.length - 1; r += 1) {
    const i = e[r], o = e[r + 1], s = {
      ...i,
      tickOff: Math.min(i.tickOff, o.tickOn)
    };
    se(s) > 0 && n.push(s);
  }
  return n.push(e[e.length - 1]), n.map((r, i) => ({
    ...r,
    id: i
  }));
}
function pt(t) {
  return {
    ...t,
    notes: Ct(t.notes)
  };
}
const J = 1;
function Lt(t) {
  return typeof t != "string" ? t : JSON.parse(t);
}
function ce(t) {
  const n = Lt(t);
  if (!n.project)
    throw new Error("Invalid UFDATA: missing project");
  return n;
}
function ae(t) {
  return {
    ticks: t?.ticks ?? [],
    values: t?.values ?? [],
    isAbsolute: t?.isAbsolute ?? !1
  };
}
function ue(t) {
  const e = t.project;
  return {
    formatVersion: t.formatVersion,
    project: {
      name: e.name ?? "",
      tracks: (e.tracks ?? []).map((n) => ({
        name: n.name ?? "",
        notes: n.notes ?? [],
        pitch: ae(n.pitch)
      })),
      timeSignatures: e.timeSignatures ?? [{ measurePosition: 0, numerator: 4, denominator: 4 }],
      tempos: e.tempos ?? [{ tickPosition: 0, bpm: 120 }],
      measurePrefix: e.measurePrefix ?? 0
    }
  };
}
function Ar(t) {
  try {
    return Lt(t).project ? [] : [{ code: "MISSING_PROJECT", message: "Invalid UFDATA: missing project", path: "$.project" }];
  } catch (e) {
    return [{ code: "INVALID_JSON", message: e instanceof Error ? e.message : String(e), path: "$" }];
  }
}
function le(t, e, n) {
  const r = e.notes.map((o, s) => ({
    id: s,
    key: o.key,
    lyric: o.lyric,
    tickOn: o.tickOn,
    tickOff: o.tickOff,
    phoneme: o.phoneme
  })), i = {
    id: t,
    name: e.name,
    notes: r,
    pitch: n ? null : e.pitch ? {
      data: e.pitch.ticks.map((o, s) => [o, e.pitch?.values[s] ?? null]),
      isAbsolute: e.pitch.isAbsolute ?? !1
    } : null
  };
  return pt(i);
}
function me(t, e) {
  const n = ue(t), r = [], i = n.formatVersion ?? J;
  return i > J && r.push({
    kind: "IncompatibleFormatSerializationVersion",
    currentVersion: String(J),
    dataVersion: String(i)
  }), {
    format: j.UfData,
    inputFiles: e?.inputFiles ?? [],
    name: n.project.name,
    tracks: n.project.tracks.map(
      (o, s) => le(s, o, e?.simpleImport ?? !1)
    ),
    timeSignatures: n.project.timeSignatures,
    tempos: n.project.tempos,
    ppq: 480,
    measurePrefix: n.project.measurePrefix,
    importWarnings: r,
    japaneseLyricsType: S.Unknown
  };
}
function Ir(t, e) {
  const n = ce(t);
  return me(n, e);
}
function fe(t, e) {
  return {
    name: t.name,
    notes: t.notes.map((n) => ({
      key: n.key,
      lyric: n.lyric,
      tickOn: n.tickOn,
      tickOff: n.tickOff,
      phoneme: n.phoneme
    })),
    pitch: e && t.pitch ? {
      ticks: t.pitch.data.map((n) => n[0]),
      values: t.pitch.data.map((n) => n[1]),
      isAbsolute: t.pitch.isAbsolute
    } : {
      ticks: [],
      values: [],
      isAbsolute: !1
    }
  };
}
function pe(t, e) {
  const n = e?.includePitch ?? !0;
  return {
    formatVersion: e?.formatVersion ?? J,
    project: {
      name: t.name,
      tracks: t.tracks.map((r) => fe(r, n)),
      timeSignatures: t.timeSignatures,
      tempos: t.tempos,
      measurePrefix: t.measurePrefix
    }
  };
}
function Mr(t, e) {
  const n = pe(t, e);
  return JSON.stringify(n);
}
function he(t) {
  return t.tickOff - t.tickOn;
}
const ht = 480, de = ht * 4, ke = 120, ge = 4, Te = 4, Dt = 60, $t = 5.566914341, Bt = 0.05776226505;
class dt {
  constructor(e = 1, n = de) {
    this._tick = 0, this._measure = 0, this._numerator = ge, this._denominator = Te, this.tickRate = e, this.ticksInFullNote = n;
  }
  get tick() {
    return this._tick;
  }
  get outputTick() {
    return Math.trunc(this._tick * this.tickRate);
  }
  get measure() {
    return this._measure;
  }
  get numerator() {
    return this._numerator;
  }
  get denominator() {
    return this._denominator;
  }
  get ticksInMeasure() {
    return this.ticksInFullNote * this._numerator / this._denominator;
  }
  goToTick(e, n, r) {
    const i = e / this.tickRate, s = (i - this._tick) / this.ticksInMeasure;
    this._measure += Math.trunc(s), this._tick = Math.trunc(i), this._numerator = n ?? this._numerator, this._denominator = r ?? this._denominator;
  }
  goToTimeSignatureMeasure(e) {
    this.goToMeasure(
      e.measurePosition,
      e.numerator,
      e.denominator
    );
  }
  goToMeasure(e, n, r) {
    const o = (e - this._measure) * this.ticksInMeasure;
    this._tick += o, this._measure = e, n != null && (this._numerator = n), r != null && (this._denominator = r);
  }
}
const tt = 8191, et = 2, Nt = 480, Pe = 5;
function ye(t) {
  const e = [];
  let n = -1;
  for (const r of t) {
    if (n < 0) {
      n = r.tickOff;
      continue;
    }
    if (n === r.tickOn)
      e.push(n);
    else if (n < r.tickOn)
      e.push(Math.trunc((r.tickOn + n) / 2));
    else
      throw new Error("Notes overlapping");
    n = r.tickOff;
  }
  return e;
}
function be(t, e, n) {
  if (n <= 0)
    return t;
  const r = [...t];
  for (let i = 0; i < e.length - 1; i += 1) {
    const o = e[i], s = e[i + 1];
    if (s.tickOn - o.tickOff > n)
      continue;
    const c = r.findIndex((f) => f[0] >= s.tickOn);
    if (c < 0)
      continue;
    const a = r[c];
    if (a[0] === s.tickOn || a[0] - s.tickOn > n)
      continue;
    const u = a[1];
    if (u == null)
      continue;
    const l = s.tickOn - n, m = [l, u];
    r.splice(c, 0, m);
    for (let f = r.length - 1; f >= 0; f -= 1) {
      const p = r[f];
      p !== m && p[0] >= l && p[0] < s.tickOn && r.splice(f, 1);
    }
  }
  return r;
}
function Se(t, e, n = 0) {
  if (!t.isAbsolute)
    return t.data.map(([u, l]) => [u, l]).filter((u) => u[1] != null).map(([u, l]) => [u, l]);
  if (e.length === 0)
    return null;
  const r = ye(e);
  let i = 0, o = e[0].key, s = r[0] ?? Number.POSITIVE_INFINITY;
  const c = t.data.map(([u, l]) => {
    for (; u >= s; )
      i += 1, s = r[i] ?? Number.POSITIVE_INFINITY, o = e[i].key;
    const m = l != null ? l - o : 0;
    return [u, m];
  });
  return be(c, e, n).filter((u) => u[1] != null).map(([u, l]) => [u, l]);
}
function Ut(t) {
  const r = t.map((i) => {
    const o = i.pit, s = i.pbs, c = /* @__PURE__ */ new Map();
    let a = 0, u = et;
    for (const l of s) {
      for (let m = a; m <= o.length - 1; m += 1) {
        const f = o[m];
        if (f.pos < l.pos)
          c.set(f.pos, f.value * u), m === o.length - 1 && (a = m);
        else {
          a = m;
          break;
        }
      }
      u = l.value;
    }
    if (a < o.length - 1)
      for (let l = a; l <= o.length - 1; l += 1) {
        const m = o[l];
        c.set(m.pos, m.value * u);
      }
    return Array.from(c.entries()).map(
      ([l, m]) => [l + i.startPos, m]
    );
  }).reduce((i, o) => {
    const s = o[0]?.[0];
    if (s == null)
      return i;
    const c = i.findIndex((a) => a[0] >= s);
    return c < 0 ? i.concat(o) : i.slice(0, c).concat(o);
  }, []).map(([i, o]) => [i, o / tt]);
  return r.length === 0 ? null : {
    data: r,
    isAbsolute: !1
  };
}
function Ne(t, e) {
  const n = Se(t, e, Pe);
  if (!n)
    return null;
  const r = [];
  let i = 0;
  for (const c of n)
    r.length === 0 ? r.push([c]) : c[0] - i >= Nt ? r.push([c]) : r[r.length - 1].push(c), i = c[0];
  const o = [], s = [];
  for (const c of r) {
    const a = c.reduce((l, m) => Math.max(l, Math.abs(m[1])), 0);
    let u = Math.ceil(Math.abs(a));
    u > et ? (s.push({ pos: c[0][0], value: u }), s.push({
      pos: c[c.length - 1][0] + Nt / 2,
      value: et
    })) : u = et;
    for (const [l, m] of c)
      o.push({
        pos: l,
        value: Math.max(
          -tt,
          Math.min(tt, Math.round(m * tt / u))
        )
      });
  }
  return {
    startPos: 0,
    pit: o,
    pbs: s
  };
}
const kt = 100, xe = 1, Oe = {
  masterTrack: "masterTrack",
  preMeasure: "preMeasure",
  timeSig: "timeSig",
  posMes: "m",
  nume: "nu",
  denomi: "de",
  tempo: "tempo",
  posTick: "t",
  bpm: "v",
  vsTrack: "vsTrack",
  trackName: "name",
  musicalPart: "vsPart",
  note: "note",
  duration: "dur",
  noteNum: "n",
  lyric: "y",
  xSampa: "p",
  trackNum: "tNo",
  playTime: "playTime",
  mCtrl: "cc",
  attr: "v",
  id: "id",
  pbsName: "S",
  pitName: "P"
}, ve = {
  masterTrack: "masterTrack",
  preMeasure: "preMeasure",
  timeSig: "timeSig",
  posMes: "posMes",
  nume: "nume",
  denomi: "denomi",
  tempo: "tempo",
  posTick: "posTick",
  bpm: "bpm",
  vsTrack: "vsTrack",
  trackName: "trackName",
  musicalPart: "musicalPart",
  note: "note",
  duration: "durTick",
  noteNum: "noteNum",
  lyric: "lyric",
  xSampa: "phnms",
  trackNum: "vsTrackNo",
  playTime: "playTime",
  mCtrl: "mCtrl",
  attr: "attr",
  id: "id",
  pbsName: "PBS",
  pitName: "PIT"
};
function jt(t) {
  return t.includes('xmlns="http://www.yamaha.co.jp/vocaloid/schema/vsq4/"') ? "vsq4" : "vsq3";
}
function Xt(t) {
  return t === "vsq4" ? Oe : ve;
}
function nt(t) {
  return t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
}
function $(t, e) {
  const n = t.getElementsByTagName(e).item(0);
  return n instanceof Element ? n : null;
}
function A(t, e) {
  return $(t, e)?.textContent?.trim() ?? null;
}
function Kt(t, e) {
  const n = new dt();
  for (const r of t) {
    if (r.measurePosition >= e) break;
    n.goToTimeSignatureMeasure(r);
  }
  return n.goToMeasure(e), n.tick;
}
function Ae(t, e, n, r) {
  const i = Array.from(t.getElementsByTagName(e.timeSig)).map((l) => {
    const m = Number(A(l, e.posMes)), f = Number(A(l, e.nume)), p = Number(A(l, e.denomi));
    return !Number.isFinite(m) || !Number.isFinite(f) || !Number.isFinite(p) ? null : { measurePosition: m, numerator: f, denominator: p };
  }).filter((l) => l !== null), o = i.length > 0 ? i : [{ measurePosition: 0, numerator: 4, denominator: 4 }];
  i.length === 0 && r.push({ kind: "TimeSignatureNotFound" });
  const s = Kt(o, n), c = o.map((l) => ({
    ...l,
    measurePosition: l.measurePosition - n
  })), a = c.reduce((l, m, f) => m.measurePosition <= 0 ? f : l, 0), u = c.slice(a);
  return u.length > 0 && (u[0] = { ...u[0], measurePosition: 0 }), { tickPrefix: s, timeSignatures: u };
}
function Ie(t, e, n, r) {
  const i = Array.from(t.getElementsByTagName(e.tempo)).map((a) => {
    const u = Number(A(a, e.posTick)), l = Number(A(a, e.bpm));
    return !Number.isFinite(u) || !Number.isFinite(l) ? null : { tickPosition: u - n, bpm: l / kt };
  }).filter((a) => a !== null), o = i.length > 0 ? i : [{ tickPosition: 0, bpm: 120 }];
  i.length === 0 && r.push({ kind: "TempoNotFound" });
  const s = o.reduce((a, u, l) => u.tickPosition <= 0 ? l : a, 0), c = o.slice(s);
  return c.length > 0 && (c[0] = { ...c[0], tickPosition: 0 }), c;
}
function Me(t, e, n, r, i) {
  const o = A(t, n.trackName) ?? `Track ${e + 1}`, s = Array.from(t.getElementsByTagName(n.musicalPart)), c = s.flatMap((u) => {
    const l = Number(A(u, n.posTick) ?? "0") - r;
    return Array.from(u.getElementsByTagName(n.note)).map((f) => ({ tickOffset: l, noteNode: f }));
  }).map(({ tickOffset: u, noteNode: l }, m) => {
    const f = Number(A(l, n.noteNum) ?? "0"), p = Number(A(l, n.posTick) ?? "0"), h = Number(A(l, n.duration) ?? "0"), d = A(l, n.lyric) ?? i.defaultLyric ?? "あ", P = A(l, n.xSampa);
    return {
      id: m,
      key: f,
      lyric: d,
      tickOn: p + u,
      tickOff: p + u + h,
      phoneme: P ?? void 0
    };
  });
  let a = null;
  if (!i.simpleImport) {
    const u = s.map((l) => {
      const m = Number(A(l, n.posTick) ?? "0") - r, f = Array.from(l.getElementsByTagName(n.mCtrl)), p = f.filter((d) => $(d, n.attr)?.getAttribute(n.id) === n.pbsName).map((d) => ({
        pos: Number(A(d, n.posTick) ?? "0"),
        value: Number($(d, n.attr)?.textContent?.trim() ?? "0")
      })).filter((d) => Number.isFinite(d.pos) && Number.isFinite(d.value)), h = f.filter((d) => $(d, n.attr)?.getAttribute(n.id) === n.pitName).map((d) => ({
        pos: Number(A(d, n.posTick) ?? "0"),
        value: Number($(d, n.attr)?.textContent?.trim() ?? "0")
      })).filter((d) => Number.isFinite(d.pos) && Number.isFinite(d.value));
      return {
        startPos: m,
        pit: h,
        pbs: p
      };
    });
    a = Ut(u);
  }
  return pt({ id: e, name: o, notes: c, pitch: a });
}
function Ee(t, e) {
  const i = new DOMParser().parseFromString(t, "text/xml").documentElement;
  if (!i)
    throw new Error("VSQX root not found");
  const o = jt(t), s = Xt(o), c = $(i, s.masterTrack);
  if (!c)
    throw new Error("VSQX masterTrack not found");
  const a = [], u = Number(A(c, s.preMeasure) ?? "0"), { tickPrefix: l, timeSignatures: m } = Ae(c, s, u, a), f = Ie(c, s, l, a), p = Array.from(i.getElementsByTagName(s.vsTrack)).map(
    (h, d) => Me(h, d, s, l, e ?? {})
  );
  return {
    format: j.Vsqx,
    inputFiles: [],
    name: "vsqx",
    tracks: p,
    timeSignatures: m,
    tempos: f,
    ppq: 480,
    measurePrefix: u,
    importWarnings: a,
    japaneseLyricsType: S.Unknown,
    extras: {
      vsqx: {
        schemaVersion: o,
        originalXml: t,
        preservedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  };
}
function I(t, e) {
  const n = t.match(new RegExp(`<${e}>([\\s\\S]*?)</${e}>`));
  return n ? n[1].trim() : null;
}
function D(t, e) {
  return Array.from(t.matchAll(new RegExp(`<${e}>([\\s\\S]*?)</${e}>`, "g"))).map(
    (n) => n[1]
  );
}
function xt(t, e, n) {
  return D(t, e.mCtrl).map((r) => {
    const i = Number(I(r, e.posTick) ?? "0"), o = r.match(
      new RegExp(`<${e.attr}\\s+${e.id}="([^"]+)">([\\s\\S]*?)</${e.attr}>`)
    );
    if (!o || o[1] !== n)
      return null;
    const c = Number(nt(o[2]).trim());
    return !Number.isFinite(i) || !Number.isFinite(c) ? null : { pos: i, value: c };
  }).filter((r) => r !== null);
}
function _e(t, e) {
  const n = jt(t), r = Xt(n), i = t.match(/<masterTrack>([\s\S]*?)<\/masterTrack>/);
  if (!i) throw new Error("VSQX masterTrack not found");
  const o = i[1], s = [], c = Number(I(o, r.preMeasure) ?? "0"), a = D(o, r.timeSig).map((k) => {
    const g = Number(I(k, r.posMes)), T = Number(I(k, r.nume)), y = Number(I(k, r.denomi));
    return !Number.isFinite(g) || !Number.isFinite(T) || !Number.isFinite(y) ? null : { measurePosition: g, numerator: T, denominator: y };
  }).filter((k) => k !== null), u = a.length > 0 ? a : [{ measurePosition: 0, numerator: 4, denominator: 4 }];
  a.length === 0 && s.push({ kind: "TimeSignatureNotFound" });
  const l = Kt(u, c), m = u.map((k) => ({
    ...k,
    measurePosition: k.measurePosition - c
  })), f = m.slice(
    m.reduce((k, g, T) => g.measurePosition <= 0 ? T : k, 0)
  );
  f.length > 0 && (f[0] = { ...f[0], measurePosition: 0 });
  const p = D(o, r.tempo).map((k) => {
    const g = Number(I(k, r.posTick)), T = Number(I(k, r.bpm));
    return !Number.isFinite(g) || !Number.isFinite(T) ? null : { tickPosition: g - l, bpm: T / kt };
  }).filter((k) => k !== null), h = p.length > 0 ? p : [{ tickPosition: 0, bpm: 120 }];
  p.length === 0 && s.push({ kind: "TempoNotFound" });
  const d = h.slice(h.reduce((k, g, T) => g.tickPosition <= 0 ? T : k, 0));
  d.length > 0 && (d[0] = { ...d[0], tickPosition: 0 });
  const P = D(t, r.vsTrack).map((k, g) => {
    const T = nt(I(k, r.trackName) ?? `Track ${g + 1}`), y = D(k, r.musicalPart), x = y.flatMap((b) => {
      const N = Number(I(b, r.posTick) ?? "0") - l;
      return D(b, r.note).map((E) => ({ tickOffset: N, noteBlock: E }));
    }).map(({ tickOffset: b, noteBlock: N }, v) => {
      const E = Number(I(N, r.noteNum) ?? "0"), w = Number(I(N, r.posTick) ?? "0"), L = Number(I(N, r.duration) ?? "0"), K = nt(I(N, r.lyric) ?? e?.defaultLyric ?? "あ"), St = I(N, r.xSampa), oe = St == null ? void 0 : nt(St);
      return {
        id: v,
        key: E,
        lyric: K,
        tickOn: w + b,
        tickOff: w + b + L,
        phoneme: oe
      };
    });
    let O = null;
    if (!e?.simpleImport) {
      const b = y.map((N) => {
        const v = Number(I(N, r.posTick) ?? "0") - l, E = xt(N, r, r.pbsName), w = xt(N, r, r.pitName);
        return { startPos: v, pit: w, pbs: E };
      });
      O = Ut(b);
    }
    return pt({
      id: g,
      name: T,
      notes: x,
      pitch: O
    });
  });
  return {
    format: j.Vsqx,
    inputFiles: [],
    name: "vsqx",
    tracks: P,
    timeSignatures: f,
    tempos: d,
    ppq: 480,
    measurePrefix: c,
    importWarnings: s,
    japaneseLyricsType: S.Unknown,
    extras: {
      vsqx: {
        schemaVersion: n,
        originalXml: t,
        preservedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  };
}
function Er(t, e) {
  return typeof DOMParser < "u" ? Ee(t, e) : _e(t, e);
}
function Y(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function we(t, e, n) {
  if (t.notes.length === 0)
    return `<vsTrack><tNo>${e}</tNo><name>${Y(t.name)}</name></vsTrack>`;
  const r = t.notes[t.notes.length - 1].tickOff, i = "<singer><t>0</t><bs>0</bs><pc>0</pc></singer>", o = t.pitch ? Ne(t.pitch, t.notes) : null, c = (o ? [
    ...o.pbs.map((u) => ({ event: u, name: "S" })),
    ...o.pit.map((u) => ({ event: u, name: "P" }))
  ].sort((u, l) => u.event.pos - l.event.pos) : []).map(({ event: u, name: l }) => `<cc><t>${u.pos}</t><v id="${l}">${u.value}</v></cc>`).join(""), a = t.notes.map((u) => {
    const l = Y(u.lyric), m = u.phoneme ? `<p>${Y(u.phoneme)}</p>` : "";
    return [
      "<note>",
      `<t>${u.tickOn}</t>`,
      `<dur>${he(u)}</dur>`,
      `<n>${u.key}</n>`,
      `<y>${l}</y>`,
      m,
      "</note>"
    ].join("");
  }).join("");
  return [
    "<vsTrack>",
    `<tNo>${e}</tNo>`,
    `<name>${Y(t.name)}</name>`,
    "<comment><![CDATA[Track]]></comment>",
    "<vsPart>",
    `<t>${n}</t>`,
    `<playTime>${r}</playTime>`,
    "<name><![CDATA[NewPart]]></name>",
    "<comment><![CDATA[New Musical Part]]></comment>",
    i,
    c,
    a,
    "</vsPart>",
    "</vsTrack>"
  ].join("");
}
function Ve(t) {
  return [
    "<vsUnit>",
    `<tNo>${t}</tNo>`,
    "<iGin>0</iGin>",
    "<sLvl>-898</sLvl>",
    "<sEnable>0</sEnable>",
    "<m>0</m>",
    "<s>0</s>",
    "<pan>64</pan>",
    "<vol>0</vol>",
    "</vsUnit>"
  ].join("");
}
function _r(t, e) {
  const n = Math.max(t.measurePrefix, xe), r = t.timeSignatures[0] ?? { numerator: 4, denominator: 4 }, o = 1920 * r.numerator / r.denominator * n, s = t.timeSignatures.map((h, d) => `<timeSig><m>${d === 0 ? 0 : h.measurePosition + n}</m><nu>${h.numerator}</nu><de>${h.denominator}</de></timeSig>`).join(""), c = t.tempos.map((h, d) => `<tempo><t>${d === 0 ? 0 : h.tickPosition + o}</t><v>${Math.trunc(h.bpm * kt)}</v></tempo>`).join(""), a = t.tracks.map((h, d) => we(h, d, o)).join(""), u = t.tracks.map((h, d) => Ve(d)).join(""), m = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<vsq4 xmlns="http://www.yamaha.co.jp/vocaloid/schema/vsq4/">',
    "<vender><![CDATA[Yamaha corporation]]></vender>",
    "<version><![CDATA[4.0.0.3]]></version>",
    [
      "<vVoiceTable>",
      "<vVoice>",
      "<bs>0</bs>",
      "<pc>0</pc>",
      "<id><![CDATA[BCXDC6CZLSZHZCB4]]></id>",
      "<name><![CDATA[VY2V3]]></name>",
      "<vPrm><bre>0</bre><bri>0</bri><cle>0</cle><gen>0</gen><ope>0</ope></vPrm>",
      "</vVoice>",
      "</vVoiceTable>"
    ].join(""),
    "<mixer>",
    "<masterUnit><oDev>0</oDev><rLvl>0</rLvl><vol>0</vol></masterUnit>",
    u,
    "<monoUnit><iGin>0</iGin><sLvl>-898</sLvl><sEnable>0</sEnable><m>0</m><s>0</s><pan>64</pan><vol>0</vol></monoUnit>",
    "<stUnit><iGin>0</iGin><m>0</m><s>0</s><vol>-129</vol></stUnit>",
    "</mixer>",
    "<masterTrack>",
    "<seqName><![CDATA[Untitled0]]></seqName>",
    "<comment><![CDATA[New VSQ File]]></comment>",
    "<resolution>480</resolution>",
    `<preMeasure>${n}</preMeasure>`,
    s,
    c,
    "</masterTrack>",
    a,
    "<monoTrack></monoTrack>",
    "<stTrack></stTrack>",
    "<aux><id><![CDATA[AUX_VST_HOST_CHUNK_INFO]]></id><content><![CDATA[VlNDSwAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=]]></content></aux>",
    "</vsq4>"
  ].join(""), p = t.tracks.some(
    (h) => h.notes.some((d) => d.phoneme !== void 0 && d.phoneme !== null)
  ) ? [] : [{ kind: "PhonemeResetRequiredV4" }];
  return {
    content: m,
    notifications: p,
    retainedExtras: e?.retainOriginalExtras === !1 ? void 0 : t.extras ?? {}
  };
}
const Fe = "2.0", gt = 480, lt = gt * 4, B = 2, q = 12, Re = 60;
function Ce(t) {
  return t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
}
function qt(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function M(t, e) {
  const n = t.match(new RegExp(`<${e}(?:\\s[^>]*)?>([\\s\\S]*?)</${e}>`));
  return n ? n[1].trim() : null;
}
function rt(t, e) {
  return Array.from(t.matchAll(new RegExp(`<${e}(?:\\s[^>]*)?>([\\s\\S]*?)</${e}>`, "g"))).map(
    (n) => n[1]
  );
}
function Le(t) {
  return lt * t.numerator / t.denominator;
}
function De(t) {
  const n = t.match(/<tie\b[^>]*\btype="([^"]+)"/)?.[1];
  return n === "start" || n === "stop" ? n : null;
}
function $e(t) {
  const e = M(t, "pitch");
  if (!e) return Re;
  const n = M(e, "step"), r = Number(M(e, "alter") ?? "0"), i = Number(M(e, "octave") ?? "4"), o = n === "C" ? 0 : n === "D" ? 2 : n === "E" ? 4 : n === "F" ? 5 : n === "G" ? 7 : n === "A" ? 9 : n === "B" ? 11 : 0;
  return (i + 1) * q + o + r;
}
function Be(t) {
  const e = Math.floor(t / q) - 1;
  switch ((t % q + q) % q) {
    case 0:
      return { step: "C", octave: e };
    case 1:
      return { step: "C", alter: 1, octave: e };
    case 2:
      return { step: "D", octave: e };
    case 3:
      return { step: "D", alter: 1, octave: e };
    case 4:
      return { step: "E", octave: e };
    case 5:
      return { step: "F", octave: e };
    case 6:
      return { step: "F", alter: 1, octave: e };
    case 7:
      return { step: "G", octave: e };
    case 8:
      return { step: "G", alter: 1, octave: e };
    case 9:
      return { step: "A", octave: e };
    case 10:
      return { step: "A", alter: 1, octave: e };
    default:
      return { step: "B", octave: e };
  }
}
function Ue(t, e, n, r) {
  const i = rt(t, "measure"), o = r.importTickRate, s = [];
  let c = !1;
  for (let a = 0; a < i.length; a += 1) {
    const u = i[a];
    let l = r.measureBorders[a] ?? 0;
    const m = rt(u, "note");
    for (const f of m) {
      const p = M(f, "duration");
      let h;
      if (p == null) {
        if (/<grace(\s|\/|>)/.test(f))
          continue;
        throw new Error("MusicXML duration not found");
      }
      if (h = Math.round(Number(p) * o), /<rest(\s|\/|>)/.test(f)) {
        l += h;
        continue;
      }
      const P = $e(f), k = Ce(M(M(f, "lyric") ?? "", "text") ?? n), g = c ? (() => {
        const y = s.pop();
        if (!y)
          throw new Error("MusicXML tie continuation note not found");
        return {
          ...y,
          tickOff: y.tickOff + h
        };
      })() : {
        id: 0,
        key: P,
        lyric: k,
        tickOn: l,
        tickOff: l + h
      };
      l += h, s.push(g);
      const T = De(f);
      T === "start" ? c = !0 : T === "stop" && (c = !1);
    }
  }
  return {
    id: e,
    name: `Track ${e + 1}`,
    notes: s.map((a, u) => ({ ...a, id: u }))
  };
}
function je(t) {
  const e = rt(t, "measure"), n = e[0] ?? "", r = Number(M(n, "divisions") ?? M(t, "divisions") ?? "480") || 480, i = gt / r, o = [], s = [], c = [], a = [0];
  let u = { numerator: 4, denominator: 4 }, l = 0;
  for (let m = 0; m < e.length; m += 1) {
    const f = e[m], p = M(M(f, "time") ?? "", "beats"), h = M(M(f, "time") ?? "", "beat-type");
    if (p && h) {
      const P = {
        measurePosition: m,
        numerator: Number(p),
        denominator: Number(h)
      };
      o.push(P), u = P;
    }
    const d = f.match(/<sound[^>]*tempo="([^"]+)"/);
    d && s.push({
      tickPosition: l,
      bpm: Number(d[1])
    }), l += Le(u), a.push(l);
  }
  return o.length === 0 && c.push("TimeSignatureNotFound"), s.length === 0 && c.push("TempoNotFound"), {
    timeSignatures: o.length > 0 ? o : [{ measurePosition: 0, numerator: 4, denominator: 4 }],
    tempos: s.length > 0 ? s : [{ tickPosition: 0, bpm: 120 }],
    importTickRate: i,
    measureBorders: a,
    importWarnings: c
  };
}
function wr(t, e) {
  const n = rt(t, "part");
  if (n.length === 0)
    throw new Error("MusicXML part not found");
  const r = je(n[0]), i = n.map((o, s) => Ue(o, s, e?.defaultLyric ?? "あ", r));
  return {
    format: j.MusicXml,
    inputFiles: [],
    name: "musicxml",
    tracks: i,
    timeSignatures: r.timeSignatures,
    tempos: r.tempos,
    ppq: 480,
    measurePrefix: 0,
    importWarnings: r.importWarnings.map((o) => ({ kind: o })),
    japaneseLyricsType: S.Unknown,
    extras: {
      musicxml: {
        originalXml: t,
        preservedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  };
}
function Xe(t) {
  return {
    ...t,
    tempos: t.tempos.map((e) => ({
      ...e,
      tickPosition: Math.trunc(e.tickPosition * B)
    })),
    tracks: t.tracks.map((e) => ({
      ...e,
      notes: e.notes.map((n) => ({
        ...n,
        tickOn: Math.trunc(n.tickOn * B),
        tickOff: Math.trunc(n.tickOff * B)
      }))
    }))
  };
}
function Ke(t, e) {
  const n = t.tempos.map((o) => ({
    kind: "Tempo",
    tick: o.tickPosition,
    tempo: o
  })), r = e.notes.map((o) => ({
    kind: "NoteStart",
    tick: o.tickOn,
    note: o
  }));
  return [...e.notes.map((o) => ({
    kind: "NoteEnd",
    tick: o.tickOff,
    note: o
  })), ...n, ...r].sort((o, s) => o.tick - s.tick);
}
function qe(t, e) {
  if (t.length === 0)
    return [
      {
        tickStart: 0,
        length: lt * B,
        timeSignature: e.find((a) => a.measurePosition === 0) ?? null,
        contents: []
      }
    ];
  const n = new dt(1, lt * B), r = [0];
  for (const a of e) {
    const u = n.measure, l = n.ticksInMeasure;
    n.goToMeasure(a.measurePosition, a.numerator, a.denominator);
    const m = n.measure;
    for (let f = 0; f < m - u; f += 1)
      r.push(r[r.length - 1] + l);
  }
  const i = t[t.length - 1].tick;
  if (i >= n.tick + n.ticksInMeasure) {
    const a = n.measure, u = n.ticksInMeasure;
    n.goToTick(i);
    const l = n.measure;
    for (let m = 0; m < l - a; m += 1)
      r.push(r[r.length - 1] + u);
  }
  r.push(r[r.length - 1] + n.ticksInMeasure);
  const o = r.slice(0, -1).map((a, u) => {
    const l = r[u + 1], m = t.filter((f) => f.kind === "NoteEnd" ? f.tick > a && f.tick <= l : f.tick >= a && f.tick < l);
    return { start: a, end: l, group: m };
  }), s = /* @__PURE__ */ new Map();
  let c = null;
  for (const { start: a, end: u, group: l } of o) {
    let m = 0;
    const f = [];
    for (const h of l) {
      const d = h.tick - a;
      if (d > m && (c == null && f.push({
        kind: "Rest",
        duration: d - m
      }), m = d), h.kind === "Tempo")
        c == null ? f.push({ kind: "Tempo", bpm: h.tempo.bpm }) : (f.push({
          kind: "Note",
          duration: h.tick - c.head,
          note: c.note,
          noteType: c.note.tickOn === c.head ? "Begin" : "Middle"
        }), c = { note: c.note, head: h.tick }, f.push({ kind: "Tempo", bpm: h.tempo.bpm }));
      else if (h.kind === "NoteStart")
        c = { note: h.note, head: h.tick };
      else {
        if (c == null)
          throw new Error("MusicXML ongoing note not found");
        f.push({
          kind: "Note",
          duration: h.note.tickOff - c.head,
          note: h.note,
          noteType: h.note.tickOn === c.head ? "Single" : "End"
        }), c = null;
      }
    }
    const p = u - a - m;
    p > 0 && (c == null ? f.push({ kind: "Rest", duration: p }) : (f.push({
      kind: "Note",
      duration: u - c.head,
      note: c.note,
      noteType: c.note.tickOn === c.head ? "Begin" : "Middle"
    }), c = { note: c.note, head: u })), s.set(`${a}:${u}`, f);
  }
  return Array.from(s.entries()).map(([a, u], l) => {
    const [m, f] = a.split(":"), p = Number(m), h = Number(f);
    return {
      tickStart: p,
      length: h - p,
      timeSignature: e.find((d) => d.measurePosition === l) ?? null,
      contents: u
    };
  }).sort((a, u) => a.tickStart - u.tickStart);
}
function Ge(t, e) {
  const n = t === "Begin" ? "begin" : t === "Middle" ? "middle" : t === "End" ? "end" : "single", r = t === "Begin" || t === "Single" ? `<text>${qt(e)}</text>` : "<text></text>";
  return ["<lyric>", `<syllabic>${n}</syllabic>`, r, "</lyric>"].join("");
}
function We(t, e, n) {
  const r = Be(t.key), i = r.alter != null ? `<alter>${r.alter}</alter>` : "", o = n === "Begin" ? "start" : n === "End" ? "stop" : null, s = o == null ? "" : `<tie type="${o}"/>`, c = o == null ? "" : `<notations><tied type="${o}"/></notations>`;
  return [
    "<note>",
    "<pitch>",
    `<step>${r.step}</step>`,
    i,
    `<octave>${r.octave}</octave>`,
    "</pitch>",
    `<duration>${e}</duration>`,
    s,
    c,
    Ge(n, t.lyric),
    "</note>"
  ].join("");
}
function ze(t) {
  return [
    `<sound tempo="${t}"/>`,
    "<direction>",
    "<direction-type>",
    "<metronome>",
    "<beat-unit>quarter</beat-unit>",
    `<per-minute>${t}</per-minute>`,
    "</metronome>",
    "</direction-type>",
    `<sound tempo="${t}"/>`,
    "</direction>"
  ].join("");
}
function He(t) {
  return ["<note>", "<rest/>", `<duration>${t}</duration>`, "</note>"].join("");
}
function Ye(t, e) {
  return [
    "<attributes>",
    e ? `<divisions>${Math.trunc(gt * B)}</divisions>` : "",
    "<time>",
    `<beats>${t.numerator}</beats>`,
    `<beat-type>${t.denominator}</beat-type>`,
    "</time>",
    "</attributes>"
  ].join("");
}
function Qe(t, e) {
  const n = e.map((r, i) => {
    const o = r.contents.map((c) => c.kind === "Tempo" ? ze(c.bpm) : c.kind === "Rest" ? He(c.duration) : We(c.note, c.duration, c.noteType)).join(""), s = r.timeSignature != null ? Ye(r.timeSignature, i === 0) : "";
    return [`<measure number="${i + 1}">`, s, o, "</measure>"].join("");
  }).join("");
  return [
    `<part id="P${t.id + 1}">`,
    n,
    "</part>"
  ].join("");
}
function Vr(t, e) {
  if ((e?.mode ?? "generate") === "preserve" && e?.noOp && e.originalText != null)
    return e.originalText;
  const r = Xe(t), i = r.tracks.length > 0 ? r.tracks : [{ id: 0, name: "Track 1", notes: [] }], o = r.timeSignatures.length > 0 ? r.timeSignatures : [{ measurePosition: 0, numerator: 4, denominator: 4 }], s = [
    "<part-list>",
    ...i.map(
      (a) => `<score-part id="P${a.id + 1}"><part-name>${qt(a.name || `Track ${a.id + 1}`)}</part-name></score-part>`
    ),
    "</part-list>"
  ].join(""), c = i.map((a) => {
    const u = Ke(r, a), l = qe(u, o);
    return Qe(a, l);
  }).join("");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<score-partwise version="${Fe}">`,
    s,
    c,
    "</score-partwise>"
  ].join("");
}
function Ze(t) {
  const e = t.trim();
  return e.startsWith("<?xml") ? e.replace(
    /^<\?xml[^?]*\?>/,
    '<?xml version="1.0" encoding="UTF-8"?>'
  ) : e;
}
function Je(t) {
  if (!t.startsWith("<") || t.startsWith("</") || t.startsWith("<?") || t.startsWith("<!"))
    return t;
  const e = t.match(/^<([^\s/>]+)([\s\S]*?)(\/?)>$/);
  if (!e) return t;
  const [, n, r, i] = e, o = /([^\s=]+)\s*=\s*("[^"]*"|'[^']*')/g, s = [];
  let c = o.exec(r);
  for (; c; )
    s.push({ name: c[1], value: c[2] }), c = o.exec(r);
  if (s.length === 0)
    return `<${n}${i ? "/" : ""}>`;
  s.sort((u, l) => u.name.localeCompare(l.name));
  const a = s.map((u) => `${u.name}=${u.value}`).join(" ");
  return `<${n} ${a}${i ? "/" : ""}>`;
}
function Ot(t) {
  return Ze(t).replace(/>\s+</g, "><").replace(/<[^>]+>/g, (r) => Je(r));
}
function tn(t, e) {
  return Ot(t) === Ot(e);
}
function vt(t) {
  return typeof t == "string" ? { "sequence.vsqx": t } : t;
}
function en(t, e, n, r) {
  return r.canonicalizeXmlEntries !== !1 && n.endsWith(".xml") ? tn(t, e) : t === e;
}
function Fr(t, e, n = {}) {
  const r = vt(t), i = vt(e), o = Object.keys(r).sort(), s = Object.keys(i).sort(), c = o.filter((m) => !s.includes(m)), a = s.filter((m) => !o.includes(m)), l = o.filter((m) => s.includes(m)).filter(
    (m) => !en(r[m], i[m], m, n)
  );
  return {
    ok: c.length === 0 && a.length === 0 && l.length === 0,
    missingEntries: c,
    extraEntries: a,
    mismatchedEntries: l
  };
}
const nn = 480;
function Rr(t, e) {
  return Math.trunc(t * nn / e);
}
var rn = /* @__PURE__ */ ((t) => (t[t.NoteOff = 8] = "NoteOff", t[t.NoteOn = 9] = "NoteOn", t))(rn || {});
function Cr(t, e) {
  return t << 4 | e;
}
var on = /* @__PURE__ */ ((t) => (t[t.Text = 1] = "Text", t[t.TrackName = 3] = "TrackName", t[t.Lyric = 5] = "Lyric", t[t.Tempo = 81] = "Tempo", t[t.TimeSignature = 88] = "TimeSignature", t[t.EndOfTrack = 47] = "EndOfTrack", t))(on || {});
function Lr(t) {
  return [255, t];
}
function Dr(t) {
  return Math.trunc(1e3 * 1e3 * 60 / t * 100) / 100;
}
function $r(t) {
  return Math.trunc(1e3 * 1e3 * 60 / t);
}
function Br(t, e) {
  return [t, Math.trunc(Math.log2(e)), 24, 8];
}
function Ur(t) {
  const e = Number(t);
  if (Number.isFinite(e))
    return e;
  const n = t.indexOf("/");
  if (n <= 0)
    return null;
  const r = Number.parseInt(t.slice(0, n), 10), i = Number.parseInt(t.slice(n + 1), 10);
  return !Number.isFinite(r) || !Number.isFinite(i) ? null : r / i;
}
function ot(t, e, n) {
  if (t.length === 0)
    return;
  const r = [];
  for (let i = 0; i < t.length - 1; i += 1) {
    const o = t[i], s = t[i + 1], c = [];
    for (let a = o[0] + 1; a < s[0]; a += 1)
      (a - o[0]) % e === 0 && c.push(a);
    r.push(o, ...n(o, s, c));
  }
  return r.push(t[t.length - 1]), r;
}
function X(t, e) {
  return ot(t, e, (n, r, i) => {
    const [o, s] = n, [c, a] = r;
    return i.map((u) => [u, s + (u - o) * (a - s) / (c - o)]);
  });
}
function R(t, e) {
  return ot(t, e, (n, r, i) => {
    const [o, s] = n, [c, a] = r, u = o, l = (s + a) / 2, m = Math.PI / (c - o), f = (s - a) / 2;
    return i.map((p) => [p, f * Math.cos(m * (p - u)) + l]);
  });
}
function Gt(t, e) {
  return ot(t, e, (n, r, i) => {
    const [o, s] = n, [c, a] = r, u = o, l = a, m = Math.PI / (c - o) / 2, f = s - a;
    return i.map((p) => [p, f * Math.cos(m * (p - u)) + l]);
  });
}
function Wt(t, e) {
  return ot(t, e, (n, r, i) => {
    const [o, s] = n, [c, a] = r, u = o, l = s, m = Math.PI / (c - o) / 2, f = s - a, p = Math.PI / 2;
    return i.map((h) => [h, f * Math.cos(m * (h - u) + p) + l]);
  });
}
function sn(t, e) {
  const n = t.notes.filter((i) => i.tickOff <= e).map((i, o) => ({ ...i, id: o })), r = t.pitch ? {
    ...t.pitch,
    data: t.pitch.data.filter(([i]) => i <= e)
  } : t.pitch;
  return {
    ...t,
    notes: n,
    pitch: r
  };
}
function jr(t, e) {
  const n = t.tracks.map((s) => sn(s, e)), r = new dt(), i = [];
  t.timeSignatures.forEach((s) => {
    r.goToTimeSignatureMeasure(s), r.tick <= e && i.push(s);
  });
  const o = t.tempos.filter((s) => s.tickPosition <= e);
  return {
    ...t,
    tracks: n,
    timeSignatures: i,
    tempos: o
  };
}
function cn(t, e) {
  const n = t.notes.map((i) => ({
    ...i,
    tickOn: Math.round(i.tickOn * e),
    tickOff: Math.round(i.tickOff * e)
  })), r = t.pitch ? {
    ...t.pitch,
    data: t.pitch.data.map(([i, o]) => [Math.round(i * e), o])
  } : t.pitch;
  return {
    ...t,
    notes: n,
    pitch: r
  };
}
function Xr(t, e) {
  return t.timeSignatures.some((n) => {
    const r = n.measurePosition * e;
    return Math.ceil(r) !== r;
  });
}
function Kr(t, e) {
  const n = t.tracks.map((o) => cn(o, e)), r = t.tempos.map((o) => ({
    ...o,
    tickPosition: Math.round(o.tickPosition * e),
    bpm: o.bpm * e
  })), i = t.timeSignatures.map((o) => ({
    ...o,
    measurePosition: Math.round(o.measurePosition * e)
  })).reduce((o, s) => o.length === 0 ? [s] : o[o.length - 1].measurePosition === s.measurePosition ? o : [...o, s], []);
  return {
    ...t,
    tracks: n,
    tempos: r,
    timeSignatures: i
  };
}
const qr = ["2", "5/3", "3/2", "4/3", "6/5", "4/5", "3/4", "3/5", "1/2"];
function an(t, e, n) {
  let r = n[0] - e[0], i = n[1] - e[1];
  const o = Math.hypot(r, i);
  o > 0 && (r /= o, i /= o);
  const s = t[0] - e[0], c = t[1] - e[1], a = r * s + i * c, u = s - a * r, l = c - a * i;
  return Math.hypot(u, l);
}
function mt(t, e) {
  if (t.length < 2)
    return t;
  let n = 0, r = 0;
  const i = t.length - 1;
  for (let o = 1; o < i; o += 1) {
    const s = an(t[o], t[0], t[i]);
    s > n && (r = o, n = s);
  }
  if (n > e) {
    const o = t.slice(0, r + 1), s = t.slice(r), c = mt(o, e), a = mt(s, e);
    return [...c.slice(0, c.length - 1), ...a];
  }
  return [t[0], t[t.length - 1]];
}
function un(t, e) {
  let r = 0.05;
  for (; ; ) {
    const i = mt(t, r);
    if (i.length < e)
      return i;
    r += 0.05;
  }
}
function ln(t, e, n) {
  const r = [], i = t.reduce((s, [c]) => s == null ? c : Math.min(s, c), void 0) ?? 0, o = t.reduce((s, [c]) => s == null ? c : Math.max(s, c), void 0) ?? 0;
  for (let s = i; s <= o; s += e) {
    const c = [...t].reverse().find(([u]) => u <= s), a = t.find(([u]) => u >= s);
    r.push([s, n(c, a, s)]);
  }
  return r;
}
function mn(t, e) {
  return ln(t, e, (n, r) => n?.[1] ?? r?.[1] ?? null);
}
function At(t, e) {
  return t * 6e4 / (e * ht);
}
function fn(t, e, n) {
  return (typeof e == "function" ? e(t) : e) ? n(t) : t;
}
function pn(t) {
  return Dt + (t - $t) / Bt;
}
function hn(t) {
  return (t - Dt) * Bt + $t;
}
function dn(t) {
  const e = [];
  let n = -1;
  for (const r of t) {
    if (n < 0) {
      n = r.tickOff;
      continue;
    }
    if (n === r.tickOn)
      e.push(n);
    else if (n < r.tickOn)
      e.push(Math.trunc((r.tickOn + n) / 2));
    else
      throw new Error("NotesOverlappingException");
    n = r.tickOff;
  }
  return e;
}
function kn(t, e, n) {
  if (n <= 0)
    return t;
  const r = [...t];
  return e.slice(0, -1).forEach((i, o) => {
    const s = e[o + 1];
    if (s.tickOn - i.tickOff > n)
      return;
    const c = r.findIndex((f) => f[0] >= s.tickOn);
    if (c < 0)
      return;
    const a = r[c];
    if (a[0] === s.tickOn || a[0] - s.tickOn > n)
      return;
    const u = a[1];
    if (u == null)
      return;
    const l = s.tickOn - n, m = [l, u];
    r.splice(c, 0, m);
    for (let f = r.length - 1; f >= 0; f -= 1)
      r[f][0] >= l && r[f][0] < s.tickOn && r[f] !== m && r.splice(f, 1);
  }), r;
}
function zt(t, e, n, r = 0) {
  if (t.isAbsolute && n || !t.isAbsolute && !n)
    return t.data;
  if (e.length === 0)
    return null;
  const i = dn(e);
  let o = 0, s = e[0].key, c = i[0] ?? Number.MAX_SAFE_INTEGER;
  const a = t.data.map(([u, l]) => {
    for (; u >= c; )
      o += 1, c = i[o] ?? Number.MAX_SAFE_INTEGER, s = e[o].key;
    const m = l != null ? t.isAbsolute ? l - s : l === 0 ? null : l + s : 0;
    return [u, m];
  });
  return n ? a : kn(a, e, r);
}
function H(t, e) {
  return zt(t, e, !0);
}
function gn(t, e, n = 0) {
  return zt(t, e, !1, n)?.filter((r) => r[1] != null).map(([r, i]) => [r, i]) ?? null;
}
function Ht(t, e) {
  return t.length === 0 ? [] : [t[0]].concat(
    t.slice(0, -1).flatMap((n, r) => {
      const i = t[r + 1], o = i[0] - n[0], s = o < e ? null : o < 2 * e ? [Math.trunc((i[0] + n[0]) / 2), n[1]] : [i[0] - e, n[1]];
      return s ? [s, i] : [i];
    })
  );
}
function Tt(t) {
  const e = /* @__PURE__ */ new Set();
  let n = null, r = null;
  for (let i = 0; i < t.length; i += 1) {
    const o = t[i];
    if (r == null) {
      r = o;
      continue;
    }
    if (n == null) {
      r[1] === o[1] && (n = o[1]), r = o;
      continue;
    }
    n === o[1] ? e.add(i - 1) : n = null, r = o;
  }
  return t.filter((i, o) => !e.has(o));
}
const z = 4.8 / 120, It = 500, ft = -1;
function Tn(t) {
  return { index: t.index, repeat: t.repeat, value: t.value };
}
function Pn(t) {
  return t.value == null ? null : {
    index: t.index == null ? null : Math.round(t.index),
    repeat: t.repeat == null ? null : Math.round(t.repeat),
    value: t.value
  };
}
function Gr(t) {
  const e = [];
  let n = null;
  const r = Sn(bn(yn(t)));
  let i = null;
  for (const c of r) {
    const a = (c.index ?? 0) - t.tickPrefix, u = c.repeat ?? 0, l = c.value == null ? null : pn(c.value);
    (l !== n || i !== a) && (e.push([a, l]), n = l), i = a + u;
  }
  const o = [...e].reverse().find((c) => c[0] < 0 && c[1] != null);
  if (o) {
    e.splice(0, e.indexOf(o) + 1);
    const c = e[0];
    c && c[0] > 0 && e.unshift([0, o[1]]);
  }
  const s = {
    data: e.map(([c, a]) => [Math.round(c), a]),
    isAbsolute: !0
  };
  return s.data.length > 0 ? s : null;
}
function yn(t) {
  const e = [];
  let n = null;
  for (const r of t.events) {
    const i = r.index != null ? r.index : n ?? 0, o = r.repeat ?? 1;
    n != null && n < i && e.push({ index: n, repeat: null, value: ft }), e.push({ index: i, repeat: o, value: r.value }), n = i + o;
  }
  return n != null && e.push({ index: n, repeat: null, value: ft }), { ...t, events: e };
}
function Yt(t) {
  return t.reduce((e, n) => {
    if (e.length === 0) return [[0, 0, n.bpm]];
    const [r, i, o] = e[e.length - 1], s = z * o, c = r + (n.tickPosition - i) / s;
    return [...e, [c, n.tickPosition, n.bpm]];
  }, []);
}
function bn(t) {
  const e = Yt(t.tempos.map((c) => ({ ...c, tickPosition: c.tickPosition + t.tickPrefix }))), n = t.events.map(Tn), r = [];
  let i = 0, o = 0, s = 0;
  for (const c of n) {
    const a = c.index ?? o, u = c.index == null ? s : (() => {
      for (; (e[i + 1]?.[0] ?? Number.POSITIVE_INFINITY) <= c.index; )
        i += 1;
      const p = z * e[i][2];
      return e[i][1] + (c.index - e[i][0]) * p;
    })(), l = c.repeat ?? 1;
    let m = l, f = 0;
    for (; (e[i + 1]?.[0] ?? Number.POSITIVE_INFINITY) < a + l; )
      f += e[i + 1][1] - Math.max(e[i][1], u), m -= e[i + 1][0] - Math.max(e[i][0], a), i += 1;
    f += m * z * e[i][2], o = a + l, s = u + f, r.push({ index: u, repeat: f, value: c.value });
  }
  return r.map((c) => ({ ...c, value: c.value === ft ? null : c.value }));
}
function Sn(t) {
  return t.filter((e) => (e.repeat ?? 0) > 0).reduce((e, n) => {
    const r = e[e.length - 1];
    return r ? r.index === n.index ? [...e.slice(0, -1), n] : [...e, n] : [n];
  }, []);
}
function Wr(t, e, n, r) {
  const i = e[e.length - 1]?.tickOff;
  if (i == null) return null;
  const o = H(t, e);
  if (!o || o.length === 0) return null;
  let s = null;
  const c = [], a = [];
  for (let m = 0; m < o.length - 1; m += 1) a.push([o[m], o[m + 1]]);
  a.push([o[o.length - 1], null]);
  for (const [m, f] of a) {
    const p = m[0];
    if (s != null && s > p) {
      const P = c.pop();
      if (P) {
        const k = p - (P.index ?? 0);
        k >= 1 && c.push({ ...P, repeat: k });
      }
    }
    const h = Math.max(1, (f?.[0] ?? i) - p);
    s = p + h;
    const d = m[1] == null ? null : hn(m[1]);
    d != null && c.push({ index: p, repeat: h, value: d });
  }
  const u = c.map((m, f) => {
    const p = c[f + 1];
    return p ? (m.index ?? 0) + (m.repeat ?? 1) >= (p.index ?? 0) : !1;
  }), l = An(
    vn(
      On(
        xn(Nn(c, n, r), u)
      )
    )
  );
  return l.length === 0 ? null : { events: l, tempos: [], tickPrefix: r };
}
function zr(t) {
  const e = [...t.events].reverse().find((i) => i.index != null);
  if (!e || e.index == null) return It;
  let n = e.index;
  const r = t.events.indexOf(e);
  for (let i = r; i < t.events.length; i += 1)
    n += t.events[i].repeat ?? 1;
  return n + It;
}
function Nn(t, e, n) {
  const r = Yt(e.map((o) => fn(o, o.tickPosition !== 0, (s) => ({ ...s, tickPosition: s.tickPosition + n }))));
  let i = 0;
  return t.map((o) => ({ ...o, index: (o.index ?? 0) + n })).map((o) => {
    const s = o.index ?? 0;
    for (; (r[i + 1]?.[1] ?? Number.POSITIVE_INFINITY) <= s; ) i += 1;
    const c = z * r[i][2], a = r[i][0] + (s - r[i][1]) / c, u = o.repeat ?? 0;
    let l = u, m = 0;
    for (; (r[i + 1]?.[1] ?? Number.POSITIVE_INFINITY) < s + u; )
      m += r[i + 1][0] - Math.max(r[i][0], a), l -= r[i + 1][1] - Math.max(r[i][1], s), i += 1;
    return m += l / (z * r[i][2]), Pn({ index: a, repeat: Math.max(1, m), value: o.value });
  }).filter((o) => o != null);
}
function xn(t, e) {
  return t.map((n, r) => {
    const i = t[r + 1];
    return i && e[r] ? { ...n, repeat: (i.index ?? 0) - (n.index ?? 0) } : n;
  });
}
function On(t) {
  return t.reduce((e, n) => {
    const r = e[e.length - 1];
    if (!r) return [n];
    if ((r.index ?? 0) + (r.repeat ?? 0) > (n.index ?? 0)) {
      const c = Array.from({ length: r.repeat ?? 0 }, (f, p) => [
        (r.index ?? 0) + p,
        r.value
      ]), a = Array.from({ length: n.repeat ?? 0 }, (f, p) => [
        (n.index ?? 0) + p,
        n.value
      ]), u = /* @__PURE__ */ new Map();
      [...c, ...a].forEach(([f, p]) => {
        const h = u.get(f) ?? [];
        h.push(p), u.set(f, h);
      });
      const m = Array.from(u.entries()).map(([f, p]) => [f, p.reduce((h, d) => h + d, 0) / p.length]).sort((f, p) => f[0] - p[0]).reduce((f, [p, h]) => {
        const d = f[f.length - 1];
        return d ? d.value === h ? [...f.slice(0, -1), { ...d, repeat: (d.repeat ?? 1) + 1 }] : [...f, { index: p, repeat: 1, value: h }] : [{ index: p, repeat: 1, value: h }];
      }, []);
      return [...e.slice(0, -1), ...m];
    }
    const o = (r.index ?? 0) + (r.repeat ?? 0) === (n.index ?? 0), s = r.value === n.value;
    return o && s ? [...e.slice(0, -1), { ...r, repeat: (r.repeat ?? 0) + (n.repeat ?? 0) }] : [...e, n];
  }, []);
}
function vn(t) {
  return t.length === 0 ? t : t.map((e, n) => {
    const r = t[n - 1];
    return r && (r.index ?? 0) + (r.repeat ?? 0) === (e.index ?? 0) ? { ...e, index: null } : e;
  });
}
function An(t) {
  return t.map((e) => e.repeat === 1 ? { ...e, repeat: null } : e);
}
function In(t) {
  return 60 / ht / t;
}
class st {
  constructor(e) {
    this.segments = [];
    for (let n = 0; n < e.length; n += 1) {
      const r = e[n], i = e[n + 1], o = {
        rangeStart: r.tickPosition,
        rangeEndExclusive: i?.tickPosition ?? Number.POSITIVE_INFINITY,
        offset: 0,
        secPerTick: In(r.bpm)
      };
      if (this.segments.length > 0) {
        const s = this.segments[this.segments.length - 1];
        o.offset = s.offset + (s.rangeEndExclusive - s.rangeStart) * s.secPerTick;
      }
      this.segments.push(o);
    }
  }
  tickToSec(e) {
    const n = this.segments.find((r) => e >= r.rangeStart && e < r.rangeEndExclusive) ?? this.segments[0];
    return n.offset + (e - n.rangeStart) * n.secPerTick;
  }
  tickToMilliSec(e) {
    return this.tickToSec(e) * 1e3;
  }
  tickDistanceToSec(e, n) {
    return this.tickToSec(n) - this.tickToSec(e);
  }
  tickDistanceToMilliSec(e, n) {
    return this.tickDistanceToSec(e, n) * 1e3;
  }
  secToTick(e) {
    let n = this.segments[0];
    for (const r of this.segments)
      r.offset <= e && (n = r);
    return Math.trunc((e - n.offset) / n.secPerTick) + n.rangeStart;
  }
  milliSecToTick(e) {
    return this.secToTick(e / 1e3);
  }
}
const Mn = 4, Mt = 0.3125, En = 0.09375, at = 0.375, _n = 0.6875, wn = 115.5;
function Qt(t) {
  return wn - t;
}
function it(t) {
  return t.tickOn + Math.trunc((t.tickOff - t.tickOn + 1) / 2);
}
function ct(t) {
  const e = /* @__PURE__ */ new Map();
  t.forEach(([r, i]) => {
    const o = e.get(r) ?? [];
    o.push(i), e.set(r, o);
  });
  const n = Array.from(e.entries()).map(([r, i]) => {
    if (i.length > 1) {
      if (i.some((s) => s == null)) return [r, null];
      const o = i.filter((s) => s != null);
      return [r, o.reduce((s, c) => s + c, 0) / o.length];
    }
    return [r, i[0]];
  }).sort((r, i) => r[0] - i[0]);
  return n.some((r) => r[1] != null) ? n : null;
}
function Vn(t) {
  return t.slice().sort((e, n) => e[0] - n[0]).reduce((e, n) => {
    const r = e[e.length - 1];
    return !r || n[1] !== r[1] ? [...e, n] : e;
  }, []);
}
function Fn(t, e, n) {
  const r = Mt * t.porTail / 100, i = e.tickToSec(t.note.tickOff) - r, o = Math.max(e.secToTick(i), it(t.note)), s = Mt * n.porHead / 100, c = e.tickToSec(n.note.tickOn) + s, a = Math.min(e.secToTick(c), it(n.note) - 1);
  return R(
    [
      [o, t.note.key],
      [a, n.note.key]
    ],
    1
  ) ?? [];
}
function Rn(t, e) {
  const n = [null, ...t, null], r = n.slice(0, -1).flatMap((i, o) => {
    const s = n[o + 1], c = [], a = i && s ? Fn(i, e, s) : [];
    if (c.push(...a), i)
      for (let u = it(i.note); u < (a[0]?.[0] ?? i.note.tickOff); u += 1)
        c.push([u, i.note.key]);
    if (s) {
      const u = i ? a[a.length - 1]?.[0] ?? s.note.tickOn : 0;
      for (let l = u; l < it(s.note); l += 1)
        c.push([l, s.note.key]);
    }
    return c;
  });
  return new Map((ct(r.map(([i, o]) => [i, o])) ?? []).map(([i, o]) => [i, o ?? 0]));
}
function Cn(t, e) {
  const n = t.flatMap((r) => {
    const i = r.note.tickOn, o = e.tickToSec(i), s = o + En, c = Math.min(e.secToTick(s), r.note.tickOn + Math.trunc((r.note.tickOff - r.note.tickOn) / 2) - 1), a = r.benLen <= 50 ? at : (_n - at) * (r.benLen - 50) / 50 + at, u = o + a, l = Math.min(e.secToTick(u), r.note.tickOff - 1), m = -3 * r.benDep / 100, f = [c, m], p = X([[i, 0], f], 1) ?? [], h = (R([f, [l, 0]], 1) ?? []).slice(1);
    return [...p, ...h];
  });
  return new Map((ct(n.map(([r, i]) => [r, i])) ?? []).map(([r, i]) => [r, i ?? 0]));
}
function Ln(t, e) {
  const n = t.flatMap((r) => {
    const i = r.note.tickOn, o = e.tickToSec(i), s = r.vibrato.map(([c, a]) => [e.secToTick(o + c / 1e3), -a / 100]).filter(([c]) => c >= i && c < r.note.tickOff).sort((c, a) => c[0] - a[0]);
    return X(s, 1) ?? [];
  });
  return new Map((ct(n.map(([r, i]) => [r, i])) ?? []).map(([r, i]) => [r, i ?? 0]));
}
function Dn(t, e, n) {
  if (t.length === 0 || e.length === 0) return t;
  const r = new st(n), i = Rn(e, r), o = Cn(e, r), s = Ln(e, r), c = t[t.length - 1][0] < e[e.length - 1].note.tickOff ? [e[e.length - 1].note.tickOff, null] : null;
  return [...t, ...c ? [c] : []].reduce(
    (a, u) => {
      const l = a[a.length - 1], m = l?.[0] ?? 0, f = u[0];
      if (l?.[1] == null) {
        const p = [];
        for (let h = m; h < f; h += Mn)
          p.push([h, (i.get(h) ?? 0) + (o.get(h) ?? 0) + (s.get(h) ?? 0)]);
        return [...a, ...p, u];
      }
      return [...a, u];
    },
    []
  );
}
function Hr(t, e, n) {
  const r = t.flatMap(
    (c) => c.data.map(([a, u]) => {
      if (a < 0) return null;
      const l = a + c.tickOffset, m = u < 0 ? null : Qt(u / 100);
      return [l, m];
    }).filter((a) => a != null)
  ), i = ct(r);
  if (!i) return null;
  const o = Vn(i);
  return { data: Dn(o, e, n), isAbsolute: !0 };
}
function Yr(t, e) {
  if (e.length === 0) return null;
  const n = H(t, e);
  if (!n || n.length === 0) return null;
  const r = [[-1, -1]];
  return $n(n).forEach(([i, o]) => {
    r.push([i, o == null ? -1 : Math.round(Qt(o) * 100)]);
  }), { tickOffset: 0, data: r };
}
function $n(t) {
  const e = [];
  let n = null;
  for (const r of t)
    n == null && r[1] != null && e.push([r[0], null]), n != null && r[1] == null && e.push([r[0], n]), e.push(r), n = r[1];
  return e;
}
function Zt(t, e, n, r, i) {
  if (!e)
    return t;
  const o = r.tickDistanceToMilliSec(n.tickOn, n.tickOff), s = o * e.length / 100;
  if (s <= 0)
    return t;
  const c = 1 / e.period;
  if (!Number.isFinite(c))
    return t;
  const a = e.depth / 100;
  if (a <= 0)
    return t;
  const u = o * e.fadeIn / 100, l = o * e.fadeOut / 100, m = e.phaseShift / 100, f = e.shift / 100, p = o - s, h = (k) => {
    if (k < p)
      return 0;
    const g = Number.isFinite((k - p) / u) ? Math.max(0, Math.min(1, (k - p) / u)) : 1, T = Number.isFinite((o - k) / l) ? Math.max(0, Math.min(1, (o - k) / l)) : 1, y = 2 * Math.PI * (c * (k - p) - m);
    return a * g * T * (Math.sin(y) + f);
  }, d = r.tickToMilliSec(n.tickOn), P = r.tickDistanceToMilliSec(
    n.tickOn,
    n.tickOn + i
  );
  return t.map(([k, g]) => [r.tickToMilliSec(k) - d, g]).reduce((k, g) => {
    const T = k[k.length - 1], y = [g[0], g[1] + h(g[0])];
    if (!T)
      return [y];
    const x = [];
    for (let O = T[0] + P; O < y[0]; O += P)
      x.push([O, T[1] + h(O)]);
    return k.concat(x, [y]);
  }, []).map(([k, g]) => [
    r.milliSecToTick(k + d),
    g
  ]);
}
const V = 5, Et = 5;
var Bn = /* @__PURE__ */ ((t) => (t.EaseIn = "i", t.EaseOut = "o", t.EaseInOut = "io", t.Linear = "l", t))(Bn || {});
function Qr(t, e, n) {
  const r = [], i = new st(n);
  let o = -Et;
  for (let p = 0; p < Math.min(t.length, e.notes.length); p += 1) {
    const h = t[p], d = e.notes[p], P = [];
    let k = "io";
    const g = i.tickToMilliSec(h.tickOn), T = [];
    for (const v of d.points) {
      const E = Math.max(
        i.milliSecToTick(g + v.x),
        o + Et
      );
      o = E, T.push(E);
      const w = v.y / 10, L = [E, w], K = P[P.length - 1];
      K && L[1] !== K[1] ? P.push(...Un(K, L, k).slice(1)) : P.push(L), k = v.shape;
    }
    jn(P, h);
    const y = P.filter((v) => v[0] < h.tickOn), x = P.filter((v) => v[0] > h.tickOff), O = P.filter((v) => v[0] >= h.tickOn && v[0] <= h.tickOff), b = Zt(
      O,
      d.vibrato,
      h,
      i,
      V
    ), N = [...y, ...b, ...x];
    r.push(_t(N, V, T));
  }
  let s = [];
  const c = [s];
  for (let p = 0; p < Math.min(t.length, r.length); p += 1) {
    const h = [t[p], r[p]];
    if (s.length === 0) {
      s.push(h);
      continue;
    }
    s[s.length - 1][0].tickOff < h[0].tickOn ? (s = [h], c.push(s)) : s.push(h);
  }
  let a = 0;
  const u = [];
  for (const p of c) {
    if (p.length === 0) continue;
    let h = null;
    const d = [];
    for (const [g, T] of p) {
      const y = h, x = T.map(([O, b]) => {
        const N = y && O < g.tickOn ? y.key - g.key : 0;
        return [O, b - N];
      });
      d.push(x), h = g;
    }
    const P = p[p.length - 1][0].tickOff, k = /* @__PURE__ */ new Map();
    d.flat().forEach(([g, T]) => {
      if (g < a || g > P) return;
      const y = k.get(g) ?? [];
      y.push(T), k.set(g, y);
    }), Array.from(k.entries()).map(([g, T]) => [g, T.reduce((y, x) => y + x, 0)]).sort((g, T) => g[0] - T[0]).forEach((g) => u.push(g)), a = P;
  }
  const l = _t(
    e.points.map((p) => [p.x, p.y / 100]),
    V
  ), m = /* @__PURE__ */ new Map();
  [...u, ...l].forEach(([p, h]) => {
    const d = m.get(p) ?? [];
    d.push(h), m.set(p, d);
  });
  const f = Array.from(m.entries()).map(([p, h]) => [p, h.reduce((d, P) => d + P, 0)]).sort((p, h) => p[0] - h[0]).filter(([p]) => p >= 0);
  return f.length === 0 ? null : { data: f.map(([p, h]) => [p, h]), isAbsolute: !1 };
}
function Zr(t, e) {
  if (!t) return e ?? null;
  if (!e) return t;
  const n = /* @__PURE__ */ new Map();
  [...t.data, ...e.data].forEach(([i, o]) => {
    if (o == null) return;
    const s = n.get(i) ?? [];
    s.push(o), n.set(i, s);
  });
  const r = Array.from(n.entries()).map(([i, o]) => [i, o.reduce((s, c) => s + c, 0)]).sort((i, o) => i[0] - o[0]);
  return { ...t, data: r };
}
function Jr(t) {
  return t ? { ...t, data: Tt(t.data.map(([e, n]) => [e, n ?? 0])) } : null;
}
function ti(t, e) {
  const n = t ? gn(t, e) : null;
  return n ? Tt(
    Ht(
      n.map(([r, i]) => [r, Math.round(i * 100)]),
      V
    )
  ) : [];
}
function Un(t, e, n) {
  const r = [t, e];
  return n === "i" ? Gt(r, V) ?? [] : n === "o" ? Wt(r, V) ?? [] : n === "l" ? X(r, V) ?? [] : R(r, V) ?? [];
}
function jn(t, e) {
  const n = e.tickOn, r = e.tickOff, i = t.some((a) => a[0] === n), o = t.some((a) => a[0] === r);
  if (t.length <= 1) {
    i || t.unshift([n, t[0]?.[1] ?? 0]), o || t.push([r, t[0]?.[1] ?? 0]);
    return;
  }
  const s = t[0][0], c = t[t.length - 1][0];
  if (!i)
    if (s > n)
      t.unshift([n, t[0][1]]);
    else if (c < n)
      t.push([n, 0]);
    else {
      const a = [...t].reverse().find((f) => f[0] < n), u = t.find((f) => f[0] > n), l = (u[1] - a[1]) / (u[0] - a[0]), m = a[1] + (n - a[0]) * l;
      t.splice(t.indexOf(u), 0, [n, m]);
    }
  if (!o)
    if (s > r)
      t.unshift([r, t[0][1]]);
    else if (c < r)
      t.push([r, 0]);
    else {
      const a = [...t].reverse().find((f) => f[0] < r), u = t.find((f) => f[0] > r), l = (u[1] - a[1]) / (u[0] - a[0]), m = a[1] + (r - a[0]) * l;
      t.splice(t.indexOf(u), 0, [r, m]);
    }
}
function _t(t, e, n = []) {
  const r = /* @__PURE__ */ new Map();
  return t.forEach((o) => {
    const s = Math.trunc(o[0] / e) * e, c = r.get(s) ?? [];
    c.push(o), r.set(s, c);
  }), Array.from(r.entries()).map(([o, s]) => {
    const c = s.find((a) => n.includes(a[0]));
    return [o, c ? c[1] : s.reduce((a, u) => a + u[1], 0) / s.length];
  }).sort((o, s) => o[0] - s[0]).reduce((o, s) => {
    const c = o[o.length - 1];
    return c ? [...o, ...(X([c, s], e) ?? []).slice(1)] : [s];
  }, []);
}
const F = 4, Xn = 0.25, Kn = 0.2, qn = 0.2, Gn = 1, Wn = 5.5, zn = 0;
function ei(t, e, n, r, i, o, s) {
  return Zn(
    Yn(
      Vt(wt(t), e) ?? [],
      n,
      s ?? null,
      r,
      Hn(Vt(wt(i), o) ?? [])
    )
  );
}
function wt(t) {
  const e = /* @__PURE__ */ new Map();
  return t.forEach(([n, r]) => {
    const i = e.get(n) ?? [];
    i.push(r), e.set(n, i);
  }), Array.from(e.entries()).map(([n, r]) => [n, r.reduce((i, o) => i + o, 0) / r.length]).sort((n, r) => n[0] - r[0]);
}
function Vt(t, e) {
  return e === "linear" ? X(t, F) : R(t, F);
}
function Hn(t) {
  const e = t.reduce((n, r) => {
    const i = n[n.length - 1];
    if (!i || i[1] === 1)
      return [...n, r];
    const o = [];
    for (let s = i[0]; s < r[0]; s += 1)
      o.push([s, i[1]]);
    return [...n, ...o, r];
  }, []);
  return new Map(e);
}
function Yn(t, e, n, r, i) {
  const o = [];
  let s = 0;
  for (const u of e) {
    const l = u.noteStartTick + u.noteLengthTick;
    s < u.noteStartTick && o.push([[s, u.noteStartTick], null]), o.push([[u.noteStartTick, l], u]), s = l;
  }
  o.push([[s, Number.MAX_SAFE_INTEGER], null]);
  const c = [];
  let a = 0;
  for (const [u, l] of o) {
    for (; a < t.length && t[a][0] < u[0]; )
      a += 1;
    const m = a;
    for (; a < t.length && t[a][0] >= u[0] && t[a][0] < u[1]; )
      a += 1;
    m < a && c.push(
      ...Qn(
        t.slice(m, a),
        l,
        n,
        r,
        i
      )
    );
  }
  return c;
}
function Qn(t, e, n, r, i) {
  if (!e || e.noteStartTick < 0)
    return t;
  const o = e.noteStartTick + e.noteLengthTick, s = new st(r), c = s.tickToSec(e.noteStartTick), a = s.tickToSec(o), u = (e.vibratoStart ?? n?.vibratoStart ?? Xn) + c, l = s.secToTick(u), m = e.easeInLength ?? n?.easeInLength ?? Kn, f = e.easeOutLength ?? n?.easeOutLength ?? qn, p = (e.depth ?? n?.depth ?? Gn) * 0.5;
  if (p === 0) return t;
  const h = e.phase ?? zn, d = e.frequency ?? n?.frequency ?? Wn, P = r.filter((b) => b.tickPosition <= e.noteStartTick).pop()?.bpm ?? ke, k = Jn(P), g = (b) => {
    const N = s.tickToSec(b);
    if (N < u) return 0;
    const v = Math.max(0, Math.min(1, (N - u) / m)), E = Math.max(0, Math.min(1, (a - N) / f)), w = 2 * Math.PI * d * k * (b - l) + h;
    return (i.get(b) ?? 1) * p * v * E * Math.sin(w);
  }, T = t.length === 0 ? [[e.noteStartTick, 0], [o, 0]] : t, y = T[T.length - 1][0] !== o ? [...T, [o, T[T.length - 1][1]]] : T, x = [];
  let O;
  for (const b of y) {
    if (!O)
      x.push([b[0], b[1] + g(b[0])]);
    else {
      for (let N = O[0] + F; N < b[0]; N += F)
        x.push([N, O[1] + g(N)]);
      x.push([b[0], b[1] + g(b[0])]);
    }
    O = b;
  }
  return x;
}
function Zn(t) {
  return t.reduce((e, n) => {
    const r = e[e.length - 1]?.[1];
    return n[1] !== r ? [...e, n] : e;
  }, []);
}
function Jn(t) {
  return 60 / 480 / t;
}
function ni(t) {
  return Tt(Ht(t, F));
}
const Jt = 5;
function ri(t, e) {
  if (!t)
    return null;
  const n = [];
  e.forEach((i, o) => {
    const s = t.notes[o];
    s?.pitchPoints && s.pitchPoints.forEach((c, a) => {
      n.push([i.tickOn + a * Jt, c / 100]);
    });
  });
  const r = H({ data: n.map(([i, o]) => [i, o]), isAbsolute: !1 }, e);
  return r ? { data: r, isAbsolute: !0 } : null;
}
function ii(t, e) {
  if (!t)
    return null;
  const n = H(t, e);
  return {
    notes: e.map((r) => {
      const i = (n ?? []).filter((s) => s[0] >= r.tickOn && s[0] < r.tickOff);
      return {
        pitchPoints: mn(i, Jt).map(([, s]) => ((s ?? r.key) - r.key) * 100)
      };
    })
  };
}
const G = 4, ut = 5, tr = 50;
function oi(t, e, n) {
  if (!t)
    return null;
  const r = H(t, e);
  if (!r)
    return null;
  const i = (a, u) => a.map(([l, m]) => [l, (m ?? u) - u]), o = {
    pitch: i(r.filter((a) => a[0] < e[0].tickOff), e[0].key),
    offset: -Math.min(...r.filter((a) => a[0] < 0).map((a) => a[0]), 0),
    bpm: Ft(n, e[0])
  }, s = e.slice(1).map((a) => ({
    pitch: i(
      r.filter((u) => u[0] >= a.tickOn && u[0] < a.tickOff),
      a.key
    ),
    offset: (r.find((u) => u[0] >= a.tickOn)?.[0] ?? a.tickOn) - a.tickOn,
    bpm: Ft(n, a)
  }));
  return {
    notes: [o, ...s].map((a) => ({
      ...a,
      pitch: un(a.pitch, tr)
    })).map((a) => a.pitch.length === 0 ? null : {
      bpm: a.bpm,
      start: At(a.offset, a.bpm),
      startShift: a.pitch[0][1] * 10,
      widths: a.pitch.slice(0, -1).map((u, l) => At(a.pitch[l + 1][0] - u[0], a.bpm)),
      shifts: a.pitch.slice(1).map((u) => u[1] * 10),
      curveTypes: Array(a.pitch.length - 1).fill(""),
      vibratoParams: null
    })
  };
}
function si(t, e, n) {
  if (!t)
    return null;
  const r = e.map((u, l) => [u, t.notes[l]]), i = new st(n), o = [];
  let s = null, c = [], a = -ut;
  for (const [u, l] of r) {
    const m = [], f = i.tickToMilliSec(u.tickOn);
    if (l?.start != null) {
      let p = f + l.start, h = Math.max(i.milliSecToTick(p), a + ut);
      a = h;
      const d = u.tickOn === s?.tickOff ? s.key - u.key : (l.startShift ?? 0) / 10;
      m.push([h, d]);
      for (let P = 0; P < l.widths.length; P += 1) {
        const k = l.widths[P], g = l.shifts[P] ?? 0, T = l.curveTypes[P] ?? "";
        p += k, h = Math.max(i.milliSecToTick(p), a + ut), a = h;
        const y = [h, g / 10], x = m[m.length - 1];
        y[1] !== x[1] ? m.push(...or(x, y, T).slice(1)) : m.push(y);
      }
    }
    o.push(...c.filter((p) => p[0] < (m[0]?.[0] ?? Number.MAX_SAFE_INTEGER))), c = ir(
      Zt(
        rr(nr(er(m, u, s), u), u),
        l?.vibratoParams,
        u,
        i,
        G
      )
    ), s = u;
  }
  return o.push(...c), { data: o.map(([u, l]) => [u, l]), isAbsolute: !1 };
}
function er(t, e, n) {
  if (!n || n.tickOff !== e.tickOn)
    return t;
  const r = t.map(
    ([o, s]) => o < e.tickOn ? [o, s + e.key - n.key] : [o, s]
  ), i = r[r.length - 1];
  return i && i[0] < e.tickOn ? [...r, [e.tickOn, 0]] : r;
}
function nr(t, e) {
  const n = t[0];
  return n ? n[0] > e.tickOn ? [[e.tickOn, n[1]], ...t] : t : [[e.tickOn, 0]];
}
function rr(t, e) {
  const n = t[t.length - 1];
  return n ? n[0] < e.tickOff ? [...t, [e.tickOff, n[1]]] : t : [[e.tickOff, 0]];
}
function ir(t) {
  return t.slice().sort((e, n) => e[0] - n[0]).reduce((e, n) => {
    const r = e[e.length - 1];
    return r && r[0] === n[0] ? (e[e.length - 1] = [r[0], (r[1] + n[1]) / 2], e) : [...e, n];
  }, []);
}
function or(t, e, n) {
  const r = [t, e];
  return n === "s" ? X(r, G) ?? [] : n === "j" ? Gt(r, G) ?? [] : n === "r" ? Wt(r, G) ?? [] : R(r, G) ?? [];
}
function Ft(t, e) {
  const n = t.slice().sort((r, i) => r.tickPosition - i.tickPosition);
  return n.filter((r) => r.tickPosition <= e.tickOn).pop()?.bpm ?? n[0]?.bpm ?? 120;
}
const bt = class bt {
  constructor(e = "", n = !1) {
    this.mapText = e, this.mapToPhonemes = n;
  }
  get isValid() {
    return this.map.size > 0;
  }
  get map() {
    return new Map(
      this.mapText.split(/\r?\n/).map((e) => {
        if (!e.includes("="))
          return null;
        const n = e.slice(0, e.indexOf("=")).trim(), r = e.slice(e.indexOf("=") + 1).trim();
        return [n, r];
      }).filter((e) => e != null)
    );
  }
  static findPreset(e) {
    return this.Presets.find(([n]) => n === e)?.[1];
  }
  static getPreset(e) {
    const n = this.findPreset(e);
    if (!n)
      throw new Error(`Lyrics mapping preset not found: ${e}`);
    return n;
  }
};
bt.Presets = [];
let Rt = bt;
function ci(t, e) {
  return {
    ...t,
    tracks: t.tracks.map((n) => sr(n, e))
  };
}
function sr(t, e) {
  return {
    ...t,
    notes: Ct(
      t.notes.map((n) => cr(n, e)).filter((n) => n.lyric.length > 0)
    )
  };
}
function cr(t, e) {
  const n = e.map.get(t.lyric) ?? t.lyric;
  return e.mapToPhonemes ? {
    ...t,
    phoneme: n
  } : {
    ...t,
    lyric: n
  };
}
function ai(t, e = "") {
  const n = ar(e);
  return {
    ...t,
    tracks: t.tracks.map((r) => ({
      ...r,
      notes: r.notes.map((i) => ({
        ...i,
        lyric: n.get(i.lyric) ?? i.lyric
      }))
    }))
  };
}
function ar(t) {
  return new Map(
    t.split(/\r?\n/).filter((e) => e.trim().length > 0).map((e) => e.split(",")).filter((e) => e.length >= 2).map((e) => [e[0], e[1]])
  );
}
const U = [
  ["あ", "a"],
  ["い", "i"],
  ["いぇ", "ye"],
  ["う", "u"],
  ["わ", "wa"],
  ["うぁ", "wa"],
  ["うぁ", "ua"],
  ["うぃ", "wi"],
  ["うぃ", "ui"],
  ["うぇ", "we"],
  ["え", "e"],
  ["お", "o"],
  ["か", "ka"],
  ["が", "ga"],
  ["き", "ki"],
  ["きぇ", "kye"],
  ["きゃ", "kya"],
  ["きゅ", "kyu"],
  ["きょ", "kyo"],
  ["ぎ", "gi"],
  ["ぎぇ", "gye"],
  ["ぎゃ", "gya"],
  ["ぎゅ", "gyu"],
  ["ぎょ", "gyo"],
  ["く", "ku"],
  ["くぁ", "kua"],
  ["くぃ", "kui"],
  ["くぇ", "kue"],
  ["くぉ", "kuo"],
  ["ぐ", "gu"],
  ["ぐぁ", "gua"],
  ["ぐぃ", "gui"],
  ["ぐぇ", "gue"],
  ["ぐぉ", "guo"],
  ["け", "ke"],
  ["げ", "ge"],
  ["こ", "ko"],
  ["ご", "go"],
  ["さ", "sa"],
  ["ざ", "za"],
  ["し", "shi"],
  ["し", "si"],
  ["しぇ", "she"],
  ["しぇ", "sye"],
  ["しゃ", "sha"],
  ["しゃ", "sya"],
  ["しゅ", "shu"],
  ["しゅ", "syu"],
  ["しょ", "sho"],
  ["しょ", "syo"],
  ["じ", "ji"],
  ["じぇ", "je"],
  ["じぇ", "jye"],
  ["じゃ", "ja"],
  ["じゃ", "jya"],
  ["じゅ", "ju"],
  ["じゅ", "jyu"],
  ["じょ", "jo"],
  ["じょ", "jyo"],
  ["す", "su"],
  ["すぁ", "sua"],
  ["すぃ", "sui"],
  ["すぇ", "sue"],
  ["すぉ", "suo"],
  ["ず", "zu"],
  ["ずぁ", "zua"],
  ["ずぃ", "zui"],
  ["ずぇ", "zue"],
  ["ずぉ", "zuo"],
  ["せ", "se"],
  ["ぜ", "ze"],
  ["そ", "so"],
  ["ぞ", "zo"],
  ["た", "ta"],
  ["だ", "da"],
  ["ち", "chi"],
  ["ちぇ", "che"],
  ["ちゃ", "cha"],
  ["ちゅ", "chu"],
  ["ちょ", "cho"],
  ["つ", "tsu"],
  ["つ", "tu"],
  ["つぁ", "tsa"],
  ["つぁ", "tua"],
  ["つぃ", "tsi"],
  ["つぃ", "tui"],
  ["つぇ", "tse"],
  ["つぇ", "tue"],
  ["つぉ", "tso"],
  ["つぉ", "tuo"],
  ["て", "te"],
  ["てぃ", "ti"],
  ["てゅ", "tyu"],
  ["で", "de"],
  ["でぃ", "di"],
  ["でゅ", "dyu"],
  ["と", "to"],
  ["とぅ", "tu"],
  ["とぅ", "twu"],
  ["ど", "do"],
  ["どぅ", "du"],
  ["どぅ", "dwu"],
  ["な", "na"],
  ["に", "ni"],
  ["にぇ", "nye"],
  ["にゃ", "nya"],
  ["にゅ", "nyu"],
  ["にょ", "nyo"],
  ["ぬ", "nu"],
  ["ぬぁ", "nua"],
  ["ぬぃ", "nui"],
  ["ぬぇ", "nue"],
  ["ぬぉ", "nuo"],
  ["ね", "ne"],
  ["の", "no"],
  ["は", "ha"],
  ["ば", "ba"],
  ["ぱ", "pa"],
  ["ひ", "hi"],
  ["ひぇ", "hye"],
  ["ひゃ", "hya"],
  ["ひゅ", "hyu"],
  ["ひょ", "hyo"],
  ["び", "bi"],
  ["びぇ", "bye"],
  ["びゃ", "bya"],
  ["びゅ", "byu"],
  ["びょ", "byo"],
  ["ぴ", "pi"],
  ["ぴぇ", "pye"],
  ["ぴゃ", "pya"],
  ["ぴゅ", "pyu"],
  ["ぴょ", "pyo"],
  ["ふ", "fu"],
  ["ふぁ", "fa"],
  ["ふぃ", "fi"],
  ["ふぇ", "fe"],
  ["ふぉ", "fo"],
  ["ぶ", "bu"],
  ["ぶぁ", "bua"],
  ["ぶぃ", "bui"],
  ["ぶぇ", "bue"],
  ["ぶぉ", "buo"],
  ["ぷ", "pu"],
  ["ぷぁ", "pua"],
  ["ぷぃ", "pui"],
  ["ぷぇ", "pue"],
  ["ぷぉ", "puo"],
  ["へ", "he"],
  ["べ", "be"],
  ["ぺ", "pe"],
  ["ほ", "ho"],
  ["ぼ", "bo"],
  ["ぽ", "po"],
  ["ま", "ma"],
  ["み", "mi"],
  ["みぇ", "mye"],
  ["みゃ", "mya"],
  ["みゅ", "myu"],
  ["みょ", "myo"],
  ["む", "mu"],
  ["むぁ", "mua"],
  ["むぃ", "mui"],
  ["むぇ", "mue"],
  ["むぉ", "muo"],
  ["め", "me"],
  ["も", "mo"],
  ["や", "ya"],
  ["ゆ", "yu"],
  ["よ", "yo"],
  ["ら", "ra"],
  ["り", "ri"],
  ["りぇ", "rye"],
  ["りゃ", "rya"],
  ["りゅ", "ryu"],
  ["りょ", "ryo"],
  ["る", "ru"],
  ["るぁ", "rua"],
  ["るぃ", "rui"],
  ["るぇ", "rue"],
  ["るぉ", "ruo"],
  ["れ", "re"],
  ["ろ", "ro"],
  ["わ", "wa"],
  ["を", "o"],
  ["うぉ", "wo"],
  ["ん", "n"],
  ["ー", "-"]
], ur = U.map((t) => t[0]), Pt = U.map((t) => t[1]);
function lr(t) {
  const e = ur.indexOf(t);
  return e >= 0 ? e : null;
}
function mr(t) {
  const e = Pt.indexOf(t);
  return e >= 0 ? e : null;
}
function _(t) {
  return lr(t) != null;
}
function C(t) {
  return mr(t) != null;
}
function fr(t) {
  const e = U.find((r) => r[0] === t)?.[1];
  if (!e) return null;
  const n = e.slice(-1);
  return U.find((r) => r[1] === n)?.[0] ?? null;
}
function te(t) {
  return U.find((e) => e[0] === t)?.[1] ?? t;
}
function pr(t) {
  return U.find((e) => e[1] === t)?.[0] ?? t;
}
const hr = 0.7, dr = 0.1;
function ui(t) {
  if (t.tracks.length === 0)
    return S.Unknown;
  const n = Math.max(...t.tracks.map((i) => i.notes.length)) * dr, r = Array.from(
    new Set(
      t.tracks.filter((i) => i.notes.length >= n).map((i) => kr(i)).filter((i) => i !== S.Unknown)
    )
  );
  return r.length > 1 ? S.Unknown : r[0] ?? S.Unknown;
}
function kr(t) {
  const e = t.notes.length, n = t.notes.map((i) => gr(i));
  return Object.values(S).map((i) => {
    const o = n.filter((s) => s === i).length;
    return [i, e === 0 ? 0 : o / e];
  }).find(([, i]) => i > hr)?.[0] ?? S.Unknown;
}
function gr(t) {
  let e = t.lyric;
  if (e.includes("_") && (e = e.slice(0, e.indexOf("_"))), e.includes(" ")) {
    const n = e.slice(e.indexOf(" ") + 1);
    if (_(n))
      return S.KanaVcv;
    if (C(n))
      return S.RomajiVcv;
  } else {
    if (_(e))
      return S.KanaCv;
    if (C(e))
      return S.RomajiCv;
  }
  return S.Unknown;
}
const Tr = ["a", "i", "u", "e", "o", "n", "-"];
function ee(t) {
  return Tr.includes(t);
}
function Pr(t, e) {
  switch (e) {
    case S.Unknown:
      return t;
    case S.RomajiCv:
      return Q(t, (n) => ne(n));
    case S.RomajiVcv:
      return Q(t, (n) => yr(n));
    case S.KanaCv:
      return Q(t, (n) => re(n));
    case S.KanaVcv:
      return Q(t, (n) => br(n));
    default:
      return t;
  }
}
function ne(t) {
  if (t.length === 0)
    return t;
  let e = t.toLowerCase();
  e = e.trim(), e = e.replace(/^\?+/, "");
  const n = Math.max(...Pt.map((r) => r.length), 0);
  for (let r = n; r >= 1; r -= 1) {
    const i = e.slice(0, r);
    C(i) && (e = i);
    break;
  }
  return e;
}
function yr(t) {
  if (t.length === 0)
    return t;
  let e = t.toLowerCase();
  if (e = e.trim(), !e.includes(" "))
    return ne(e);
  const n = e.indexOf(" ");
  let r = "";
  const i = Math.max(...Pt.map((s) => s.length), 0);
  for (let s = 1; s <= i; s += 1) {
    const c = n + 1, a = c + s;
    if (e.length < a)
      break;
    const u = e.slice(c, a);
    C(u) && (r = u);
    break;
  }
  const o = e[n - 1];
  return r.length > 0 && ee(o) && (e = `${o} ${r}`), e;
}
function re(t) {
  if (t.length === 0)
    return t;
  let e = t.trim();
  for (let n = 0; n < e.length; n += 1) {
    let r;
    if (n + 2 <= e.length ? (r = e.slice(n, n + 2), _(r) || (r = e.slice(n, n + 1))) : r = e.slice(n, n + 1), _(r)) {
      e = r;
      break;
    }
  }
  return e;
}
function br(t) {
  if (t.length === 0)
    return t;
  let e = t.trim();
  if (!e.includes(" "))
    return re(e);
  const n = e.indexOf(" "), r = n + 1;
  let i;
  r + 2 <= e.length ? (i = e.slice(r, r + 2), _(i) || (i = e.slice(r, r + 1))) : i = e.slice(r, r + 1);
  const o = e[n - 1];
  return _(i) && ee(o) && (e = `${o} ${i}`), e;
}
function Q(t, e) {
  return t.map((n) => ({
    ...n,
    notes: n.notes.map((r) => ({
      ...r,
      lyric: e(r.lyric)
    }))
  }));
}
function W(t) {
  return t === S.RomajiCv || t === S.RomajiVcv;
}
function Z(t) {
  return t === S.RomajiCv || t === S.KanaCv;
}
function li(t, e, n) {
  const r = t.japaneseLyricsType;
  let i = Pr(t.tracks, r);
  return W(r) && !W(e) ? i = Sr(i) : !W(r) && W(e) && (i = Nr(i)), Z(r) && !Z(e) ? i = xr(i) : !Z(r) && Z(e) && (i = Or(i)), n === j.Ust && (i = vr(i, e)), {
    ...t,
    tracks: i
  };
}
function Sr(t) {
  return ie(t, (e) => pr(e));
}
function Nr(t) {
  return ie(t, (e) => te(e));
}
function ie(t, e) {
  return yt(
    t,
    (n) => n.map((r) => {
      const i = r.lyric;
      if (i.includes(" ")) {
        const o = i.indexOf(" "), s = i.slice(0, o), c = i.slice(o + 1);
        return { ...r, lyric: `${s} ${e(c)}` };
      }
      return { ...r, lyric: e(i) };
    })
  );
}
function xr(t) {
  return yt(t, (e) => {
    const n = [...e];
    let r = "-";
    for (let i = 0; i < n.length; i += 1) {
      let o = r;
      i > 0 && n[i].tickOn > n[i - 1].tickOff && (o = "-"), _(n[i].lyric) ? (r = te(n[i].lyric).slice(-1), n[i] = { ...n[i], lyric: `${o} ${n[i].lyric}` }) : C(n[i].lyric) ? (r = n[i].lyric.slice(-1), n[i] = { ...n[i], lyric: `${o} ${n[i].lyric}` }) : r = "-";
    }
    return n;
  });
}
function Or(t) {
  return yt(
    t,
    (e) => e.map((n) => {
      const r = n.lyric;
      if (!r.includes(" "))
        return n;
      const i = r.slice(r.indexOf(" ") + 1);
      return _(i) || C(i) ? { ...n, lyric: i } : n;
    })
  );
}
function yt(t, e) {
  return t.map((n) => ({
    ...n,
    notes: e(n.notes)
  }));
}
function vr(t, e) {
  return t.map((n) => {
    const r = n.notes.map((i) => i.lyric);
    if (r.length < 2)
      return n;
    for (let i = 1; i < r.length; i += 1) {
      const o = r[i];
      if (o !== "-" && o !== "ー")
        continue;
      const s = r[i - 1];
      let c = null;
      W(e) ? C(s) && (c = s.slice(-1)) : _(s) && (c = fr(s)), c != null && (r[i] = c);
    }
    return {
      ...n,
      notes: n.notes.map((i, o) => ({
        ...i,
        lyric: r[o]
      }))
    };
  });
}
export {
  Rt as LyricsMappingRequest,
  Fe as MUSIC_XML_VERSION,
  rn as MidiEventType,
  on as MidiMetaType,
  Bn as OpenUtauPitchShape,
  J as UTAFORMATIX_DATA_VERSION,
  ui as analyseJapaneseLyricsTypeForProject,
  ni as appendPitchPointsForSvpOutput,
  Zt as appendUtauNoteVibrato,
  tn as areCanonicalXmlEqual,
  Ot as canonicalizeXmlMinimal,
  zr as cevioTrackPitchDataLength,
  Pr as cleanupJapaneseLyrics,
  Ar as collectUfDataDiagnostics,
  Fr as compareArchiveEntries,
  $r as convertBpmToMidiTempo,
  ai as convertChineseLyricsToPinyin,
  Rr as convertInputTimeToStandardTime,
  li as convertJapaneseLyrics,
  Dr as convertMidiTempoToBpm,
  mn as dotResampled,
  Ur as evalFractionOrNull,
  Wr as generateForCevio,
  Yr as generateForDv,
  Br as generateMidiTimeSignatureBytes,
  pe as generateUfdataDocument,
  Lr as getMetaEventHeaderBytes,
  Cr as getStatusByte,
  Gt as interpolateCosineEaseIn,
  R as interpolateCosineEaseInOut,
  Wt as interpolateCosineEaseOut,
  X as interpolateLinear,
  jr as lengthLimited,
  ci as mapLyrics,
  Zr as mergePitchFromUstxParts,
  At as milliSecFromTick,
  Xr as needWarningZoom,
  wr as parseMusicXml,
  Ir as parseUfdata,
  me as parseUfdataDocument,
  Er as parseVsqx,
  Gr as pitchFromCevioTrack,
  Hr as pitchFromDvTrack,
  Qr as pitchFromUstxPart,
  ri as pitchFromUtauMode1Track,
  si as pitchFromUtauMode2Track,
  ii as pitchToUtauMode1Track,
  oi as pitchToUtauMode2Track,
  ei as processSvpInputPitchData,
  qr as projectZoomFactorOptions,
  Jr as reduceRepeatedPitchPointsFromUstxTrack,
  ln as resampled,
  mt as simplifyShape,
  un as simplifyShapeTo,
  ti as toOpenUtauPitchData,
  Vr as writeMusicXml,
  Mr as writeUfdata,
  _r as writeVsqx,
  Kr as zoomProject
};
