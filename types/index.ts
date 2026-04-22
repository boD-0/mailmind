export type AgentStatus = 'idle' | 'thinking' | 'working' | 'waiting';

export interface Agent {
  id: string;
  name: string;
  role: 'orchestrator' | 'research' | 'copywriter' | 'strategist' | 'factchecker';
  status: AgentStatus;
  lastAction?: string;
  progress?: number;
}

export interface Project {
  id: string;
  clientName: string;
  niche: string;
  avatar?: string;
  toneOfVoice?: string;
  campaigns: Campaign[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  projectId: string;
  name: string;
  emails: Email[];
  status: 'research' | 'writing' | 'review' | 'approved' | 'delivered';
  createdAt: Date;
}

export interface Email {
  id: string;
  campaignId: string;
  subject: string;
  body: string;
  ctaVariants: string[];
  status: 'draft' | 'reviewed' | 'approved';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  agentId?: string;
  timestamp: Date;
}

export interface ResearchReport {
  painPoints: string[];
  realLanguage: string[];
  competition: string;
  trends: string[];
  ctaOpportunities: string[];
  differentiationAngle: string;
  sources: string[];
}