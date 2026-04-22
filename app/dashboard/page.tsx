"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getProjects, createProject, updateProject, deleteProject, getMessages, saveMessage, saveProjectEmail, getProjectEmails, getProjectIdeas, saveProjectIdea, getCampaigns, createCampaign, updateCampaign, deleteCampaign, saveEmail, getEmails, updateEmail } from "@/lib/firestore";

const VIOLET = "#9B59FF";
const BG = "#080808";
const SURFACE = "#111111";
const SURFACE2 = "#181818";
const BORDER = "#222222";
const TEXT = "#F0F0F0";
const TEXT_DIM = "#555555";
const TEXT_MID = "#999999";

const agentColors: Record<string, string> = {
  orchestrator: "#9B59FF", research: "#00D4FF", copywriter: "#FF6B35", strategist: "#00E5A0", factchecker: "#FFD700",
};
const agentIcons: Record<string, string> = {
  orchestrator: "⬡", research: "◎", copywriter: "✦", strategist: "◈", factchecker: "◉",
};

type AgentStatus = "idle" | "thinking" | "working" | "waiting";

interface Agent { id: string; name: string; role: string; status: AgentStatus; lastAction: string; progress: number; }
interface Project { id: string; clientName?: string; name?: string; niche: string; campaigns: number; status: "active" | "delivered"; }
interface Message { id: string; role: "user" | "assistant"; content: string; ts: string; }
interface EmailDraft { subject?: string; preheader?: string; body?: string; ctaVariants?: string[]; notes?: string; }
interface ResearchData { painPoints?: string[]; realLanguage?: string[]; differentiationAngle?: string; ctaOpportunities?: string[]; trends?: string[]; }
interface StrategistProfile { clientSummary?: string; niche?: string; avatar?: { painPoints?: string[]; goals?: string[]; objections?: string[] }; toneOfVoice?: string; campaignStrategy?: string; quickWins?: string[]; }
interface IdeaItem { id: string; text?: string; tag?: string; source?: string; }
interface CampaignItem { id: string; name?: string; status?: string; }
interface CampaignEmailItem { id: string; subject?: string; body?: string; status?: string; }
interface LeadSearchItem { name?: string; title?: string; company?: string; email?: string; linkedin?: string; }
type ProjectModalMode = "create" | "edit" | "delete";

const initialAgents: Agent[] = [
  { id: "orchestrator", name: "Orchestrator", role: "orchestrator", status: "idle", lastAction: "Gata de lucru", progress: 0 },
  { id: "research", name: "Research", role: "research", status: "idle", lastAction: "În așteptare", progress: 0 },
  { id: "copywriter", name: "Copywriter", role: "copywriter", status: "idle", lastAction: "În așteptare", progress: 0 },
  { id: "strategist", name: "Strategist", role: "strategist", status: "idle", lastAction: "În așteptare", progress: 0 },
  { id: "factchecker", name: "Fact-Checker", role: "factchecker", status: "idle", lastAction: "În așteptare", progress: 0 },
];

const welcomeMessage: Message = {
  id: "1", role: "assistant", ts: "00:00",
  content: "Bună! Sunt Orchestratorul MailMind.\n\nSunt gata să coordonez echipa de agenți AI pentru proiectele tale de email copywriting.\n\nPentru a începe cu un client nou, am nevoie de 3 informații rapide:\n\n**1.** Ce vinde clientul tău?\n**2.** Cine este avatarul principal (cumpărătorul ideal)?\n**3.** Care este obiectivul campaniei?",
};

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = { idle: "#333", thinking: VIOLET, working: "#00D4FF", waiting: "#FFD700" };
  const labels: Record<AgentStatus, string> = { idle: "Idle", thinking: "Thinking", working: "Working", waiting: "Waiting" };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors[status], boxShadow: status !== "idle" ? `0 0 7px ${colors[status]}` : "none", display: "inline-block", animation: status === "working" ? "pulse 1.5s infinite" : "none" }} />
      <span style={{ fontSize: 10, color: colors[status], fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>{labels[status]}</span>
    </span>
  );
}

