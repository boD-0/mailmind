import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── PROJECTS ────────────────────────────────────────────────

export async function getProjects(userId: string) {
  const q = query(
    collection(db, "projects"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createProject(
  userId: string,
  data: { clientName: string; niche: string; avatar?: string; toneOfVoice?: string }
) {
  const ref = await addDoc(collection(db, "projects"), {
    userId,
    ...data,
    campaigns: 0,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProject(projectId: string, data: Partial<{ clientName: string; niche: string; status: string; campaigns: number }>) {
  await updateDoc(doc(db, "projects", projectId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProject(projectId: string) {
  await deleteDoc(doc(db, "projects", projectId));
}

// ─── CAMPAIGNS ───────────────────────────────────────────────

export async function getCampaigns(projectId: string) {
  const q = query(
    collection(db, "campaigns"),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aSec = (a as { createdAt?: { seconds?: number } }).createdAt?.seconds ?? 0;
      const bSec = (b as { createdAt?: { seconds?: number } }).createdAt?.seconds ?? 0;
      return bSec - aSec;
    });
}

export async function createCampaign(projectId: string, name: string) {
  const ref = await addDoc(collection(db, "campaigns"), {
    projectId,
    name,
    emails: [],
    status: "research",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCampaign(campaignId: string, data: Partial<{ name: string; status: string }>) {
  await updateDoc(doc(db, "campaigns", campaignId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCampaign(campaignId: string) {
  await deleteDoc(doc(db, "campaigns", campaignId));
}

// ─── EMAILS ──────────────────────────────────────────────────

export async function saveEmail(
  campaignId: string,
  email: { subject: string; body: string; ctaVariants: string[]; emailType: string }
) {
  const ref = await addDoc(collection(db, "emails"), {
    campaignId,
    ...email,
    status: "draft",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getEmails(campaignId: string) {
  const q = query(
    collection(db, "emails"),
    where("campaignId", "==", campaignId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateEmail(emailId: string, data: Partial<{ subject: string; body: string; status: string }>) {
  await updateDoc(doc(db, "emails", emailId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Emailuri generate direct pe proiect (fără campanie explicită)
export async function saveProjectEmail(
  projectId: string,
  email: {
    subject: string;
    body: string;
    ctaVariants: string[];
    emailType: string;
    preheader?: string;
    notes?: string;
    generatedBy?: string;
  }
) {
  const ref = await addDoc(collection(db, "projectEmails"), {
    projectId,
    ...email,
    status: "draft",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getProjectEmails(projectId: string) {
  const q = query(
    collection(db, "projectEmails"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── MESSAGES (Conversație AI) ───────────────────────────────

/**
 * Recuperează istoricul mesajelor pentru un anumit proiect.
 * Folosit pentru a menține contextul conversației în Dashboard.
 */
export async function getMessages(projectId: string) {
  const q = query(
    collection(db, "messages"),
    where("projectId", "==", projectId),
    orderBy("createdAt", "asc") // 'asc' pentru a păstra ordinea cronologică a discuției
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Salvează un mesaj nou (user sau assistant) în baza de date.
 */
export async function saveMessage(
  projectId: string, 
  msg: { role: string; content: string; ts: string }
) {
  await addDoc(collection(db, "messages"), {
    projectId,
    ...msg,
    createdAt: serverTimestamp(),
  });
}

// ─── IDEAS (Inbox Idei) ───────────────────────────────────────

export async function getProjectIdeas(projectId: string) {
  const q = query(
    collection(db, "ideas"),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aSec = (a as { createdAt?: { seconds?: number } }).createdAt?.seconds ?? 0;
      const bSec = (b as { createdAt?: { seconds?: number } }).createdAt?.seconds ?? 0;
      return bSec - aSec;
    });
}

export async function saveProjectIdea(
  projectId: string,
  idea: { text: string; tag?: string; source?: string }
) {
  const ref = await addDoc(collection(db, "ideas"), {
    projectId,
    text: idea.text,
    tag: idea.tag || "general",
    source: idea.source || "manual",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}