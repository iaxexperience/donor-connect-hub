import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowRight, BarChart3, Check, ChevronRight, ClipboardCheck, FileCheck2, HandHeart, Heart,
  Landmark, LockKeyhole, Menu, MessageSquare, Phone, PiggyBank, QrCode, Route, ShieldCheck,
  Sparkles, Target, TrendingUp, Users, Wallet, X, Zap, PenLine, Gift,
} from "lucide-react";
import PulseLogo from "@/components/common/PulseLogo";
import FAQSection from "@/components/landing/FAQSection";
import ContactSection from "@/components/landing/ContactSection";
import WhatsAppButton from "@/components/landing/WhatsAppButton";
import { LandingVideo } from "@/components/landing/LandingVideo";
import { DonateDialog } from "@/components/landing/DonateDialog";

// Mídias: vídeos e imagens do Mixkit (licença gratuita para uso comercial),
// guardados em public/landing.
const WHATSAPP_DEMO =
  "https://wa.me/5583996583281?text=Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20Pulse%20Doa%C3%A7%C3%B5es.";

const flow = [
  [Users, "Carteira de doadores"],
  [Phone, "Telemarketing"],
  [HandHeart, "Doação"],
  [QrCode, "Recibo"],
  [Route, "Coleta"],
  [BarChart3, "Relatórios"],
] as const;

const features = [
  {
    icon: Users,
    tag: "CARTEIRA INTELIGENTE",
    title: "Cada doador com o operador certo",
    text: "Distribuição automática da carteira entre operadores, fila de ligações por prioridade e redistribuição quando alguém sai da equipe.",
    color: "from-sky-400 to-blue-600",
  },
  {
    icon: Target,
    tag: "METAS DA EQUIPE",
    title: "Metas diárias e mensais que se medem sozinhas",
    text: "Ligações, doações, valor recebido, doadores reativados e coletas — o progresso é calculado com o que a equipe registra.",
    color: "from-cyan-400 to-teal-500",
  },
  {
    icon: FileCheck2,
    tag: "RECIBOS CONFIÁVEIS",
    title: "Recibo numerado, com QR code e assinatura",
    text: "Cada recibo sai com numeração sequencial, QR code de validação pública e a assinatura digitalizada de quem recebeu.",
    color: "from-indigo-400 to-violet-500",
  },
];

const modules = [
  [Phone, "Telemarketing", "Fila de ligações, registro da conversa e follow-up."],
  [PiggyBank, "Caixa", "Recebimentos do dia, fechamento e prestação de contas."],
  [Route, "Rotas de coleta", "Roteiro do mensageiro com baixa e recibo na casa do doador."],
  [Gift, "Doações físicas", "Alimentos, fraldas, remédios e outros materiais."],
  [BarChart3, "Relatórios", "PDF e Excel com filtros por doador, data e valor."],
  [ShieldCheck, "Auditoria", "Registro de quem fez o quê, com acesso por papel."],
] as const;

const FAP_LOGO = "/brand/fap-logo.png";