function AgentCard({ agent, onApprove }: { agent: Agent; onApprove: (id: string) => void }) {
  const color = agentColors[agent.role];
  return (
    <div style={{ background: SURFACE2, border: `1px solid ${agent.status === "waiting" ? color + "88" : BORDER}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, transition: "all 0.2s", boxShadow: agent.status === "waiting" ? `0 0 16px ${color}22` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15, color, lineHeight: 1 }}>{agentIcons[agent.role]}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, fontFamily: "monospace", letterSpacing: 0.5 }}>{agent.name.toUpperCase()}</span>
        </div>
        <StatusDot status={agent.status} />
      </div>
      <p style={{ fontSize: 11, color: TEXT_MID, margin: "0 0 8px 0", lineHeight: 1.4 }}>{agent.lastAction}</p>
      {agent.progress > 0 && (
        <div style={{ background: "#1a1a1a", borderRadius: 3, height: 3, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ width: `${agent.progress}%`, height: "100%", background: `linear-gradient(90deg, ${color}66, ${color})`, borderRadius: 3, transition: "width 0.6s ease" }} />
        </div>
      )}
      {agent.status === "waiting" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <button onClick={() => onApprove(agent.id)} style={{ flex: 1, padding: "6px 0", background: color, border: "none", borderRadius: 5, color: "#000", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 }}>✓ APROBĂ</button>
          <button style={{ flex: 1, padding: "6px 0", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 5, color: TEXT_MID, fontSize: 10, cursor: "pointer" }}>✗ REFUZĂ</button>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const renderContent = (text: string) =>
    text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return <div key={i}>{parts.map((p, j) => p.startsWith("**") && p.endsWith("**") ? <strong key={j} style={{ color: TEXT, fontWeight: 600 }}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>)}</div>;
    });
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 18, animation: "fadeIn 0.3s ease" }}>
      {!isUser && <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${VIOLET}22`, border: `1px solid ${VIOLET}44`, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0, fontSize: 12, color: VIOLET }}>⬡</div>}
      <div style={{ maxWidth: "72%", background: isUser ? `${VIOLET}1a` : SURFACE2, border: `1px solid ${isUser ? VIOLET + "44" : BORDER}`, borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px", padding: "10px 14px" }}>
        <div style={{ fontSize: 13, color: TEXT_MID, lineHeight: 1.65, whiteSpace: "pre-line" }}>{renderContent(msg.content)}</div>
        <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 6, textAlign: "right" }}>{msg.ts}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<"research" | "writing" | "review">("research");
  const [lang, setLang] = useState<"RO" | "EN">("RO");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [waitingForCopywriter, setWaitingForCopywriter] = useState(false);
  const [latestEmailDraft, setLatestEmailDraft] = useState<EmailDraft | null>(null);
  const [latestResearch, setLatestResearch] = useState<ResearchData | null>(null);
  const [latestStrategy, setLatestStrategy] = useState<StrategistProfile | null>(null);
  const [projectEmailsCount, setProjectEmailsCount] = useState(0);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null);
  const [campaignEmails, setCampaignEmails] = useState<CampaignEmailItem[]>([]);
  const [projectEmails, setProjectEmails] = useState<CampaignEmailItem[]>([]);
  const [selectedCampaignEmail, setSelectedCampaignEmail] = useState<CampaignEmailItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<ProjectModalMode>("create");
  const [projectModalTargetId, setProjectModalTargetId] = useState<string | null>(null);
  const [projectClientNameInput, setProjectClientNameInput] = useState("");
  const [projectNicheInput, setProjectNicheInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageNonceRef = useRef(0);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + "px";
    }
  }, [input]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        document.cookie = `firebaseToken=${token}; path=/; max-age=3600`;
        setCurrentUser(user);
        const data = await getProjects(user.uid);
        setProjects(data as Project[]);
        if (data.length > 0) setActiveProject((data[0] as Project).id);
      } else {
        document.cookie = "firebaseToken=; path=/; max-age=0";
        window.location.href = "/login";
      }
    });
    return () => unsubscribe();
  }, []);

  // ← NOU: încarcă mesajele când se schimbă proiectul activ
  useEffect(() => {
    if (!activeProject) return;
    getMessages(activeProject).then((data) => {
      if (data.length > 0) setMessages(data as Message[]);
      else setMessages([welcomeMessage]);
    });
    getProjectEmails(activeProject).then((emails) => {
      const list = emails as CampaignEmailItem[];
      setProjectEmails(list);
      setProjectEmailsCount(list.length);
    });
    getProjectIdeas(activeProject).then((projectIdeas) => setIdeas(projectIdeas as IdeaItem[]));
    getCampaigns(activeProject).then((data) => {
      const list = data as CampaignItem[];
      setCampaigns(list);
      setActiveCampaign(list.length > 0 ? list[0].id : null);
    });
    setCampaignEmails([]);
    setSelectedCampaignEmail(null);
    setLatestResearch(null);
    setLatestEmailDraft(null);
    setLatestStrategy(null);
  }, [activeProject]);

  useEffect(() => {
    if (!activeCampaign) {
      setCampaignEmails([]);
      setSelectedCampaignEmail(null);
      setProjectEmailsCount(projectEmails.length);
      return;
    }
    getEmails(activeCampaign).then((emails) => {
      const list = emails as CampaignEmailItem[];
      setCampaignEmails(list);
      setProjectEmailsCount(list.length);
    });
  }, [activeCampaign, projectEmails.length]);

  const addCampaign = async () => {
    if (!activeProject) {
      addMsg("⚠️ Selectează un proiect activ înainte să creezi o campanie.");
      return;
    }
    const name = window.prompt("Numele campaniei:");
    if (!name || !name.trim()) return;
    await createCampaign(activeProject, name.trim());
    const data = await getCampaigns(activeProject);
    const list = data as CampaignItem[];
    setCampaigns(list);
    if (list.length > 0 && !activeCampaign) setActiveCampaign(list[0].id);
    addMsg(`✓ Campanie creată: ${name.trim()}`);
  };

  const editCampaign = async (campaign: CampaignItem) => {
    const currentName = campaign.name || "";
    const nextName = window.prompt("Nume nou campanie:", currentName);
    if (!nextName || !nextName.trim() || nextName.trim() === currentName) return;
    await updateCampaign(campaign.id, { name: nextName.trim() });
    if (!activeProject) return;
    const data = await getCampaigns(activeProject);
    setCampaigns(data as CampaignItem[]);
    addMsg(`✓ Campanie actualizată: ${nextName.trim()}`);
  };

  const removeCampaign = async (campaign: CampaignItem) => {
    const ok = window.confirm(`Ștergi campania "${campaign.name || "Campanie"}"?`);
    if (!ok) return;
    await deleteCampaign(campaign.id);
    if (!activeProject) return;
    const data = await getCampaigns(activeProject);
    const list = data as CampaignItem[];
    setCampaigns(list);
    if (activeCampaign === campaign.id) {
      setActiveCampaign(list.length > 0 ? list[0].id : null);
      setSelectedCampaignEmail(null);
    }
    addMsg(`✓ Campanie ștearsă: ${campaign.name || "Campanie"}`);
  };

  const editSelectedEmail = async () => {
    if (!selectedCampaignEmail) return;
    const nextSubject = window.prompt("Subiect email:", selectedCampaignEmail.subject || "");
    if (nextSubject === null) return;
    const nextBody = window.prompt("Conținut email:", selectedCampaignEmail.body || "");
    if (nextBody === null) return;

    await updateEmail(selectedCampaignEmail.id, {
      subject: nextSubject.trim(),
      body: nextBody.trim(),
    });

    if (activeCampaign) {
      const emails = await getEmails(activeCampaign);
      const list = emails as CampaignEmailItem[];
      setCampaignEmails(list);
      const updated = list.find((e) => e.id === selectedCampaignEmail.id) || null;
      setSelectedCampaignEmail(updated);
    }
    addMsg("✓ Draft email actualizat.");
  };

  const addIdea = async () => {
    if (!activeProject) {
      addMsg("⚠️ Selectează un proiect activ înainte să adaugi o idee.");
      return;
    }

    const text = window.prompt("Scrie ideea (Inbox Idei):");
    if (!text || !text.trim()) return;
    const tag = window.prompt("Tag (ex: research/copy/strategy/general):", "general") || "general";

    await saveProjectIdea(activeProject, { text: text.trim(), tag: tag.trim() || "general", source: "manual" });
    const projectIdeas = await getProjectIdeas(activeProject);
    setIdeas(projectIdeas as IdeaItem[]);
    addMsg(`✓ Idee salvată în Inbox (${tag.trim() || "general"}).`);
  };

  const now = () => new Date().toLocaleTimeString("ro", { hour: "2-digit", minute: "2-digit" });
  const nextMessageId = () => {
    messageNonceRef.current += 1;
    return `${Date.now()}-${messageNonceRef.current}`;
  };

  // ← NOU: salvează și în Firestore
  const addMsg = (content: string, id?: string) => {
    const msg = { id: id || nextMessageId(), role: "assistant" as const, content, ts: now() };
    setMessages((m) => [...m, msg]);
    if (activeProject) saveMessage(activeProject, { role: "assistant", content, ts: msg.ts });
  };

  const runResearch = async (proj: Project) => {
    setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, status: "working", lastAction: "Caută date pe web...", progress: 10 } : ag));
    addMsg(`◎ **Research Agent pornit** pentru nișa **${proj.niche}**...\n\nCaut pain points, limbaj real și oportunități de diferențiere. Poate dura 15-30 secunde.`);
    try {
      const res = await fetch("/api/agents/research", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: proj.niche, avatar: (proj as Project & { avatar?: string }).avatar || "", projectName: proj.clientName || proj.name || "" }),
      });
      setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, progress: 70, lastAction: "Procesează rezultatele..." } : ag));
      const data = await res.json();
      if (data.research) {
        const r = data.research as ResearchData;
        setLatestResearch(r);
        addMsg(`◎ **Research finalizat!**\n\n**Pain Points:**\n${r.painPoints?.map((p: string) => `• ${p}`).join("\n") || "—"}\n\n**Limbajul avatarului:**\n${r.realLanguage?.map((l: string) => `• ${l}`).join("\n") || "—"}\n\n**Unghi diferențiator:**\n${r.differentiationAngle || "—"}\n\n**CTA Oportunități:**\n${r.ctaOpportunities?.slice(0, 3).map((c: string) => `• ${c}`).join("\n") || "—"}\n\n**Tendințe 2025:**\n${r.trends?.map((t: string) => `• ${t}`).join("\n") || "—"}`);
        setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, status: "waiting", lastAction: "Research gata — aprobă pentru Copywriter", progress: 100 } : ag));
      } else throw new Error(data.error || "Research failed");
    } catch (err) {
      addMsg(`⚠️ Research Agent a eșuat: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
      setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, status: "idle", lastAction: "Eroare research", progress: 0 } : ag));
    }
  };

  const runCopywriter = async (emailType: string, length: string) => {
    const proj = projects.find((p) => p.id === activeProject);
    setWaitingForCopywriter(false);
    setAgents((a) => a.map((ag) => ag.id === "copywriter" ? { ...ag, status: "working", lastAction: "Scrie emailul...", progress: 20 } : ag));
    addMsg(`✦ **Copywriter Agent pornit**...\n\nScriu un email **${emailType}**, lungime **${length}**. Câteva secunde...`);
    try {
      const res = await fetch("/api/agents/copywriter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailType, length,
          clientName: proj?.clientName || proj?.name,
          research: latestResearch,
          template: "Hook (pain point) → Problem agitation → Solution → CTA",
          toneOfVoice: latestStrategy?.toneOfVoice || "conversational but professional",
        }),
      });
      setAgents((a) => a.map((ag) => ag.id === "copywriter" ? { ...ag, progress: 70, lastAction: "Finalizează emailul..." } : ag));
      const data = await res.json();
      if (data.email) {
        const e = data.email as EmailDraft;
        setLatestEmailDraft(e);
        if (activeProject) {
          if (activeCampaign) {
            await saveEmail(activeCampaign, {
              subject: e.subject || "",
              body: e.body || "",
              ctaVariants: e.ctaVariants || [],
              emailType,
            });
            const emails = await getEmails(activeCampaign);
            setProjectEmailsCount(emails.length);
          } else {
            await saveProjectEmail(activeProject, {
              subject: e.subject || "",
              preheader: e.preheader || "",
              body: e.body || "",
              ctaVariants: e.ctaVariants || [],
              emailType,
              notes: e.notes || "",
              generatedBy: "copywriter",
            });
            const emails = await getProjectEmails(activeProject);
            const list = emails as CampaignEmailItem[];
            setProjectEmails(list);
            setProjectEmailsCount(list.length);
            setSelectedCampaignEmail(list[0] || null);
          }
        }
        addMsg(`✦ **Email generat!**\n\n**Subiect:** ${e.subject}\n**Preheader:** ${e.preheader}\n\n---\n\n${e.body}\n\n---\n\n**CTA variante:**\n${e.ctaVariants?.map((c: string) => `• ${c}`).join("\n") || "—"}\n\n**Notă strategică:** ${e.notes || "—"}`);
        setAgents((a) => a.map((ag) => ag.id === "copywriter" ? { ...ag, status: "waiting", lastAction: "Email gata — aprobă pentru Fact-checker", progress: 100 } : ag));
      } else throw new Error(data.error || "Copywriter failed");
    } catch (err) {
      addMsg(`⚠️ Copywriter Agent a eșuat: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
      setAgents((a) => a.map((ag) => ag.id === "copywriter" ? { ...ag, status: "idle", lastAction: "Eroare copywriter", progress: 0 } : ag));
    }
  };

  const runStrategist = async (proj: Project) => {
    setAgents((a) => a.map((ag) => ag.id === "strategist" ? { ...ag, status: "working", lastAction: "Construiește profilul clientului...", progress: 20 } : ag));
    addMsg(`◈ **Strategist Agent pornit** pentru **${proj.clientName || proj.name}**...`);

    try {
      const res = await fetch("/api/agents/strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: {
            clientName: proj.clientName || proj.name || "",
            niche: proj.niche,
            research: latestResearch || {},
          },
        }),
      });
      const data = await res.json();
      if (data.profile) {
        const profile = data.profile as StrategistProfile;
        setLatestStrategy(profile);
        addMsg(
          `◈ **Strategist finalizat!**\n\n` +
          `**Client summary:** ${profile.clientSummary || "—"}\n\n` +
          `**Tone of voice recomandat:** ${profile.toneOfVoice || "—"}\n\n` +
          `**Strategie campanie:** ${profile.campaignStrategy || "—"}\n\n` +
          `**Quick wins:**\n${profile.quickWins?.map((w) => `• ${w}`).join("\n") || "—"}`
        );
        setAgents((a) => a.map((ag) => ag.id === "strategist" ? { ...ag, status: "waiting", lastAction: "Brief strategic gata", progress: 100 } : ag));
      } else {
        throw new Error(data.error || "Strategist failed");
      }
    } catch (err) {
      addMsg(`⚠️ Strategist Agent a eșuat: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
      setAgents((a) => a.map((ag) => ag.id === "strategist" ? { ...ag, status: "idle", lastAction: "Eroare strategist", progress: 0 } : ag));
    }
  };

  const runFactChecker = async () => {
    if (!latestEmailDraft) {
      addMsg("⚠️ Nu am un email generat pentru fact-check. Generează mai întâi un draft.");
      return;
    }

    setAgents((a) => a.map((ag) => ag.id === "factchecker" ? { ...ag, status: "working", lastAction: "Verifică emailul...", progress: 20 } : ag));

    try {
      const res = await fetch("/api/agents/factchecker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: latestEmailDraft,
          research: latestResearch || {},
          toneOfVoice: latestStrategy?.toneOfVoice || "conversational but professional",
          emailType: "custom",
        }),
      });

      const data = await res.json();

      if (data.review) {
        const review = data.review as {
          score?: number;
          strengths?: string[];
          weaknesses?: string[];
          suggestedImprovements?: string[];
          overallVerdict?: string;
        };

        addMsg(
          `◉ **Fact-check finalizat**\n\n` +
          `**Scor:** ${review.score ?? "N/A"}\n` +
          `**Verdict:** ${review.overallVerdict || "N/A"}\n\n` +
          `**Puncte forte:**\n${review.strengths?.map((s) => `• ${s}`).join("\n") || "—"}\n\n` +
          `**Slăbiciuni:**\n${review.weaknesses?.map((w) => `• ${w}`).join("\n") || "—"}\n\n` +
          `**Îmbunătățiri sugerate:**\n${review.suggestedImprovements?.map((i) => `• ${i}`).join("\n") || "—"}`
        );

        setAgents((a) => a.map((ag) => ag.id === "factchecker" ? { ...ag, status: "waiting", lastAction: "Review gata — aprobă final", progress: 100 } : ag));
      } else {
        throw new Error(data.error || "Fact-checker failed");
      }
    } catch (err) {
      addMsg(`⚠️ Fact-checker Agent a eșuat: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
      setAgents((a) => a.map((ag) => ag.id === "factchecker" ? { ...ag, status: "idle", lastAction: "Eroare fact-checker", progress: 0 } : ag));
    }
  };

  const runExportDocx = async () => {
    if (!activeProj) {
      addMsg("⚠️ Nu există proiect activ pentru export.");
      return;
    }
    if (!latestEmailDraft?.body) {
      addMsg("⚠️ Nu există email generat pentru export. Rulează mai întâi Copywriter.");
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: activeProjName,
          niche: activeProj.niche,
          email: latestEmailDraft,
          strategy: latestStrategy || null,
          research: latestResearch || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(activeProjName || "mailmind").replace(/\s+/g, "_")}_export.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addMsg("✓ Export DOCX generat și descărcat cu succes.");
    } catch (err) {
      addMsg(`⚠️ Export DOCX a eșuat: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const runLeadSearch = async (queryText: string) => {
    const cleaned = queryText.trim();
    if (!cleaned) {
      addMsg("⚠️ Scrie un query pentru search leads. Exemplu: `search leads dentists bucuresti`.");
      return;
    }

    setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, status: "working", lastAction: "Caută lead-uri în Apollo...", progress: 20 } : ag));
    addMsg(`◎ **Lead Search pornit** pentru: **${cleaned}**`);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleaned, perPage: 8 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      const leads = (Array.isArray(data.results) ? data.results : []) as LeadSearchItem[];
      if (leads.length === 0) {
        addMsg("◎ Nu am găsit lead-uri pentru query-ul curent. Încearcă un query mai specific (nisa + locație + rol).");
      } else {
        const preview = leads
          .slice(0, 5)
          .map((l, idx) => {
            const base = `**${idx + 1}. ${l.name || "Unknown"}** — ${l.title || "No title"} @ ${l.company || "No company"}`;
            const details = [l.email ? `Email: ${l.email}` : "", l.linkedin ? `LinkedIn: ${l.linkedin}` : ""].filter(Boolean).join(" | ");
            return details ? `${base}\n${details}` : base;
          })
          .join("\n\n");
        addMsg(`◎ **Lead Search finalizat** (${data.total || leads.length} rezultate)\n\n${preview}`);
      }
      setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, status: "waiting", lastAction: "Lead search gata", progress: 100 } : ag));
    } catch (err) {
      addMsg(`⚠️ Lead Search a eșuat: ${err instanceof Error ? err.message : "eroare necunoscută"}`);
      setAgents((a) => a.map((ag) => ag.id === "research" ? { ...ag, status: "idle", lastAction: "Eroare lead search", progress: 0 } : ag));
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { id: nextMessageId(), role: "user", content: input.trim(), ts: now() };
    setMessages((m) => [...m, userMsg]);
    // ← NOU: salvează mesajul userului
    if (activeProject) saveMessage(activeProject, { role: "user", content: userMsg.content, ts: userMsg.ts });
    setInput("");
    setIsLoading(true);
    const activeProj = projects.find((p) => p.id === activeProject);
    const content = userMsg.content.toLowerCase();

    if (waitingForCopywriter) {
      const emailType = content.includes("welcome") ? "welcome" : content.includes("promo") ? "promotional" : content.includes("launch") ? "launch" : content.includes("re-eng") ? "re-engagement" : "nurture";
      const length = content.includes("scurt") ? "short" : content.includes("lung") ? "long" : "medium";
      setIsLoading(false);
      await runCopywriter(emailType, length);
      return;
    }

    if (content.includes("research agent") || content.includes("research nișă")) {
      if (activeProj) { setIsLoading(false); await runResearch(activeProj); return; }
    }
    if (content.startsWith("search leads")) {
      setIsLoading(false);
      const q = userMsg.content.replace(/^search leads/i, "").trim() || `${activeProj?.niche || ""}`.trim();
      await runLeadSearch(q);
      return;
    }
    if (content.includes("brief client") || content.includes("strategist")) {
      if (activeProj) { setIsLoading(false); await runStrategist(activeProj); return; }
    }

    setAgents((a) => a.map((ag) => ag.id === "orchestrator" ? { ...ag, status: "thinking", lastAction: "Procesează mesajul..." } : ag));
    try {
      const conversationHistory = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/agents/orchestrator", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversationHistory, projectContext: { activeProject: activeProj, language: lang } }),
      });
      const data = await res.json();
      if (!res.ok) {
        addMsg(`⚠️ Orchestrator indisponibil momentan: ${data.error || "limită API / eroare server"}`);
        setAgents((a) => a.map((ag) => ag.id === "orchestrator" ? { ...ag, status: "idle", lastAction: "Limită API / fallback eșuat", progress: 0 } : ag));
      } else {
        addMsg(data.content || "Eroare la procesare.");
        setAgents((a) => a.map((ag) => ag.id === "orchestrator" ? { ...ag, status: "working", lastAction: `Răspuns trimis (${data.modelUsed || "model"})`, progress: 70 } : ag));
      }
    } catch (err) {
      addMsg("⚠️ Eroare de conexiune la server.");
      setAgents((a) => a.map((ag) => ag.id === "orchestrator" ? { ...ag, status: "idle", lastAction: "Eroare conexiune", progress: 0 } : ag));
    } finally {
      setIsLoading(false);
    }
  };

  const approveAgent = async (agentId: string) => {
    setAgents((a) => a.map((ag) => ag.id === agentId ? { ...ag, status: "idle", lastAction: "Aprobat ✓", progress: 0 } : ag));

    if (agentId === "research") {
      addMsg(`✓ **Research aprobat!**\n\nAcum pornesc **Copywriter Agent**. Înainte să scriu, spune-mi:\n\n**1.** Ce tip de email vrei?\n• Welcome email\n• Nurture / educațional\n• Promotional / ofertă\n• Re-engagement\n• Launch sequence\n\n**2.** Lungime preferată?\n• Scurt (100-150 cuvinte)\n• Mediu (200-300 cuvinte)\n• Lung (400-500 cuvinte)\n\nScrie răspunsul și pornesc imediat.`);
      setAgents((a) => a.map((ag) => ag.id === "copywriter" ? { ...ag, status: "waiting", lastAction: "Așteaptă instrucțiuni..." } : ag));
      setWaitingForCopywriter(true);
      return;
    }

    if (agentId === "copywriter") {
      addMsg(`✓ **Email aprobat!** Pornesc **Fact-checker Agent**...`);
      await runFactChecker();
      return;
    }

    if (agentId === "factchecker") {
      addMsg(`✓ **Fact-checker finalizat!** Emailul este verificat și gata de livrare.`);
      return;
    }

    addMsg(`✓ **Aprobat!** Etapa finalizată.`);
  };

  const refreshProjects = async () => {
    if (!currentUser) return;
    const data = await getProjects(currentUser.uid);
    setProjects(data as Project[]);
    if (!activeProject && data.length > 0) setActiveProject((data[0] as Project).id);
  };

  const openCreateProjectModal = () => {
    setProjectModalMode("create");
    setProjectModalTargetId(null);
    setProjectClientNameInput("");
    setProjectNicheInput("");
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (project: Project) => {
    setProjectModalMode("edit");
    setProjectModalTargetId(project.id);
    setProjectClientNameInput(project.clientName || project.name || "");
    setProjectNicheInput(project.niche || "");
    setProjectModalOpen(true);
  };

  const openDeleteProjectModal = (project: Project) => {
    setProjectModalMode("delete");
    setProjectModalTargetId(project.id);
    setProjectClientNameInput(project.clientName || project.name || "");
    setProjectNicheInput(project.niche || "");
    setProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setProjectModalOpen(false);
    setProjectModalTargetId(null);
  };

  const submitProjectModal = async () => {
    if (!currentUser) return;

    if (projectModalMode === "create") {
      if (!projectClientNameInput.trim() || !projectNicheInput.trim()) return;
      await createProject(currentUser.uid, {
        clientName: projectClientNameInput.trim(),
        niche: projectNicheInput.trim(),
      });
      await refreshProjects();
      closeProjectModal();
      return;
    }

    if (!projectModalTargetId) return;

    if (projectModalMode === "edit") {
      if (!projectClientNameInput.trim() || !projectNicheInput.trim()) return;
      await updateProject(projectModalTargetId, {
        clientName: projectClientNameInput.trim(),
        niche: projectNicheInput.trim(),
      });
      await refreshProjects();
      closeProjectModal();
      return;
    }

    if (projectModalMode === "delete") {
      await deleteProject(projectModalTargetId);
      await refreshProjects();
      if (activeProject === projectModalTargetId) setActiveProject(null);
      closeProjectModal();
    }
  };

  const activeProj = projects.find((p) => p.id === activeProject);
  const activeProjName = activeProj?.clientName || activeProj?.name || "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: BG, color: TEXT, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #222 transparent; }
        *::-webkit-scrollbar { width: 4px; } *::-webkit-scrollbar-track { background: transparent; } *::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        textarea:focus { outline: none; } button { transition: opacity 0.15s; } button:hover { opacity: 0.8; }
      `}</style>

      {/* TOPBAR */}
      <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: `1px solid ${BORDER}`, background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)", position: "relative", zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => setSidebarOpen((o) => !o)} style={{ background: "none", border: "none", color: TEXT_MID, cursor: "pointer", fontSize: 16, padding: "4px 6px" }}>☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 17, color: VIOLET }}>⬡</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", letterSpacing: 2, color: TEXT }}>MAILMIND</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["research", "writing", "review"] as const).map((m) => (
            <button key={m} onClick={() => setLayoutMode(m)} style={{ padding: "4px 14px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", background: layoutMode === m ? VIOLET : "transparent", color: layoutMode === m ? "#fff" : TEXT_MID }}>{m}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setCmdOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_DIM, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>⌘K</button>
          <button onClick={() => setLang((l) => (l === "RO" ? "EN" : "RO"))} style={{ padding: "4px 10px", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_MID, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>{lang}</button>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${VIOLET}, #FF6B35)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
            {currentUser?.email?.[0]?.toUpperCase() || "U"}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* SIDEBAR */}
        {sidebarOpen && (
          <div style={{ width: 240, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", background: SURFACE, flexShrink: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>PROIECTE</span>
                <button onClick={openCreateProjectModal} style={{ background: VIOLET, border: "none", color: "#fff", width: 20, height: 20, borderRadius: 4, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
              </div>
              {projects.length === 0 && <div style={{ fontSize: 11, color: TEXT_DIM, textAlign: "center", padding: "12px 0" }}>Niciun proiect.<br />Apasă + pentru a adăuga.</div>}
              {projects.map((p) => (
                <div key={p.id} onClick={() => setActiveProject(p.id)} style={{ padding: "8px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 3, background: activeProject === p.id ? `${VIOLET}18` : "transparent", border: `1px solid ${activeProject === p.id ? VIOLET + "44" : "transparent"}`, transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: activeProject === p.id ? TEXT : TEXT_MID }}>{p.clientName || p.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditProjectModal(p); }}
                        style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_DIM, fontSize: 9, cursor: "pointer", padding: "0 4px" }}
                      >
                        E
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openDeleteProjectModal(p); }}
                        style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: "#FF6B6B", fontSize: 9, cursor: "pointer", padding: "0 4px" }}
                      >
                        X
                      </button>
                      <span style={{ fontSize: 9, color: p.status === "active" ? "#00E5A0" : TEXT_DIM, fontFamily: "monospace" }}>{p.status === "active" ? "●" : "○"}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: TEXT_DIM, marginTop: 2 }}>{p.niche} · {p.campaigns} campanii</div>
                </div>
              ))}
              {activeProject && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>CAMPAIGNS</span>
                    <button onClick={addCampaign} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: TEXT_MID, borderRadius: 4, fontSize: 10, cursor: "pointer", padding: "0 6px" }}>+</button>
                  </div>
                  {campaigns.length === 0 && (
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>Nicio campanie încă.</div>
                  )}
                  {campaigns.map((c) => (
                    <div
                      key={c.id}
                      onClick={(e) => { e.stopPropagation(); setActiveCampaign(c.id); setSelectedCampaignEmail(null); }}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: `1px solid ${activeCampaign === c.id ? VIOLET + "44" : BORDER}`,
                        background: activeCampaign === c.id ? `${VIOLET}14` : SURFACE2,
                        marginBottom: 4,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                        <div style={{ fontSize: 11, color: TEXT_MID, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name || "Campanie"}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); editCampaign(c); }}
                            style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_DIM, fontSize: 9, cursor: "pointer", padding: "0 4px" }}
                          >
                            E
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCampaign(c); }}
                            style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: "#FF6B6B", fontSize: 9, cursor: "pointer", padding: "0 4px" }}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeCampaign && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>EMAILS</span>
                    <span style={{ fontSize: 10, color: TEXT_DIM }}>{campaignEmails.length}</span>
                  </div>
                  {campaignEmails.length === 0 && (
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>Niciun email în campania activă.</div>
                  )}
                  {campaignEmails.slice(0, 6).map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedCampaignEmail(email)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: `1px solid ${selectedCampaignEmail?.id === email.id ? VIOLET + "44" : BORDER}`,
                        background: selectedCampaignEmail?.id === email.id ? `${VIOLET}14` : SURFACE2,
                        marginBottom: 4,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 11, color: TEXT_MID, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {email.subject || "(fără subiect)"}
                      </div>
                      <div style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{email.status || "draft"}</div>
                    </div>
                  ))}
                </div>
              )}
              {!activeCampaign && activeProject && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>PROJECT EMAILS</span>
                    <span style={{ fontSize: 10, color: TEXT_DIM }}>{projectEmails.length}</span>
                  </div>
                  {projectEmails.length === 0 && (
                    <div style={{ fontSize: 10, color: TEXT_DIM }}>Niciun email salvat pe proiect.</div>
                  )}
                  {projectEmails.slice(0, 6).map((email) => (
                    <div
                      key={email.id}
                      onClick={() => setSelectedCampaignEmail(email)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: `1px solid ${selectedCampaignEmail?.id === email.id ? VIOLET + "44" : BORDER}`,
                        background: selectedCampaignEmail?.id === email.id ? `${VIOLET}14` : SURFACE2,
                        marginBottom: 4,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 11, color: TEXT_MID, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {email.subject || "(fără subiect)"}
                      </div>
                      <div style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{email.status || "draft"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>MISSION CONTROL</span>
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: TEXT_MID }}>{activeProjName}</span>
                  <span style={{ fontSize: 11, color: VIOLET }}>{Math.max(...agents.map(a => a.progress))}%</span>
                </div>
                <div style={{ background: "#1a1a1a", borderRadius: 3, height: 3 }}>
                  <div style={{ width: `${Math.max(...agents.map(a => a.progress))}%`, height: "100%", background: VIOLET, borderRadius: 3, transition: "width 0.6s ease" }} />
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: TEXT_DIM }}>{agents.filter((a) => a.status !== "idle").length} agenți activi · {agents.filter((a) => a.status === "waiting").length} așteaptă</div>
              </div>
            </div>
            <div style={{ padding: "14px 16px", flex: 1 }}>
              <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>BUSINESS HEALTH</span>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Venit est.", value: `€${projectEmailsCount * 25}`, color: "#00E5A0" },
                  { label: "Clienți", value: String(projects.filter((p) => p.status === "active").length), color: VIOLET },
                  { label: "Emailuri", value: String(projectEmailsCount), color: "#00D4FF" },
                  { label: "Proiecte", value: String(projects.length), color: "#FFD700" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: SURFACE2, borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
                    <div style={{ fontSize: 9, color: TEXT_DIM, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CHAT CENTER */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>{activeProjName}</span>
              <span style={{ fontSize: 12, color: TEXT_DIM, marginLeft: 8 }}>{activeProj?.niche} · {activeProj?.campaigns ?? 0} campanii</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Research", "Writing", "QA", "Export"].map((s) => (
                <span key={s} style={{ fontSize: 10, padding: "3px 8px", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_MID, cursor: "pointer" }}>{s}</span>
              ))}
            </div>
          </div>
          {selectedCampaignEmail && (
            <div style={{ margin: "10px 20px 0", padding: "10px 12px", border: `1px solid ${BORDER}`, borderRadius: 10, background: SURFACE2 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>EMAIL PREVIEW</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={editSelectedEmail}
                    style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_DIM, fontSize: 10, cursor: "pointer", padding: "0 6px" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setSelectedCampaignEmail(null)}
                    style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 4, color: TEXT_DIM, fontSize: 10, cursor: "pointer", padding: "0 6px" }}
                  >
                    X
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: TEXT, fontWeight: 600, marginBottom: 6 }}>
                {selectedCampaignEmail.subject || "(fără subiect)"}
              </div>
              <div style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>
                {selectedCampaignEmail.body || "Conținut indisponibil pentru acest draft."}
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
            {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${VIOLET}22`, border: `1px solid ${VIOLET}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: VIOLET }}>⬡</div>
                <div style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: "12px 12px 12px 2px", padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: VIOLET, display: "inline-block", animation: `blink 1.2s ${i * 0.2}s infinite` }} />)}</div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: "14px 20px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 14px" }}>
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={waitingForCopywriter ? "Scrie tipul de email și lungimea..." : "Scrie un mesaj Orchestratorului... (Enter pentru trimite)"}
                style={{ flex: 1, background: "none", border: "none", color: TEXT, fontSize: 13, resize: "none", maxHeight: 100, lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif" }} rows={1} />
              <button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{ width: 32, height: 32, borderRadius: 8, background: input.trim() && !isLoading ? VIOLET : SURFACE, border: `1px solid ${input.trim() && !isLoading ? VIOLET : BORDER}`, color: "#fff", cursor: input.trim() ? "pointer" : "default", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>↑</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {waitingForCopywriter ? (
                ["Welcome", "Nurture", "Promotional", "Scurt", "Mediu", "Lung"].map((q) => (
                  <button key={q} onClick={() => setInput((i) => i ? i + " " + q : q)} style={{ padding: "3px 10px", background: `${VIOLET}22`, border: `1px solid ${VIOLET}44`, borderRadius: 20, color: TEXT_MID, fontSize: 10, cursor: "pointer" }}>{q}</button>
                ))
              ) : (
                ["Research Nișă", "Search Leads", "Email Nou", "Brief Client", "Export"].map((q) => (
                  <button key={q} onClick={() => {
                    if (q === "Research Nișă" && activeProj) runResearch(activeProj);
                    else if (q === "Search Leads") {
                      const seed = activeProj?.niche ? `${activeProj.niche} founders romania` : "";
                      runLeadSearch(seed);
                    }
                    else if (q === "Brief Client" && activeProj) runStrategist(activeProj);
                    else if (q === "Export") runExportDocx();
                    else setInput(q);
                  }} style={{ padding: "3px 10px", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 20, color: TEXT_DIM, fontSize: 10, cursor: "pointer" }}>{q}</button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* PANOURI AGENȚI */}
        <div style={{ width: rightOpen ? 262 : 38, borderLeft: `1px solid ${BORDER}`, background: SURFACE, flexShrink: 0, display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden" }}>
          <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: rightOpen ? "space-between" : "center", padding: rightOpen ? "0 12px" : "0", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {rightOpen && <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1 }}>AGENȚI AI</span>}
            <button onClick={() => setRightOpen((o) => !o)} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT_MID, cursor: "pointer", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{rightOpen ? "›" : "‹"}</button>
          </div>
          {rightOpen && (
            <div style={{ flex: 1, overflow: "auto", padding: "12px" }}>
              {agents.map((agent) => <AgentCard key={agent.id} agent={agent} onApprove={approveAgent} />)}
              <div style={{ marginTop: 16, borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
                <div style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>INBOX IDEI</div>
                {ideas.length === 0 && (
                  <div style={{ fontSize: 11, color: TEXT_DIM, marginBottom: 8 }}>
                    Nicio idee salvată încă pentru proiectul curent.
                  </div>
                )}
                {ideas.map((idea) => (
                  <div key={idea.id} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "8px 10px", marginBottom: 6 }}>
                    <p style={{ fontSize: 11, color: TEXT_MID, margin: "0 0 4px 0", lineHeight: 1.4 }}>{idea.text || "—"}</p>
                    <span style={{ fontSize: 9, color: VIOLET, fontFamily: "monospace" }}>{idea.tag || "general"}</span>
                  </div>
                ))}
                <button onClick={addIdea} style={{ width: "100%", padding: "7px", background: "transparent", border: `1px dashed ${BORDER}`, borderRadius: 7, color: TEXT_DIM, fontSize: 11, cursor: "pointer", marginTop: 4 }}>+ Adaugă idee</button>
              </div>
            </div>
          )}
          {!rightOpen && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 12, gap: 10 }}>
              {agents.map((agent) => {
                const color = agentColors[agent.role];
                return <div key={agent.id} title={agent.name} style={{ width: 28, height: 28, borderRadius: 7, background: agent.status !== "idle" ? `${color}22` : SURFACE2, border: `1px solid ${agent.status !== "idle" ? color + "66" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color, boxShadow: agent.status === "waiting" ? `0 0 8px ${color}44` : "none", cursor: "pointer" }}>{agentIcons[agent.role]}</div>;
              })}
            </div>
          )}
        </div>
      </div>

      {/* COMMAND PALETTE */}
      {cmdOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh", zIndex: 100, backdropFilter: "blur(4px)" }} onClick={() => setCmdOpen(false)}>
          <div style={{ width: 520, background: SURFACE, border: `1px solid ${VIOLET}44`, borderRadius: 12, overflow: "hidden", boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 30px ${VIOLET}22` }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ color: TEXT_DIM, marginRight: 10 }}>⌘</span>
              <input autoFocus placeholder="Caută sau execută o comandă..." style={{ flex: 1, background: "none", border: "none", color: TEXT, fontSize: 14, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
            </div>
            {[
              { icon: "◎", label: "Research Nișă Nouă", sub: "Pornește Research Agent", action: () => activeProj && runResearch(activeProj) },
              { icon: "✦", label: "Email Nou", sub: "Deschide Copywriter" },
              { icon: "⬡", label: "Proiect Nou", sub: "Creează client nou", action: openCreateProjectModal },
              { icon: "↓", label: "Export Proiect", sub: "Descarcă .docx", action: runExportDocx },
              { icon: "◈", label: "Brief Client", sub: "Pornește Strategist", action: () => activeProj && runStrategist(activeProj) },
            ].map((cmd, i) => (
              <div key={i} onClick={() => { setCmdOpen(false); cmd.action?.(); }} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE2)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ color: VIOLET, fontSize: 16, width: 20, textAlign: "center" }}>{cmd.icon}</span>
                <div>
                  <div style={{ fontSize: 13, color: TEXT }}>{cmd.label}</div>
                  <div style={{ fontSize: 11, color: TEXT_DIM }}>{cmd.sub}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: "8px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 16 }}>
              <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace" }}>ESC închide</span>
              <span style={{ fontSize: 10, color: TEXT_DIM, fontFamily: "monospace" }}>↵ execută</span>
            </div>
          </div>
        </div>
      )}

      {projectModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}
          onClick={closeProjectModal}
        >
          <div
            style={{ width: 420, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 12 }}>
              {projectModalMode === "create" && "Proiect nou"}
              {projectModalMode === "edit" && "Editează proiect"}
              {projectModalMode === "delete" && "Șterge proiect"}
            </div>

            {projectModalMode !== "delete" ? (
              <>
                <input
                  value={projectClientNameInput}
                  onChange={(e) => setProjectClientNameInput(e.target.value)}
                  placeholder="Nume client"
                  style={{ width: "100%", marginBottom: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT }}
                />
                <input
                  value={projectNicheInput}
                  onChange={(e) => setProjectNicheInput(e.target.value)}
                  placeholder="Nișă"
                  style={{ width: "100%", marginBottom: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE2, color: TEXT }}
                />
              </>
            ) : (
              <div style={{ fontSize: 12, color: TEXT_MID, marginBottom: 12 }}>
                Confirmi ștergerea proiectului <strong style={{ color: TEXT }}>{projectClientNameInput || "—"}</strong>?
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={closeProjectModal} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_MID, cursor: "pointer" }}>
                Anulează
              </button>
              <button
                onClick={submitProjectModal}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: projectModalMode === "delete" ? "#FF6B6B" : VIOLET,
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {projectModalMode === "create" && "Creează"}
                {projectModalMode === "edit" && "Salvează"}
                {projectModalMode === "delete" && "Șterge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}