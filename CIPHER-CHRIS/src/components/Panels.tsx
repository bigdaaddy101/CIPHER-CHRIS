import { useEffect } from "react";
import { X, Mail, Code2, AtSign, Briefcase, Award, Send, ChevronRight, ChevronLeft, Camera, Check } from "lucide-react";
import type { PanelId } from "../game/types";
import { ABOUT, CONTACT, DEV, PROJECTS, SECRET_PROJECT, SERVICES, SKILLS, TESTIMONIALS } from "../game/content";
import { WALL_PHOTOS } from "../game/wallPhotos";
import type { FrameStyle, WallPhotoId } from "../game/wallPhotos";
import { usePhTime } from "../game/phTime";
import { PixelSprite } from "./PixelSprite";
import { TelescopeView } from "./TelescopeView";
import { sfx } from "../game/sound";

type NavPanel = Exclude<PanelId, null>;

const TITLES: Record<NavPanel, string> = {
  about: "CIPHER TV — ABOUT.TXT",
  projects: "PROJECT_ARCHIVE.EXE",
  services: "SERVICES_AND_RATES.BOOK",
  skills: "TERMINAL — STACK READOUT",
  scores: "TURBO.EXE — HIGH SCORES",
  contact: "UPLINK ESTABLISHED",
  secret: "PROJECT: MIDNIGHT — DECLASSIFIED",
  photos: "WALL PHOTOS — HOUSE GALLERY",
  telescope: "ROOFTOP TELESCOPE — BARANGAY VIEW",
};

const FRAME_CLASSES: Record<FrameStyle, { outer: string; mat: string; captionText: string; subText: string }> = {
  gold: {
    outer: "bg-[#925f1b] p-2 sm:p-2.5 border-[3px] border-[#050410] shadow-[inset_3px_3px_0_#fde68a,inset_-3px_-3px_0_#58370c,6px_6px_0_rgba(0,0,0,0.65)]",
    mat: "bg-[#f6eed9] p-2 sm:p-3 border-2 border-[#6b4410]",
    captionText: "text-[#241a0d]",
    subText: "text-[#6b532b]",
  },
  wood: {
    outer: "bg-[#5d422d] p-2 sm:p-2.5 border-[3px] border-[#050410] shadow-[inset_3px_3px_0_#8f6848,inset_-3px_-3px_0_#362417,6px_6px_0_rgba(0,0,0,0.65)]",
    mat: "bg-[#f2effc] p-2 sm:p-3 border-2 border-[#362417]",
    captionText: "text-[#17122b]",
    subText: "text-[#584e7a]",
  },
  polaroid: {
    outer: "bg-[#f5f3ff] p-2.5 sm:p-3.5 pb-4 sm:pb-5 border-[3px] border-[#050410] shadow-[inset_-3px_-3px_0_#d4d0eb,6px_6px_0_rgba(0,0,0,0.65)]",
    mat: "bg-transparent p-0",
    captionText: "text-[#1e1938]",
    subText: "text-[#635b8c]",
  },
  neon: {
    outer: "bg-[#2a194d] p-2 sm:p-2.5 border-[3px] border-[#050410] shadow-[inset_3px_3px_0_#f471b5,inset_-3px_-3px_0_#22d3ee,6px_6px_0_rgba(0,0,0,0.65)]",
    mat: "bg-[#110e24] p-2 sm:p-3 border-2 border-[#00e5ff]",
    captionText: "text-bone",
    subText: "text-cyan-neon",
  },
  steel: {
    outer: "bg-[#475569] p-2 sm:p-2.5 border-[3px] border-[#050410] shadow-[inset_3px_3px_0_#cbd5e1,inset_-3px_-3px_0_#1e293b,6px_6px_0_rgba(0,0,0,0.65)]",
    mat: "bg-[#e2e8f0] p-2 sm:p-3 border-2 border-[#334155]",
    captionText: "text-[#0f172a]",
    subText: "text-[#475569]",
  },
};

function SkillBar({ lvl }: { lvl: number }) {
  return (
    <span className="font-term tracking-[2px] text-green-neon">
      {"█".repeat(lvl)}
      <span className="text-line">{"░".repeat(10 - lvl)}</span>
    </span>
  );
}