export default function Index() {
  const reduceMotion = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });

  const navLinks = [
    ["#plataforma", "Plataforma"],
    ["#recursos", "Recursos"],
    ["#equipe", "Equipe"],
    ["#faq", "FAQ"],
    ["#contact", "Contato"],
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f8fb] text-[#061b3b] selection:bg-cyan-300/40">
      <motion.div
        className="fixed inset-x-0 top-0 z-[80] h-1 origin-left bg-gradient-to-r from-blue-600 via-sky-400 to-teal-400"
        style={{ scaleX: progress }}
      />

      {/* ── Cabeçalho ─────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#061b3b]/85 text-white backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-5 lg:px-8">
          <a href="#" aria-label="Pulse Doações — início">
            <PulseLogo variant="light" size={42} showText />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-200 md:flex">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} className="hover:text-cyan-300">{label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => setDonateOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-600"
            >
              <Heart className="h-4 w-4" fill="currentColor" /> Doar
            </button>
            <Link to="/login" className="px-4 py-2 text-sm font-bold hover:text-cyan-300">Entrar</Link>
          </div>
          <button
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-xl border border-white/20 bg-white/10 p-2 md:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="border-t border-white/10 bg-[#061b3b] px-6 py-5 md:hidden">
            <div className="flex flex-col gap-5 text-sm font-bold">
              {navLinks.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>
              ))}
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setDonateOpen(true); }}
                className="rounded-full bg-rose-500 px-5 py-3 text-center text-white"
              >
                Doar agora
              </button>
              <Link to="/login">Entrar</Link>
            </div>
          </nav>
        )}
      </header>

      <main>
        {/* ── Hero com vídeo de fundo ───────────────────────── */}
        <section className="relative overflow-hidden pt-20 text-white">
          <LandingVideo
            eager
            src="/landing/hero-pulse.mp4"
            poster="/landing/hero-pulse.jpg"
            label="Monitor cardíaco hospitalar"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(34,211,238,.35),transparent_36%),linear-gradient(120deg,rgba(6,27,59,.96)_8%,rgba(7,52,100,.9)_55%,rgba(6,120,140,.82)_120%)]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[.07] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:64px_64px]"
          />

          <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-28 pt-20 text-center lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75 }}
              className="mx-auto flex max-w-4xl flex-col items-center"
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-cyan-100 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" /> Gestão de doações para hospitais e instituições filantrópicas
              </div>
              <h1 className="max-w-4xl text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl xl:text-[4.6rem]">
                Cada doação no ritmo certo,{" "}
                <span className="bg-gradient-to-r from-sky-300 to-teal-300 bg-clip-text text-transparent">do telefone ao recibo.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                Carteira de doadores, telemarketing, caixa, coleta e relatórios em uma só plataforma —
                com metas para a equipe e recibos que o doador pode validar.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link
                  to="/cadastro"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 font-black text-[#0757a8] shadow-[0_18px_50px_rgba(0,0,0,.25)] transition hover:-translate-y-1 hover:bg-cyan-50"
                >
                  Começar agora <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <a
                  href={WHATSAPP_DEMO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-8 py-4 font-bold backdrop-blur-xl hover:bg-white/15"
                >
                  Agendar demonstração <ChevronRight className="h-5 w-5" />
                </a>
              </div>
              {/* Doação para o hospital da FAP — logo para o doador reconhecer o destino */}
              <div className="mt-8 flex w-full max-w-xl flex-col items-center gap-4 rounded-3xl bg-white p-4 text-left text-[#061b3b] shadow-[0_18px_50px_rgba(0,0,0,.25)] sm:flex-row sm:p-5">
                <img src={FAP_LOGO} alt="FAP — Fundação Assistencial da Paraíba" className="h-20 w-auto shrink-0" />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="text-[11px] font-black uppercase tracking-wider text-rose-600">Sua doação vai para</p>
                  <p className="text-lg font-black leading-tight">Hospital da FAP</p>
                  <p className="text-xs text-slate-500">Fundação Assistencial da Paraíba</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDonateOpen(true)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-rose-500 px-6 py-3 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-600"
                >
                  <Heart className="h-4 w-4" fill="currentColor" /> Doe agora
                </button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-200">
                {["Implantação assistida", "Importação da sua base", "Adequado à LGPD"].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-cyan-300" /> {item}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Painel ilustrativo do sistema */}
            <motion.div
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="relative mt-16 w-full max-w-5xl text-left"
            >
              <div className="absolute -inset-6 rounded-[3rem] bg-cyan-300/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.2rem] border border-white/35 bg-white/10 p-3 shadow-[0_30px_90px_rgba(0,0,0,.35)] backdrop-blur-2xl">
                <div className="rounded-[1.65rem] bg-white p-5 text-[#061b3b] sm:p-7">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[.15em] text-sky-700">Painel de captação</p>
                      <h2 className="mt-1 text-xl font-black">Sua arrecadação em tempo real</h2>
                    </div>
                    <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> DEMONSTRAÇÃO
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      [HandHeart, "Doações no mês", "1.248"],
                      [Users, "Doadores ativos", "6.900+"],
                      [Target, "Meta da equipe", "82%"],
                    ].map(([Icon, label, value]) => (
                      <div key={label as string} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <Icon className="mb-5 h-5 w-5 text-sky-700" />
                        <p className="text-xs text-slate-500">{label as string}</p>
                        <p className="mt-1 text-lg font-black">{value as string}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_.7fr]">
                    <div className="rounded-2xl bg-[#061b3b] p-5 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-cyan-200">Recebido no mês</p>
                          <p className="mt-1 text-3xl font-black">R$ 48,6 mil</p>
                        </div>
                        <TrendingUp className="h-7 w-7 text-cyan-300" />
                      </div>
                      <div className="mt-5 flex h-20 items-end gap-2">
                        {[38, 55, 46, 70, 63, 82, 76, 94].map((h, i) => (
                          <span key={i} className="min-w-0 flex-1 rounded-t bg-gradient-to-t from-blue-600 to-cyan-300" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-teal-100 p-5">
                      <p className="text-xs font-bold text-sky-800">Ligações de hoje</p>
                      <p className="mt-1 font-black">47 / 60</p>
                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-teal-400"
                          initial={{ width: "0%" }}
                          animate={{ width: "78%" }}
                          transition={{ duration: 1.4, delay: 0.6 }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-slate-600">Faltam 13 para bater a meta do dia</p>
                    </div>
                  </div>
                </div>
              </div>
              <motion.div
                animate={reduceMotion ? undefined : { y: [-6, 6, -6] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 -left-3 rounded-2xl border border-white/30 bg-[#0b4a7a]/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:-left-10"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-400/20 p-2"><QrCode className="h-5 w-5 text-emerald-300" /></div>
                  <div>
                    <p className="text-xs text-cyan-100">Recibo emitido</p>
                    <p className="font-black">Nº DOA-2026-000128</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={reduceMotion ? undefined : { y: [6, -6, 6] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-3 -top-14 hidden rounded-2xl border border-white/30 bg-[#0b4a7a]/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:block sm:-right-8"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-cyan-300/20 p-2"><Heart className="h-5 w-5 text-cyan-200" /></div>
                  <div>
                    <p className="text-xs text-cyan-100">Doador reativado</p>
                    <p className="font-black">+ R$ 50,00 via Pix</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ── Fluxo ──────────────────────────────────────────── */}
        <section id="plataforma" className="relative z-10 -mt-10 px-5">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(5,40,80,.12)] sm:p-8">
            <p className="mb-6 text-center text-xs font-black uppercase tracking-[.2em] text-sky-700">
              Um fluxo único, sem planilhas soltas
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {flow.map(([Icon, label], i) => (
                <div key={label} className="relative flex flex-col items-center rounded-2xl bg-slate-50 px-3 py-5 text-center">
                  <div className="mb-3 rounded-xl bg-sky-100 p-3 text-sky-800"><Icon className="h-5 w-5" /></div>
                  <span className="text-sm font-black">{label}</span>
                  {i < flow.length - 1 && (
                    <ChevronRight className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-sky-600 md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recursos ───────────────────────────────────────── */}
        <section id="recursos" className="px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[.2em] text-sky-700">Operação completa</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                Tudo o que a captação precisa para crescer com controle.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Informação confiável para quem liga, recebe, coleta e decide.
              </p>
            </div>
            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.article
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: i * 0.08 }}
                  className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className={`mb-7 inline-flex rounded-2xl bg-gradient-to-br ${f.color} p-4 text-white shadow-lg`}>
                    <f.icon className="h-7 w-7" />
                  </div>
                  <p className="text-xs font-black tracking-[.16em] text-sky-700">{f.tag}</p>
                  <h3 className="mt-3 text-2xl font-black">{f.title}</h3>
                  <p className="mt-4 leading-7 text-slate-600">{f.text}</p>
                  <div className="mt-8 h-1 w-14 rounded-full bg-gradient-to-r from-blue-600 to-teal-400 transition-all group-hover:w-full" />
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Telemarketing com vídeo ───────────────────────── */}
        <section id="equipe" className="overflow-hidden bg-white px-6 py-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-sky-200/40 blur-3xl" />
              <LandingVideo
                src="/landing/call-center.mp4"
                poster="/landing/call-center.jpg"
                label="Equipe de telemarketing em atendimento"
                className="relative h-[430px] w-full rounded-[2rem] object-cover shadow-2xl"
              />
              <div className="absolute -bottom-7 -right-3 w-64 rounded-2xl border border-white/60 bg-[#061b3b]/95 p-5 text-white shadow-2xl backdrop-blur">
                <p className="text-xs font-bold text-cyan-300">FILA INTELIGENTE</p>
                <p className="mt-2 text-2xl font-black">Quem ligar agora</p>
                <p className="mt-2 text-sm text-slate-300">Doadores prontos para contato, lote a lote.</p>
              </div>
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-[.2em] text-sky-700">Telemarketing de captação</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                Sua equipe sabe quem ligar, o que registrar e quanto falta para a meta.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                Cada operador tem sua carteira, registra a ligação em poucos cliques e anexa o
                comprovante de Pix com um simples Ctrl+V.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  "Carteira distribuída automaticamente por operador",
                  "Registro de ligação, promessa e doação no mesmo lugar",
                  "Comprovante de depósito anexado à doação",
                  "Metas diárias e mensais com progresso ao vivo",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 font-bold">
                    <span className="rounded-full bg-teal-100 p-1 text-teal-700"><Check className="h-4 w-4" /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Impacto (fotos) ───────────────────────────────── */}
        <section className="px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[.2em] text-sky-700">Por trás de cada doação</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                Menos tempo com planilhas, mais tempo para quem precisa de cuidado.
              </h2>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {[
                ["/landing/cuidado-maos.jpg", "Cuidado", "Recursos que chegam ao atendimento de quem precisa.", "Enfermeira segurando as mãos de uma paciente"],
                ["/landing/medica-crianca.jpg", "Pediatria", "Transparência para o doador acompanhar o impacto.", "Médica atendendo uma criança"],
                ["/landing/enfermeira-idosa.jpg", "Acolhimento", "Relacionamento contínuo com quem apoia a instituição.", "Enfermeiro conversando com uma idosa"],
              ].map(([src, tag, text, alt]) => (
                <motion.figure
                  key={src}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  className="group relative h-80 overflow-hidden rounded-[2rem] shadow-lg"
                >
                  <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061b3b]/95 via-[#061b3b]/60 to-transparent p-6 text-white">
                    <p className="text-xs font-black uppercase tracking-[.18em] text-cyan-300">{tag}</p>
                    <p className="mt-2 font-bold leading-6">{text}</p>
                  </figcaption>
                </motion.figure>
              ))}
            </div>
          </div>
        </section>

        {/* ── Visão gerencial ───────────────────────────────── */}
        <section className="bg-[#061b3b] px-6 py-28 text-white lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Visão gerencial</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                Decisões rápidas, com o que está acontecendo agora.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Relatórios por doador, período e valor, doadores que pararam de doar e o desempenho de
                cada pessoa da equipe — em PDF ou Excel.
              </p>
              <div className="mt-9 grid gap-4 sm:grid-cols-2">
                {["Doadores inativos há 1, 2 ou mais meses", "Histórico de cada doador", "Fechamento de caixa", "Auditoria das operações"].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Check className="h-5 w-5 shrink-0 text-cyan-300" />
                    <span className="font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  [HandHeart, "Ticket médio", "R$ 38,90"],
                  [Users, "Reativados no mês", "126"],
                  [ClipboardCheck, "Coletas realizadas", "312"],
                  [Target, "Metas batidas", "9 de 12"],
                ].map(([Icon, label, value]) => (
                  <div key={label as string} className="rounded-2xl bg-white p-5 text-[#061b3b]">
                    <Icon className="h-6 w-6 text-sky-700" />
                    <p className="mt-6 text-xs text-slate-500">{label as string}</p>
                    <p className="mt-1 text-2xl font-black">{value as string}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-cyan-50">Arrecadação do mês</p>
                    <p className="mt-1 text-3xl font-black">+18,6%</p>
                  </div>
                  <TrendingUp className="h-10 w-10 text-white/80" />
                </div>
              </div>
              <p className="mt-3 text-right text-[11px] text-slate-400">Valores ilustrativos</p>
            </div>
          </div>
        </section>

        {/* ── Módulos ───────────────────────────────────────── */}
        <section className="px-6 py-28 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <span className="text-xs font-black uppercase tracking-[.2em] text-sky-700">Mais produtividade</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                Uma plataforma, todos os setores da captação juntos.
              </h2>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map(([Icon, title, text]) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-lg">
                  <div className="h-fit rounded-xl bg-sky-50 p-3 text-sky-800"><Icon className="h-6 w-6" /></div>
                  <div>
                    <h3 className="font-black">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Integrações ───────────────────────────────────── */}
        <section className="px-6 pb-28 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0b3a6b] to-[#0a8a96] p-8 text-white shadow-2xl sm:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
              <div>
                <span className="text-xs font-black uppercase tracking-[.2em] text-cyan-200">Ecossistema conectado</span>
                <h2 className="mt-4 text-3xl font-black sm:text-4xl">Integrações para receber e se comunicar.</h2>
                <p className="mt-5 leading-7 text-cyan-50/80">
                  Cobranças, bancos e mensagens conectados à mesma base de doadores.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  [Wallet, "Asaas"],
                  [Landmark, "Banco do Brasil"],
                  [Zap, "Pix"],
                  [MessageSquare, "WhatsApp"],
                  [QrCode, "Recibo com QR"],
                  [PenLine, "Assinatura digital"],
                ].map(([Icon, name]) => (
                  <div key={name as string} className="flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-5 text-center text-sm font-black backdrop-blur-xl">
                    <Icon className="h-5 w-5 text-cyan-200" />
                    {name as string}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Segurança ─────────────────────────────────────── */}
        <section className="px-6 pb-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[.75fr_1.25fr]">
            <div className="rounded-[2rem] bg-[#e0f2fe] p-8">
              <div className="inline-flex rounded-2xl bg-white p-4 text-sky-800 shadow-sm"><LockKeyhole className="h-7 w-7" /></div>
              <h2 className="mt-7 text-3xl font-black">Dados de doadores protegidos.</h2>
              <p className="mt-4 leading-7 text-slate-600">
                Acesso por papel, comprovantes guardados de forma privada, registros de operação e
                boas práticas de proteção de dados pessoais.
              </p>
            </div>
            <div className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  [ShieldCheck, "Acesso por papel", "Operador, mensageiro, caixa e coordenação veem só o que precisam."],
                  [ClipboardCheck, "Auditoria", "Histórico de quem registrou, alterou ou emitiu cada documento."],
                  [QrCode, "Recibo verificável", "O doador confere a autenticidade pelo QR code."],
                ].map(([Icon, label, text]) => (
                  <div key={label as string}>
                    <Icon className="h-7 w-7 text-sky-700" />
                    <h3 className="mt-5 font-black">{label as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Doação para a organização cadastrada ─────────── */}
        <section id="doar" className="px-6 pb-28 lg:px-8">
          <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.5rem] bg-white shadow-[0_24px_70px_rgba(5,40,80,.12)] ring-1 ring-slate-200 lg:grid-cols-2">
            <div className="relative min-h-[320px]">
              <img src="/landing/medica-crianca.jpg" alt="Médica atendendo uma criança" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061b3b]/80 to-transparent" />
              <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-2xl bg-white/95 p-4 shadow-xl">
                <img src={FAP_LOGO} alt="FAP — Fundação Assistencial da Paraíba" className="h-16 w-auto shrink-0" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Sua doação vai para</p>
                  <p className="font-black text-[#061b3b]">Hospital da FAP</p>
                  <p className="text-xs text-slate-500">Fundação Assistencial da Paraíba</p>
                </div>
              </div>
            </div>
            <div className="p-8 sm:p-12">
              <span className="text-xs font-black uppercase tracking-[.2em] text-rose-600">Faça parte</span>
              <h2 className="mt-4 text-4xl font-black tracking-[-.04em]">Apoie o Hospital da FAP.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Sua doação ajuda a manter o atendimento de quem mais precisa. É rápido e seguro: Pix com
                QR code na hora, ou cartão e boleto pela página do Asaas.
              </p>
              <div className="mt-6 space-y-3">
                {["Pix, cartão ou boleto", "Recibo da sua doação", "Pagamento processado pelo Asaas"].map((item) => (
                  <div key={item} className="flex items-center gap-3 font-bold">
                    <span className="rounded-full bg-rose-100 p-1 text-rose-600"><Check className="h-4 w-4" /></span>
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDonateOpen(true)}
                className="group mt-9 inline-flex items-center gap-3 rounded-full bg-rose-500 px-8 py-4 font-black text-white shadow-[0_18px_40px_rgba(244,63,94,.35)] transition hover:-translate-y-1 hover:bg-rose-600"
              >
                <Heart className="h-5 w-5" fill="currentColor" /> Doar agora
              </button>
            </div>
          </div>
        </section>

        <FAQSection />
        <ContactSection />

        {/* ── Chamada final com imagem ──────────────────────── */}
        <section className="px-6 py-24 lg:px-8">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] px-8 py-16 text-center text-white sm:px-16">
            <img src="/landing/equipe-maos.jpg" alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#061b3b]/95 via-[#0b3a6b]/90 to-[#0a8a96]/85" />
            <div className="relative mx-auto max-w-3xl">
              <span className="inline-flex rounded-full bg-cyan-300/15 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-cyan-200">
                Juntos pela mesma causa
              </span>
              <h2 className="mt-6 text-4xl font-black tracking-[-.04em] sm:text-5xl">
                Transforme a captação da sua instituição em um fluxo inteligente.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-200">
                Fale com a gente e veja o Pulse Doações funcionando na realidade da sua equipe.
              </p>
              <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/cadastro"
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-white px-8 py-4 font-black text-[#0757a8] transition hover:-translate-y-1 hover:bg-cyan-50"
                >
                  Criar minha conta <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <a
                  href={WHATSAPP_DEMO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-8 py-4 font-bold backdrop-blur-xl hover:bg-white/15"
                >
                  Agendar demonstração
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left">
          <PulseLogo variant="dark" size={40} showText />
          <p className="text-xs leading-6 text-slate-500">
            Pulse Doações © {new Date().getFullYear()} — Produzido por IAX Inteligência Artificial Experience LTDA.
            <br />
            Vídeos e imagens: Mixkit. Todos os direitos reservados.
          </p>
          <div className="flex gap-5 text-sm font-bold text-sky-800">
            <a href="#contact">Contato</a>
            <Link to="/login">Entrar</Link>
          </div>
        </div>
      </footer>

      <WhatsAppButton />
      <DonateDialog open={donateOpen} onOpenChange={setDonateOpen} />
      <style>{`html{scroll-behavior:smooth}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`}</style>
    </div>
  );
}
