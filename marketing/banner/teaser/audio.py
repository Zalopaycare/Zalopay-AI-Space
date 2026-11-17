# Epic / futuristic soundtrack for the 30s teaser: braams, big drums, 16th arp, risers, holo UI sounds.
import sys, wave
import numpy as np

SR = 44100
OUT, DUR = sys.argv[1], float(sys.argv[2])
N = int(DUR * SR)
rng = np.random.default_rng(11)
mus = np.zeros((N, 2)); drm = np.zeros((N, 2)); fx = np.zeros((N, 2))

def T(d): return np.arange(int(d * SR)) / SR
def add(buf, t, s, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    if s.ndim == 1: s = np.stack([s * min(1, 1 - pan), s * min(1, 1 + pan)], 1)
    j = min(N, i + len(s)); buf[max(i, 0):j] += s[max(0, -i): j - i] * g
def note(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, cut):
    a = 1 - np.exp(-2 * np.pi * np.broadcast_to(np.asarray(cut, float), x.shape) / SR)
    y = np.empty_like(x); s = 0.0
    for k in range(len(x)): s += a[k] * (x[k] - s); y[k] = s
    return y
def hp(x, c): return x - lp(x, c)
def bright_saw(f, d, bright, H=36):
    """saw whose brightness (harmonic roll-off) follows the envelope `bright` (0..1)"""
    t = T(d); y = np.zeros_like(t); ph = 2 * np.pi * f * t
    for k in range(1, H + 1):
        if f * k > 16000: break
        y += np.sin(k * ph) / k * np.exp(-(k - 1) / (1 + 22 * bright))
    return y

# --- timeline ---
S0 = 5.0
D2, D3 = 7.75, 12.7
FLASH_IN = 3.344 / 1.3
OUT0 = 26.1
FLASH_OUT = OUT0 + (3.344 - 2.6) / 1.15
sc = lambda t: S0 + t
BPM = 124; B = 60 / BPM
GRID0 = FLASH_IN                 # music locks to the intro flash
END_GROOVE = OUT0 + .25

# --- braam: huge low brass hit with opening filter ---
def braam(t, root=45, d=3.2, g=.55):
    tt = T(d); br = np.minimum(1, tt / .35) * np.exp(-tt * .9)
    amp = (1 - np.exp(-tt * 40)) * np.exp(-tt * 1.05)
    y = np.zeros((len(tt), 2))
    for m, det, pan in ((root, -.08, -.6), (root, .08, .6), (root + 12, 0, 0), (root + 7, .05, -.3), (root - 12, 0, 0)):
        s = bright_saw(note(m) * 2 ** (det / 12), d, br) * amp
        y[:, 0] += s * (1 - max(pan, 0)); y[:, 1] += s * (1 + min(pan, 0))
    add(mus, t, np.tanh(y * 1.4), g)
def boom(t, g=1.0, f0=95, d=1.6):  # taiko / cinematic drum
    tt = T(d); f = 38 + f0 * np.exp(-tt * 14)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2)
    s += lp(rng.standard_normal(len(tt)), 900) * np.exp(-tt * 18) * 1.8
    add(drm, t, np.tanh(s * 1.5), g)
def snare(t, g=.5):
    tt = T(.5); n = rng.standard_normal(len(tt))
    s = hp(lp(n, 6500), 900) * np.exp(-tt * 13) + .5 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25)
    add(drm, t, s, g)
def hat(t, g=.08, d=.05):
    tt = T(d); add(drm, t, hp(rng.standard_normal(len(tt)), 8000) * np.exp(-tt * 90), g, .25)
def riser(t, d, g=.45):
    n = int(d * SR); u = np.linspace(0, 1, n)
    y = hp(lp(rng.standard_normal(n), 300 + 9000 * u ** 2.2), 400) * u ** 2.5
    y += .35 * np.sin(2 * np.pi * np.cumsum(180 + 1400 * u ** 2.4) / SR) * u ** 2
    add(fx, t, np.stack([y, np.roll(y, 300)], 1), g)
def impact(t, g=1.0):
    boom(t, 1.25, 120, 2.6)
    tt = T(2.4); nz = lp(rng.standard_normal(len(tt)), 4000 * np.exp(-tt * 2.5) + 150) * np.exp(-tt * 2.2) * 1.4
    add(fx, t, np.stack([nz, np.roll(nz, 900)], 1), .55 * g)
def shimmer(t, g=.3):
    for i, m in enumerate((81, 84, 88, 91, 96, 100, 103, 108)):
        tt = T(2.0); add(fx, t + i * .035, np.sin(2 * np.pi * note(m) * tt) * np.exp(-tt * 2.2), g / 3, (-1) ** i * .6)
def whoosh(t, d=.6, g=.5):
    n = int(d * SR); u = np.linspace(0, 1, n)
    y = hp(lp(rng.standard_normal(n), 400 + 7000 * np.sin(np.pi * u) ** 2), 250) * np.sin(np.pi * u) ** 1.6
    add(fx, t, np.stack([y * (1.2 - u), y * (.2 + u)], 1), g)
def zap(t, g=.28):   # hologram ring appears: fast rising FM chirp
    tt = T(.32); f = 600 + 2600 * (1 - np.exp(-tt * 18))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR + 2.5 * np.sin(2 * np.pi * 90 * tt)) * np.exp(-tt * 9)
    add(fx, t, s, g)
def click(t, g=.55):
    tt = T(.12); s = np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 120) + .7 * np.sin(2 * np.pi * 3600 * tt) * np.exp(-tt * 200)
    s += .6 * np.sin(2 * np.pi * np.cumsum(2400 - 1600 * tt / .12) / SR) * np.exp(-tt * 40)
    add(fx, t, s, g)