export function InfoPanel({
  panel,
  onClose,
  onNavigate,
  photoId = "living-gallery",
  seenPhotos = [],
  onSelectPhoto,
}: {
  panel: NavPanel;
  onClose: () => void;
  onNavigate: (p: NavPanel) => void;
  photoId?: WallPhotoId;
  seenPhotos?: WallPhotoId[];
  onSelectPhoto?: (id: WallPhotoId) => void;
}) {
  const pht = usePhTime();
  const currentIdx = Math.max(0, WALL_PHOTOS.findIndex((p) => p.id === photoId));
  const activePhoto = WALL_PHOTOS[currentIdx] ?? WALL_PHOTOS[0];

  const stepPhoto = (dir: -1 | 1) => {
    const next = WALL_PHOTOS[(currentIdx + dir + WALL_PHOTOS.length) % WALL_PHOTOS.length];
    sfx.shutter();
    onSelectPhoto?.(next.id);
  };

  useEffect(() => {
    if (panel !== "photos") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepPhoto(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepPhoto(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, currentIdx]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-abyss/75" onClick={onClose}>
      <div
        className="pix-panel popup-in w-full max-w-[580px] max-h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* title bar */}
        <div className="flex items-center gap-2 bg-violet-neon px-3 py-2 shrink-0">
          <span className="w-2.5 h-2.5 bg-abyss" />
          <span className="w-2.5 h-2.5 bg-panel" />
          <h2 className="font-pixel text-[9px] sm:text-[10px] text-abyss flex-1 truncate">{TITLES[panel]}</h2>
          <button
            className="pix-btn w-6 h-6 grid place-items-center text-[10px]"
            onClick={() => { sfx.uiClick(); onClose(); }}
            aria-label="Close panel"
          >
            <X size={13} strokeWidth={3} />
          </button>
        </div>

        <div className="pix-scroll overflow-y-auto p-3.5 sm:p-5 font-term text-lg leading-[1.05] text-bone">
          {panel === "telescope" && <TelescopeView />}

          {panel === "photos" && (() => {
            const fs = FRAME_CLASSES[activePhoto.frameStyle];
            return (
              <div>
                {/* top room & collection status bar */}
                <div className="flex items-center justify-between gap-2 mb-2.5 text-base">
                  <span className="inline-flex items-center gap-1.5 text-cyan-neon">
                    <Camera size={14} className="text-pink-neon shrink-0" />
                    {activePhoto.roomLabel}
                  </span>
                  <span className="text-amber-neon font-pixel text-[8px]">
                    {seenPhotos.length}/{WALL_PHOTOS.length} WALLS INSPECTED
                  </span>
                </div>

                {/* physical framed photo close-up */}
                <div className="relative pt-2">
                  {/* decorative brass wall nail / washi tape at top center */}
                  {activePhoto.frameStyle === "polaroid" ? (
                    <div
                      className="mx-auto -mb-2.5 relative z-10 w-16 h-4 bg-pink-neon/85 border-2 border-black"
                      style={{ transform: "rotate(-2deg)" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center -mb-1 relative z-10">
                      <span className="w-2.5 h-2.5 bg-amber-neon border-2 border-black block" />
                    </div>
                  )}

                  <div className={fs.outer}>
                    <div className={fs.mat}>
                      <div className="relative bg-abyss border-2 border-black overflow-hidden">
                        <img
                          src={activePhoto.src}
                          alt={activePhoto.title}
                          className="pixelated w-full aspect-[16/10] object-cover block"
                        />
                        {/* subtle corner glass reflection */}
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            background:
                              "linear-gradient(125deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 26%, transparent 27%)",
                          }}
                        />
                        <span className="absolute bottom-1.5 right-2 bg-abyss/85 border border-amber-neon/50 px-1.5 py-0.5 font-term text-sm text-amber-neon tracking-wider">
                          {activePhoto.date}
                        </span>
                      </div>

                      {/* mat / Polaroid handwritten caption */}
                      <div className="pt-2.5 flex items-baseline justify-between gap-2 flex-wrap">
                        <p className={`font-pixel text-[9px] sm:text-[10px] leading-relaxed ${fs.captionText}`}>
                          {activePhoto.title}
                        </p>
                        <span className={`font-term text-base ${fs.subText}`}>
                          FRAME {currentIdx + 1}/{WALL_PHOTOS.length}
                        </span>
                      </div>
                      <p className={`font-term text-xl leading-tight mt-0.5 ${fs.captionText}`}>
                        “{activePhoto.caption}”
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cipher Chris's story commentary + prev/next controls */}
                <div className="pix-inset p-3 mt-3">
                  <span className="font-pixel text-[8px] text-pink-neon block">CIPHER CHRIS</span>
                  <p className="text-xl leading-tight mt-1">{activePhoto.story}</p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-3">
                  <button
                    className="pix-btn px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1"
                    onClick={() => stepPhoto(-1)}
                  >
                    <ChevronLeft size={13} /> PREV PHOTO
                  </button>
                  <span className="text-dim text-base hidden sm:inline">← / → keys to flip frames</span>
                  <button
                    className="pix-btn px-3 py-2 text-[8px] sm:text-[9px] flex items-center gap-1"
                    onClick={() => stepPhoto(1)}
                  >
                    NEXT PHOTO <ChevronRight size={13} />
                  </button>
                </div>

                {/* contact sheet strip of all 8 wall photos */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mt-3">
                  {WALL_PHOTOS.map((item) => {
                    const isCurrent = item.id === activePhoto.id;
                    const seen = seenPhotos.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => { sfx.shutter(); onSelectPhoto?.(item.id); }}
                        className={`relative border-2 p-0.5 bg-abyss transition-none cursor-pointer ${
                          isCurrent
                            ? "border-amber-neon shadow-[0_0_0_2px_#fbbf24]"
                            : "border-line opacity-80 hover:opacity-100 hover:border-cyan-neon"
                        }`}
                        title={`${item.title} (${item.roomLabel})`}
                      >
                        <img src={item.src} alt={item.title} className="pixelated w-full aspect-square object-cover block" />
                        {seen && (
                          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-green-neon text-abyss grid place-items-center border border-black">
                            <Check size={9} strokeWidth={4} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {panel === "about" && (
            <div>
              <div className="flex gap-4 items-start">
                <div className="pix-inset p-2.5 shrink-0">
                  <PixelSprite name="charIdle" scale={2} />
                </div>
                <div>
                  <p className="font-pixel text-[11px] text-pink-neon leading-relaxed">{DEV.name}</p>
                  <p className="text-cyan-neon text-xl">{DEV.role}</p>
                  <p className="text-dim">{DEV.location} — local time: <span className="text-amber-neon">{pht.formatted}</span> ({pht.phaseLabel})</p>
                  <p className="mt-1 inline-block bg-green-neon/15 text-green-neon px-2 py-0.5 border border-green-neon/40">
                    ● {DEV.availability}
                  </p>
                </div>
              </div>
              {ABOUT.lines.map((l, i) => (
                <p key={i} className="mt-3">{l}</p>
              ))}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                {ABOUT.stats.map((s) => (
                  <div key={s.k} className="pix-inset p-2 text-center">
                    <div className="font-pixel text-amber-neon text-sm">{s.v}</div>
                    <div className="text-dim text-base leading-none mt-1">{s.k}</div>
                  </div>
                ))}
              </div>
              <p className="text-dim text-base mt-2">* since the last incident. we don't talk about the incident.</p>
            </div>
          )}

          {panel === "projects" && (
            <div className="grid gap-3">
              {PROJECTS.map((p) => (
                <article key={p.id} className="pix-inset p-3 flex gap-3">
                  <div className="shrink-0 w-14 h-14 grid place-items-center" style={{ background: `${p.color}18`, boxShadow: `inset 0 0 0 2px ${p.color}55` }}>
                    <PixelSprite name={p.icon} scale={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="font-pixel text-[10px]" style={{ color: p.color }}>{p.title}</h3>
                      <span className="text-dim text-base">{p.year}</span>
                    </div>
                    <p className="mt-1">{p.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.tags.map((t) => (
                        <span key={t} className="bg-panel2 border border-line px-1.5 text-cyan-neon text-base leading-tight">{t}</span>
                      ))}
                      <span className="text-amber-neon ml-1">▸ {p.metric}</span>
                    </div>
                  </div>
                </article>
              ))}
              <p className="text-dim text-center">+ 57 more in the full archive. some under NDA. some under pizza boxes.</p>
            </div>
          )}

          {panel === "services" && (
            <div className="grid gap-3">
              {SERVICES.map((s) => (
                <article key={s.title} className="pix-inset p-3">
                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h3 className="font-pixel text-[10px] text-cyan-neon">{s.title}</h3>
                    <span className="font-pixel text-[10px] text-amber-neon">{s.price}</span>
                  </div>
                  <p className="mt-1">{s.desc}</p>
                  <ul className="pix-list mt-2 text-bone/90">
                    {s.points.map((pt) => <li key={pt}>{pt}</li>)}
                  </ul>
                </article>
              ))}
              <button className="pix-btn pix-btn-green w-full py-3 text-[10px]" onClick={() => { sfx.uiClick(); onNavigate("contact"); }}>
                START A PROJECT <ChevronRight size={12} className="inline" />
              </button>
            </div>
          )}

          {panel === "skills" && (
            <div className="bg-[#04140a] border-2 border-[#14532d] p-3 -m-1">
              <p className="text-green-neon/70">cipher@server:~$ ./readout --stack --honest</p>
              <p className="text-green-neon/70">loading proficiencies... OK</p>
              <div className="mt-2 grid gap-1">
                {SKILLS.map((s) => (
                  <div key={s.name} className="flex flex-wrap items-baseline gap-x-3">
                    <span className="text-bone w-36">{s.name}</span>
                    <SkillBar lvl={s.lvl} />
                    <span className="text-green-neon text-glow-green">{s.lvl * 10}%</span>
                    <span className="text-dim text-base">// {s.tag}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-cyan-neon">also in the loadout: Docker · AWS · GraphQL · Redis · Tailwind · Figma · git (the good and the --force)</p>
              <p className="text-green-neon">cipher@server:~$ <span className="pix-blink">▊</span></p>
            </div>
          )}

          {panel === "scores" && (
            <div>
              <p className="font-pixel text-center text-amber-neon text-[11px] leading-relaxed">★ HALL OF FAME ★</p>
              <p className="text-center text-dim">(a.k.a. clients who survived working with me and said nice things)</p>
              <div className="mt-3 grid gap-2">
                {TESTIMONIALS.map((t, i) => (
                  <article key={t.name} className="pix-inset p-3">
                    <div className="flex items-center gap-3 font-pixel text-[10px]">
                      <span className="text-pink-neon">{i + 1}ST</span>
                      <span className="text-bone flex-1">{t.name}</span>
                      <span className="text-amber-neon">{t.score}</span>
                    </div>
                    <p className="text-cyan-neon text-base mt-0.5">{t.role}</p>
                    <p className="mt-1">“{t.quote}”</p>
                  </article>
                ))}
              </div>
              <p className="text-center text-green-neon pix-blink mt-3 font-pixel text-[9px]">INSERT COIN TO BECOME 5TH</p>
            </div>
          )}

          {panel === "contact" && (
            <div>
              {CONTACT.lines.map((l, i) => <p key={i} className={i ? "mt-2" : ""}>{l}</p>)}
              <a
                href={`mailto:${CONTACT.email}?subject=TRANSMISSION%20FROM%20THE%20INTERNET`}
                className="pix-inset mt-4 p-3 flex items-center gap-3 hover:border-violet-neon group"
              >
                <Mail className="text-pink-neon shrink-0" size={22} />
                <span>
                  <span className="font-pixel text-[11px] text-bone group-hover:text-pink-neon block">{CONTACT.email}</span>
                  <span className="text-dim text-base">response time: {CONTACT.responseTime}</span>
                </span>
                <Send className="ml-auto text-dim group-hover:text-green-neon shrink-0" size={18} />
              </a>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {CONTACT.socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="pix-btn px-2 py-2.5 text-[8px] flex items-center gap-2 justify-center">
                    {s.label === "GITHUB" && <Code2 size={13} />}
                    {s.label === "TWITTER / X" && <AtSign size={13} />}
                    {s.label === "LINKEDIN" && <Briefcase size={13} />}
                    {s.label === "AWWWARDS" && <Award size={13} />}
                    {s.label}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-dim text-base">P.S. found the GOLDEN FLOPPY? mention it in your email for a free sticker and my eternal respect.</p>
            </div>
          )}

          {panel === "secret" && (
            <div className="text-center">
              <div className="floaty inline-block">
                <PixelSprite name="itemFloppy" scale={5} />
              </div>
              <p className="font-pixel text-amber-neon text-[12px] mt-2 leading-relaxed">{SECRET_PROJECT.title}</p>
              <p className="font-pixel text-[8px] text-green-neon pix-blink mt-1">★ QUEST COMPLETE ★</p>
              <p className="mt-3 text-left">{SECRET_PROJECT.desc}</p>
              <p className="mt-2 text-left text-dim">{SECRET_PROJECT.note}</p>
              <button className="pix-btn pix-btn-green w-full py-3 text-[10px] mt-4" onClick={() => { sfx.uiClick(); onNavigate("contact"); }}>
                REQUEST EARLY ACCESS <ChevronRight size={12} className="inline" />
              </button>
              <p className="text-dim text-base mt-2">the house still hides secrets: a coin, a brew, a very wise duck...</p>
            </div>
          )}
        </div>

        <div className="px-3 py-1.5 bg-panel2 border-t-2 border-line text-dim text-base flex justify-between shrink-0">
          <span>ESC / click outside to close</span>
          <span className="text-cyan-neon">{pht.formatted} · {pht.phaseLabel}</span>
        </div>
      </div>
    </div>
  );
}
