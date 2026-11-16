# Synthesised soundtrack for the teaser: music bed + SFX placed on the video timeline.
import sys, wave
import numpy as np

SR = 44100
DUR = float(sys.argv[2])
OUT = sys.argv[1]
N = int(DUR * SR)
rng = np.random.default_rng(7)
music = np.zeros((N, 2))
sfx = np.zeros((N, 2))

def t_(d): return np.arange(int(d * SR)) / SR
def add(buf, start, sig, gain=1.0, pan=0.0):
    i = int(start * SR)
    if sig.ndim == 1: sig = np.stack([sig * (1 - max(pan, 0)), sig * (1 + min(pan, 0))], 1)
    j = min(N, i + len(sig))
    if j > i: buf[i:j] += sig[: j - i] * gain
def env(n, a, r, total):
    e = np.ones(n); A = int(a * SR); R = int(r * SR)
    if A: e[:A] = np.linspace(0, 1, A)
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e
def lp(x, cut):  # one-pole low-pass, cut may be array
    cut = np.broadcast_to(np.asarray(cut, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x); s = 0.0
    for k in range(len(x)): s += a[k] * (x[k] - s); y[k] = s
    return y
def hp(x, cut): return x - lp(x, cut)
def note(m): return 440 * 2 ** ((m - 69) / 12)
def saw(f, d, harm=10, roll=1.4):
    t = t_(d); return sum(np.sin(2 * np.pi * f * k * t) / k ** roll for k in range(1, harm + 1))

# ---- timeline (seconds on the final video) ----
S0, SK = 5.0, 1.2                       # scenes start at 5.0s, played 1.2x
sc = lambda s: S0 + s / SK
OUT0, OK = 26.033, 1.15                 # outro (banner from 2600ms) start
FLASH_IN = 3.344 / 1.3                  # logo flash in the intro
FLASH_OUT = OUT0 + (3.344 - 2.6) / OK
D2, D3 = 9.15, 15.5
BEAT = 60 / 118

# ---- music: pad + bass + drums, from the intro flash to the outro ----
prog = [(57, [69, 72, 76]), (53, [65, 69, 72, 76]), (48, [64, 67, 72]), (55, [62, 67, 71, 74])]  # Am F C G
bar = 4 * BEAT; m0 = FLASH_IN; m1 = OUT0 + .3
k = 0; t0 = m0
while t0 < m1:
    root, ch = prog[k % 4]; d = 2 * bar
    for i, m in enumerate(ch):
        for det, pan in ((-.06, -.5), (.06, .5)):
            s = saw(note(m) * 2 ** (det / 12), d + .8, 8, 1.6) * env(int((d + .8) * SR), .5, .9, 0)
            add(music, t0, s, .045, pan)
    for b in range(int(d / (BEAT / 2))):  # eighth-note bass
        tb = t0 + b * BEAT / 2
        if tb >= m1: break
        dd = BEAT / 2 * .9; tt = t_(dd)
        s = (np.sin(2 * np.pi * note(root - 12) * tt) + .35 * np.sin(4 * np.pi * note(root - 12) * tt)) * np.exp(-tt * 6)
        add(music, tb, s, .22)
    k += 1; t0 += d
tb = m0
while tb < m1:  # kick on beats, hats on offbeats
    tt = t_(.4); f = 45 + 110 * np.exp(-tt * 28)
    add(music, tb, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9), .55)
    h = hp(rng.standard_normal(int(.06 * SR)), 7000) * np.exp(-t_(.06) * 70)
    add(music, tb + BEAT / 2, h, .12, .3)
    tb += BEAT
# final chord swell under the logo
d = DUR - FLASH_OUT + .2
for m in (60, 64, 67, 72, 76):
    for det, pan in ((-.07, -.6), (.07, .6)):
        s = saw(note(m) * 2 ** (det / 12), d, 8, 1.6) * env(int(d * SR), .05, d * .7, 0)
        add(music, FLASH_OUT - .05, s, .05, pan)