def chime(t, g=.4):
    for i, m in enumerate((88, 92, 95, 100)):
        tt = T(1.6); add(fx, t + i * .05, (np.sin(2 * np.pi * note(m) * tt) + .25 * np.sin(4 * np.pi * note(m) * tt)) * np.exp(-tt * 3), g / 2.4, (i - 1.5) * .35)
def tick(t, m, g=.3):
    tt = T(.35); s = np.sin(2 * np.pi * note(m) * tt) * np.exp(-tt * 10) + .4 * np.sin(2 * np.pi * note(m + 12) * tt) * np.exp(-tt * 16)
    add(fx, t, s, g)

# --- music bed: dark-epic Am · F · C · G, 16th arp + bass + pad, drums ---
prog = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]
bar = 4 * B
t, k = GRID0, 0
while t < END_GROOVE:
    root, ch = prog[k % 4]
    # pad (string-like): slow attack detuned saws
    d = bar + .6; tt = T(d); env = np.minimum(1, tt / .5) * np.minimum(1, (d - tt) / .6)
    for m in ch:
        for det, pan in ((-.1, -.7), (.1, .7)):
            add(mus, t, bright_saw(note(m) * 2 ** (det / 12), d, .25 + 0 * tt, 14) * env, .028, pan)
    # 16th arp, an octave up, bright pluck
    arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12, ch[1] + 12, ch[3] + 12, ch[2] + 24]
    for s16 in range(16):
        ts = t + s16 * B / 4
        if ts >= END_GROOVE: break
        tt = T(.22); m = arp[s16 % 8]; y = np.zeros_like(tt)
        for h in range(1, 14): y += np.sin(2 * np.pi * note(m) * h * tt) / h * np.exp(-tt * (9 + h * 2.2))
        add(mus, ts, y, .07, .45 if s16 % 2 else -.45)
    # pulsing 8th bass
    for e8 in range(8):
        tb = t + e8 * B / 2
        if tb >= END_GROOVE: break
        tt = T(B / 2 * .95); f = note(root - 12)
        y = (np.sin(2 * np.pi * f * tt) + .5 * np.sin(4 * np.pi * f * tt) + .25 * np.sin(6 * np.pi * f * tt)) * np.exp(-tt * 5)
        add(mus, tb, np.tanh(y * 1.3), .26)
    # drums: boom on 1 and the "and" of 2, snare on 2 & 4, 16th hats
    boom(t, .75); boom(t + 1.5 * B, .45, 80, 1.0)
    snare(t + B, .32); snare(t + 3 * B, .38)
    for s16 in range(16): hat(t + s16 * B / 4, .05 if s16 % 2 else .09)
    t += bar; k += 1

# --- hits on the picture ---
whoosh(0.0, 1.0, .5)
riser(.9, FLASH_IN - .9, .5)
impact(FLASH_IN); braam(FLASH_IN, 45, 3.0, .6); shimmer(FLASH_IN + .05, .3)
for D in (D2, D3):
    riser(sc(D) - 1.0, 1.0, .35); whoosh(sc(D) - .35, .6, .55); braam(sc(D) + .05, 45 if D == D3 else 41, 2.2, .45); boom(sc(D) + .05, .9, 110, 1.8)
riser(S0 - 1.0, .9, .3); whoosh(S0 - .35, .6, .5); braam(S0 + .05, 45, 2.2, .45)
for x in (1.0, 4.2, D2 + 1.0, D3 + 1.0, D3 + 3.2): zap(sc(x))
for x in (2.3, 5.4, D2 + 2.2, D3 + 2.2, D3 + 4.4): click(sc(x))
for x in (2.5, 5.8, D2 + 2.4): whoosh(sc(x) - .1, .4, .28)
chime(sc(5.5))
whoosh(sc(D3 + 4.5), .55, .55); boom(sc(D3 + 4.6), .7, 120, 1.6)
for i, x in enumerate((5.0, 5.7, 6.4, 7.1, 7.8)): tick(sc(D3 + x), 76 + (0, 2, 4, 7, 9)[i])
riser(OUT0 - 1.2, 1.2 + (FLASH_OUT - OUT0) - .05, .55)
impact(FLASH_OUT, 1.25); braam(FLASH_OUT, 45, DUR - FLASH_OUT + .5, .75); shimmer(FLASH_OUT + .05, .38)

# --- reverb + sidechain-ish ducking + master ---
def reverb(x, d=2.2, wet=.3, damp=3.0):
    n = int(d * SR); ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * damp)[:, None]; ir[:200] = 0
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, L, axis=0) * np.fft.rfft(ir, L, axis=0), L, axis=0)[: len(x)]
    return x + wet * y / (np.max(np.abs(y)) + 1e-9) * np.max(np.abs(x))
duck = np.ones(N); t = GRID0
while t < END_GROOVE:
    i = int(t * SR); n = int(B * .6 * SR); duck[i:i + n] = np.minimum(duck[i:i + n], .55 + .45 * np.linspace(0, 1, n) ** .6)[: len(duck[i:i + n])]; t += B
mix = reverb(mus, 2.4, .28) * duck[:, None] * .9 + reverb(drm, 1.6, .22) * 1.0 + reverb(fx, 2.0, .25) * .95
fade = np.ones(N); fl = int(1.4 * SR); fade[-fl:] = np.linspace(1, 0, fl) ** 1.6
mix *= fade[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 2.0) / np.tanh(2.0) * .9
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok')
