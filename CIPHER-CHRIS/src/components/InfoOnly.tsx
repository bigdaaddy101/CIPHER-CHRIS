import { useState } from "react";
import { Play, Mail, Code2, AtSign, Briefcase, Award, Send, ChevronRight, MapPin, Clock3, Volume2, VolumeX, Camera, X, Sun, Moon, Sunrise, Sunset } from "lucide-react";
import { ABOUT, CONTACT, DEV, PROJECTS, SERVICES, SKILLS, TESTIMONIALS } from "../game/content";
import { WALL_PHOTOS } from "../game/wallPhotos";
import type { WallPhotoDef } from "../game/wallPhotos";
import { usePhTime, cycleTimeMode } from "../game/phTime";
import { PixelSprite } from "./PixelSprite";
import { sfx } from "../game/sound";

function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="font-term text-cyan-neon text-xl leading-none">{kicker}</p>
      <h2 className="font-pixel text-bone text-base sm:text-lg mt-1.5 leading-relaxed">{title}</h2>
      <div className="mt-3 h-[3px] w-24 bg-violet-neon" style={{ boxShadow: "3px 3px 0 #000" }} />
    </div>
  );
}

export function InfoOnly({ onPlay }: { onPlay: () => void }) {
  const [muted, setMuted] = useState(sfx.isMuted);
  const [zoomPhoto, setZoomPhoto] = useState<WallPhotoDef | null>(null);
  const pht = usePhTime();
  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    sfx.setMuted(m);
  };
  const skyGlow =
    pht.phase === "day"
      ? "radial-gradient(ellipse at top right, rgba(56,189,248,0.18), transparent 60%)"
      : pht.phase === "dusk"
        ? "radial-gradient(ellipse at top right, rgba(251,146,60,0.18), rgba(190,24,93,0.1), transparent 65%)"
        : pht.phase === "dawn"
          ? "radial-gradient(ellipse at top right, rgba(251,191,36,0.14), rgba(244,114,182,0.08), transparent 60%)"
          : "radial-gradient(ellipse at top right, rgba(139,92,246,0.1), transparent 55%)";

  return (
    <div className="min-h-dvh bg-void text-bone font-term">
      {/* Philippine sky tint + subtle grid backdrop */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `${skyGlow}, linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 28px 28px, 28px 28px",
        }}
      />

      <header className="sticky top-0 z-30 bg-panel/95 backdrop-blur border-b-[3px] border-black">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="font-pixel text-xs text-pink-neon">cipher <span className="text-cyan-neon">chris</span></span>
          <nav className="hidden md:flex gap-5 mx-auto text-xl text-dim">
            <a href="#about" className="hover:text-bone">ABOUT</a>
            <a href="#services" className="hover:text-bone">SERVICES</a>
            <a href="#projects" className="hover:text-bone">PROJECTS</a>
            <a href="#photos" className="hover:text-bone">WALL PHOTOS</a>
            <a href="#skills" className="hover:text-bone">SKILLS</a>
            <a href="#words" className="hover:text-bone">KIND WORDS</a>
            <a href="#contact" className="hover:text-bone">CONTACT</a>
          </nav>
          <button
            onClick={() => { sfx.init(); sfx.uiClick(); cycleTimeMode(); }}
            className="pix-inset px-2.5 py-1.5 flex items-center gap-1.5 text-amber-neon text-lg cursor-pointer hover:border-amber-neon ml-auto md:ml-0"
            title="Live Philippine Standard Time (click to preview Day / Sunset / Night)"
          >
            {pht.phase === "day" && <Sun size={14} />}
            {pht.phase === "dawn" && <Sunrise size={14} />}
            {pht.phase === "dusk" && <Sunset size={14} />}
            {pht.phase === "night" && <Moon size={14} />}
            <span>{pht.hh12}:{pht.mm} {pht.ampm} PHT</span>
          </button>
          <button onClick={toggleMute} className="pix-btn w-9 h-9 grid place-items-center" aria-label="Toggle sound" title="Toggle chiptune">
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button onClick={onPlay} className="pix-btn pix-btn-green px-3 py-2.5 text-[9px] flex items-center gap-2">
            <Play size={12} /> PLAY THE GAME INSTEAD
          </button>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-4 pb-20">
        {/* HERO */}
        <section className="pt-12 sm:pt-16">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex-1">
              <p className="text-green-neon text-xl leading-none flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-green-neon pix-blink inline-block" /> {DEV.availability}
              </p>
              <h1 className="font-pixel text-2xl sm:text-4xl leading-[1.5] mt-4">
                {DEV.name}
                <span className="block text-sm sm:text-lg text-violet-neon mt-2">{DEV.role}</span>
              </h1>
              <p className="text-2xl sm:text-[28px] leading-[1.02] text-bone/90 mt-4 max-w-[560px]">{DEV.tagline}</p>
              <p className="text-dim text-xl mt-3 flex flex-wrap gap-x-4">
                <span className="flex items-center gap-1.5"><MapPin size={15} /> {DEV.location}</span>
                <span className="flex items-center gap-1.5 text-amber-neon"><Clock3 size={15} /> Manila time now: {pht.formatted} ({pht.phaseLabel})</span>
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <a href="#projects" className="pix-btn px-4 py-3 text-[10px] inline-flex items-center gap-2">VIEW PROJECTS <ChevronRight size={12} /></a>
                <a href="#contact" className="pix-btn pix-btn-pink px-4 py-3 text-[10px] inline-flex items-center gap-2"><Mail size={13} /> GET IN TOUCH</a>
              </div>
            </div>
            <div className="pix-panel p-4 shrink-0 mx-auto sm:mx-0">
              <div className="flex gap-4 items-end justify-center">
                <div className="floaty"><PixelSprite name="charIdle" scale={3} /></div>
                <PixelSprite name="catSit" scale={3} />
              </div>
              <p className="text-center text-dim text-lg mt-2">the dev &amp; his manager (right)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
            {ABOUT.stats.map((s) => (
              <div key={s.k} className="pix-panel p-4 text-center">
                <div className="font-pixel text-amber-neon text-xl">{s.v}</div>
                <div className="text-dim text-lg mt-1 leading-none">{s.k}</div>
              </div>
            ))}
          </div>
          <p className="text-dim text-base mt-2">* since the incident.</p>
        </section>

        {/* ABOUT */}
        <section id="about" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// WHO DIS" title="ABOUT ME" />
          <div className="pix-panel p-5 sm:p-6">
            {ABOUT.lines.map((l, i) => (
              <p key={i} className={`text-[22px] leading-[1.05] ${i ? "mt-3" : ""}`}>{l}</p>
            ))}
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// INSERT COIN, RECEIVE VALUE" title="SERVICES" />
          <div className="grid sm:grid-cols-2 gap-4">
            {SERVICES.map((s) => (
              <article key={s.title} className="pix-panel p-5">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h3 className="font-pixel text-[11px] text-cyan-neon leading-relaxed">{s.title}</h3>
                  <span className="font-pixel text-[11px] text-amber-neon">{s.price}</span>
                </div>
                <p className="text-[21px] leading-[1.02] mt-2">{s.desc}</p>
                <ul className="pix-list mt-3 text-xl text-bone/90">
                  {s.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* PROJECTS */}
        <section id="projects" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// SELECT YOUR FIGHTER" title="SELECTED PROJECTS" />
          <div className="grid sm:grid-cols-2 gap-4">
            {PROJECTS.map((p) => (
              <article key={p.id} className="pix-panel p-5 flex gap-4">
                <div className="shrink-0 w-16 h-16 grid place-items-center self-start" style={{ background: `${p.color}18`, boxShadow: `inset 0 0 0 2px ${p.color}55` }}>
                  <PixelSprite name={p.icon} scale={2} />
                </div>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-pixel text-[11px]" style={{ color: p.color }}>{p.title}</h3>
                    <span className="text-dim text-lg">{p.year}</span>
                  </div>
                  <p className="text-[21px] leading-[1.02] mt-1.5">{p.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                    {p.tags.map((t) => (
                      <span key={t} className="bg-panel2 border border-line px-1.5 text-cyan-neon text-lg leading-tight">{t}</span>
                    ))}
                    <span className="text-amber-neon text-lg ml-1">▸ {p.metric}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* WALL PHOTOS */}
        <section id="photos" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// FRAMED AROUND THE HOUSE AT 03:47 AM" title="PHOTOS ON THE WALL" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WALL_PHOTOS.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => { sfx.init(); sfx.shutter(); setZoomPhoto(p); }}
                className="group text-left bg-[#f3f0ff] p-2.5 pb-3.5 border-[3px] border-[#050410] shadow-[inset_-3px_-3px_0_#d4d0eb,6px_6px_0_rgba(0,0,0,0.65)] hover:-translate-y-1 cursor-pointer relative"
                style={{ transform: idx % 2 === 0 ? "rotate(-0.6deg)" : "rotate(0.6deg)" }}
              >
                <span className="mx-auto -mt-4 mb-1.5 w-3 h-3 bg-amber-neon border-2 border-black block" />
                <div className="relative bg-abyss border-2 border-black overflow-hidden">
                  <img
                    src={p.src}
                    alt={p.title}
                    className="pixelated w-full aspect-[4/3] object-cover block"
                  />
                  <span className="absolute top-1.5 left-1.5 bg-abyss/85 border border-line px-1.5 py-0.5 text-sm text-cyan-neon inline-flex items-center gap-1">
                    <Camera size={11} className="text-pink-neon" /> {p.room.toUpperCase()}
                  </span>
                </div>
                <p className="font-pixel text-[9px] text-[#17122b] mt-2.5 leading-relaxed group-hover:text-[#007f9e]">
                  {p.title}
                </p>
                <p className="text-[#4a4373] text-lg leading-tight mt-0.5">“{p.caption}”</p>
              </button>
            ))}
          </div>
        </section>

        {/* SKILLS */}
        <section id="skills" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// STACK READOUT" title="SKILLS & TOOLS" />
          <div className="pix-panel p-1">
            <div className="bg-[#04140a] p-5">
              <p className="text-green-neon/70 text-xl">cipher@server:~$ ./readout --stack --honest</p>
              <div className="mt-3 grid gap-1.5">
                {SKILLS.map((s) => (
                  <div key={s.name} className="flex flex-wrap items-baseline gap-x-3 text-xl">
                    <span className="w-40">{s.name}</span>
                    <span className="tracking-[2px] text-green-neon">
                      {"█".repeat(s.lvl)}<span className="text-[#14532d]">{"░".repeat(10 - s.lvl)}</span>
                    </span>
                    <span className="text-green-neon">{s.lvl * 10}%</span>
                    <span className="text-dim text-lg">// {s.tag}</span>
                  </div>
                ))}
              </div>
              <p className="text-cyan-neon text-xl mt-4">also: Docker · AWS · GraphQL · Redis · Tailwind · Figma · Three.js</p>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="words" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// HIGH SCORE TABLE" title="KIND WORDS" />
          <div className="grid sm:grid-cols-2 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} className="pix-panel p-5">
                <div className="flex items-center gap-3 font-pixel text-[10px]">
                  <span className="text-pink-neon">#{i + 1}</span>
                  <span className="flex-1">{t.name}</span>
                  <span className="text-amber-neon">{t.score} PTS</span>
                </div>
                <figcaption className="text-cyan-neon text-lg mt-1">{t.role}</figcaption>
                <blockquote className="text-[22px] leading-[1.02] mt-2">“{t.quote}”</blockquote>
              </figure>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="pt-16 scroll-mt-24">
          <SectionTitle kicker="// UPLINK STABLE" title="LET'S BUILD SOMETHING" />
          <div className="pix-panel p-5 sm:p-6">
            {CONTACT.lines.map((l, i) => (
              <p key={i} className={`text-[22px] leading-[1.05] ${i ? "mt-2" : ""}`}>{l}</p>
            ))}
            <a href={`mailto:${CONTACT.email}?subject=TRANSMISSION%20FROM%20THE%20INTERNET`} className="pix-inset mt-5 p-4 flex items-center gap-3 group">
              <Mail className="text-pink-neon shrink-0" size={24} />
              <span>
                <span className="font-pixel text-xs sm:text-sm block group-hover:text-pink-neon">{CONTACT.email}</span>
                <span className="text-dim text-lg">response time: {CONTACT.responseTime}</span>
              </span>
              <Send className="ml-auto text-dim group-hover:text-green-neon shrink-0" size={20} />
            </a>
            <div className="flex flex-wrap gap-2 mt-4">
              {CONTACT.socials.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="pix-btn px-3 py-2.5 text-[8px] flex items-center gap-2">
                  {s.label === "GITHUB" && <Code2 size={13} />}
                  {s.label === "TWITTER / X" && <AtSign size={13} />}
                  {s.label === "LINKEDIN" && <Briefcase size={13} />}
                  {s.label === "AWWWARDS" && <Award size={13} />}
                  {s.label}: {s.handle}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* CTA back to game */}
        <section className="pt-16">
          <div className="pix-panel p-6 text-center relative overflow-hidden">
            <p className="font-pixel text-sm sm:text-base leading-relaxed">
              THIS IS THE <span className="text-pink-neon">BORING</span> VERSION.
            </p>
            <p className="font-term text-2xl text-dim mt-2 leading-tight">
              the real portfolio is a playable point-&amp;-click adventure with a cat, a quest and at least one (1) rubber duck.
            </p>
            <button onClick={onPlay} className="pix-btn pix-btn-green px-6 py-4 text-[11px] mt-5 inline-flex items-center gap-2">
              <Play size={14} /> <span className="pix-blink">ENTER THE HOUSE</span>
            </button>
          </div>
        </section>
      </main>

      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 bg-abyss/80 flex items-center justify-center p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <div
            className="pix-panel popup-in w-full max-w-[560px] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 bg-violet-neon px-3 py-2">
              <Camera size={14} className="text-abyss" />
              <span className="font-pixel text-[9px] sm:text-[10px] text-abyss flex-1 truncate">
                {zoomPhoto.roomLabel}
              </span>
              <button
                className="pix-btn w-6 h-6 grid place-items-center"
                onClick={() => setZoomPhoto(null)}
                aria-label="Close photo"
              >
                <X size={13} strokeWidth={3} />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <div className="bg-[#f4f1ff] p-3 pb-4 border-[3px] border-[#050410]">
                <img
                  src={zoomPhoto.src}
                  alt={zoomPhoto.title}
                  className="pixelated w-full aspect-[16/10] object-cover border-2 border-black block"
                />
                <div className="flex items-baseline justify-between gap-2 mt-2.5 flex-wrap">
                  <h3 className="font-pixel text-[10px] text-[#17122b]">{zoomPhoto.title}</h3>
                  <span className="text-[#5c5387] text-lg">{zoomPhoto.date}</span>
                </div>
                <p className="text-[#2b234d] text-xl leading-tight mt-0.5">“{zoomPhoto.caption}”</p>
              </div>
              <div className="pix-inset p-3 mt-3">
                <span className="font-pixel text-[8px] text-pink-neon block">CIPHER CHRIS</span>
                <p className="text-xl leading-tight mt-1">{zoomPhoto.story}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="relative border-t-[3px] border-black bg-panel">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap gap-3 items-center justify-between text-dim text-lg">
          <span>© 1994–2026 cipher chris — handcrafted pixels, zero templates</span>
          <span className="text-amber-neon">PHILIPPINES · {pht.formatted} ({pht.phaseLabel}) · NO CATS WERE WOKEN</span>
        </div>
      </footer>
    </div>
  );
}