# ---- SFX ----
def whoosh(t, d=.7, g=.5, up=True):
    n = int(d * SR); x = rng.standard_normal(n); u = np.linspace(0, 1, n)
    cut = (300 + 5000 * u ** 2) if up else (5300 - 5000 * u ** .5)
    y = hp(lp(x, cut), 200) * np.sin(np.pi * u) ** 1.5
    add(sfx, t, np.stack([y * (1 - u * .6), y * (.4 + u * .6)], 1), g)
def riser(t, d, g=.35):
    n = int(d * SR); u = np.linspace(0, 1, n); x = rng.standard_normal(n)
    y = hp(lp(x, 400 + 7000 * u ** 2), 300) * u ** 2.2
    f = 200 + 900 * u ** 2; y += .25 * np.sin(2 * np.pi * np.cumsum(f) / SR) * u ** 2
    add(sfx, t, y, g)
def impact(t, g=.9):
    tt = t_(2.2); f = 28 + 90 * np.exp(-tt * 9)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.2)
    nz = lp(rng.standard_normal(len(tt)), 2500 * np.exp(-tt * 3) + 120) * np.exp(-tt * 4) * 1.6
    add(sfx, t, boom + nz, g)
def shimmer(t, g=.25):
    for i, m in enumerate((84, 88, 91, 96, 100, 103)):
        tt = t_(1.6); add(sfx, t + i * .045, np.sin(2 * np.pi * note(m) * tt) * np.exp(-tt * 2.6), g / 3, (-1) ** i * .5)
def click(t, g=.6):
    tt = t_(.05); s = (np.sin(2 * np.pi * 2100 * tt) + .6 * np.sin(2 * np.pi * 3900 * tt)) * np.exp(-tt * 140)
    s += hp(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 300) * .5
    add(sfx, t, s, g)
def blip(t, g=.22):
    tt = t_(.14); f = 700 + 1100 * (tt / .14)
    add(sfx, t, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 18), g)
def chime(t, g=.35):
    for i, m in enumerate((84, 88, 91)):
        tt = t_(1.4); add(sfx, t + i * .06, (np.sin(2 * np.pi * note(m) * tt) + .3 * np.sin(4 * np.pi * note(m) * tt)) * np.exp(-tt * 3.2), g / 2, (i - 1) * .4)

whoosh(0.0, 1.0, .45)                    # UFO flies in
riser(1.0, FLASH_IN - 1.0)
impact(FLASH_IN); shimmer(FLASH_IN + .05)
for s in (D2, D3): whoosh(sc(s) - .45, .75, .55)
whoosh(S0 - .45, .75, .5)
for s in (1.2, 5.1, D2 + 1.1, D3 + 1.1, D3 + 5.1): blip(sc(s))
for s in (2.4, 6.4, D2 + 2.3, D3 + 2.3, D3 + 6.0): click(sc(s))
for s in (2.6, 6.8, D2 + 2.5, D2 + 3.9, D3 + 2.6, D3 + 3.0, D3 + 3.4, D3 + 7.3): whoosh(sc(s) - .1, .45, .22)
chime(sc(6.5))
whoosh(sc(D3 + 6.15), .6, .5); impact(sc(D3 + 6.35), .45)
whoosh(OUT0 - .5, .8, .5)
riser(OUT0, FLASH_OUT - OUT0, .3)
impact(FLASH_OUT, 1.0); shimmer(FLASH_OUT + .05, .32)

# ---- reverb (FFT convolution with a decaying noise tail), mix, master ----
def reverb(x, d=1.8, wet=.25):
    n = int(d * SR); ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 3.2)[:, None]; ir[0] = 0
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, L, axis=0) * np.fft.rfft(ir, L, axis=0), L, axis=0)[: len(x)]
    return x + wet * y / np.max(np.abs(y)) * np.max(np.abs(x))
mix = reverb(music, 1.6, .3) * .9 + reverb(sfx, 1.4, .22)
fade = np.ones(N); fade[-int(1.2 * SR):] = np.linspace(1, 0, int(1.2 * SR)) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) / np.tanh(1.6) * .89
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('ok', DUR)
