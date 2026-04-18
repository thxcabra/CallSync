import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { TeamMember, Project, Call, CallAnalysis, NotionPreview } from './types';

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: () => api<{ members: TeamMember[] }>('GET', '/team-members').then((r) => r.members),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api<{ projects: Project[] }>('GET', '/projects').then((r) => r.projects),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api<{ project: Project; calls: Call[] }>('GET', `/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { input: Record<string, unknown>; authorName: string }) =>
      api<{ project: Project }>('POST', '/projects', { body: args.input, authorName: args.authorName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: Record<string, unknown>; authorName: string }) =>
      api<{ project: Project }>('PATCH', `/projects/${args.id}`, { body: args.input, authorName: args.authorName }),
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project', args.id] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; authorName: string }) =>
      api<null>('DELETE', `/projects/${args.id}`, { authorName: args.authorName }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useCall(id: string | undefined) {
  return useQuery({
    queryKey: ['call', id],
    queryFn: () => api<{ call: Call; analysis: CallAnalysis | null }>('GET', `/calls/${id}`),
    enabled: !!id,
  });
}

export function useCreateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { projectId: string; formData: FormData; authorName: string }) =>
      api<{ call: Call }>('POST', `/projects/${args.projectId}/calls`, {
        formData: args.formData,
        authorName: args.authorName,
      }),
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ['project', args.projectId] });
    },
  });
}

export function useUpdateCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; input: Record<string, unknown>; authorName: string }) =>
      api<{ call: Call }>('PATCH', `/calls/${args.id}`, { body: args.input, authorName: args.authorName }),
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ['call', args.id] });
      qc.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

export function useDeleteCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; authorName: string }) =>
      api<null>('DELETE', `/calls/${args.id}`, { authorName: args.authorName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

export function useTranscribeCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (callId: string) =>
      api<{ transcript: string }>('POST', `/calls/${callId}/transcribe`),
    onSuccess: (_, callId) => qc.invalidateQueries({ queryKey: ['call', callId] }),
  });
}

export function useAnalyzeCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { callId: string; authorName: string }) =>
      api<{ analysis: CallAnalysis }>('POST', `/calls/${args.callId}/analyze`, { authorName: args.authorName }),
    onSuccess: (_, args) => qc.invalidateQueries({ queryKey: ['call', args.callId] }),
  });
}

export function useNotionPreview(callId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['notion-preview', callId],
    queryFn: () =>
      api<{ preview: NotionPreview }>('GET', `/calls/${callId}/notion-preview`).then(
        (r) => r.preview
      ),
    enabled: !!callId && enabled,
    staleTime: 0,
  });
}

export function useSyncToNotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { callId: string; items: string[] | 'all'; authorName: string }) =>
      api<{ results: Array<{ item: string; notion_id?: string; error?: string }>; partial: boolean; synced_count: number }>(
        'POST',
        `/calls/${args.callId}/sync-notion`,
        { body: { items: args.items }, authorName: args.authorName }
      ),
    onSuccess: (_, args) => {
      qc.invalidateQueries({ queryKey: ['notion-preview', args.callId] });
    },
  });
}

export function useAudioUrl(callId: string | undefined, audioPath: string | null) {
  return useQuery({
    queryKey: ['audio-url', callId],
    queryFn: () => api<{ url: string }>('GET', `/calls/${callId}/audio-url`).then((r) => r.url),
    enabled: !!callId && !!audioPath,
    staleTime: 1000 * 60 * 50,
  });
}
