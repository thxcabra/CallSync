export interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  active: boolean;
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  description: string | null;
  campaign_docs: Array<{ name: string; url?: string; storage_path?: string; type?: string }>;
  planned_posts_count: number | null;
  team: { manager?: string; analysts?: string[]; strategists?: string[] };
  contacts: Array<{ name: string; email?: string; phone?: string; role?: string }>;
  reference_links: Array<{ label: string; url: string }>;
  start_date: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  project_id: string;
  title: string | null;
  call_date: string;
  participants: Array<{ name: string; role?: string; email?: string }>;
  audio_path: string | null;
  audio_duration_seconds: number | null;
  transcript: string | null;
  transcript_source: 'upload' | 'manual';
  transcript_status: 'pending' | 'transcribing' | 'transcribed' | 'failed';
  transcript_error: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  description: string;
  owner?: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface Note {
  topic: string;
  content: string;
}

export interface Feedback {
  topic: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  content: string;
}

export interface CallAnalysis {
  id: string;
  call_id: string;
  status: 'pending' | 'analyzing' | 'done' | 'failed';
  summary: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  sentiment_justification: string | null;
  tasks: Task[];
  notes: Note[];
  feedback: Feedback[];
  model_used: string | null;
  error_message: string | null;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}
