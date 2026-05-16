import { CRMCommunication, CRMExternalEvent, CRMTask, TimelineEvent } from '../types';

export type CommunicationThread = {
  key: string;
  provider: CRMCommunication['provider'];
  subject: string;
  messages: CRMCommunication[];
  lastMessage: CRMCommunication;
  inboundCount: number;
  outboundCount: number;
  participants: string[];
};

export type CommercialTimelineItem =
  | { id: string; kind: 'communication'; date: string; communication: CRMCommunication }
  | { id: string; kind: 'external_event'; date: string; event: CRMExternalEvent }
  | { id: string; kind: 'task'; date: string; task: CRMTask }
  | { id: string; kind: 'timeline'; date: string; event: TimelineEvent };

export const getCommunicationDate = (communication: CRMCommunication) =>
  communication.receivedAt || communication.sentAt || communication.createdAt;

export const getCommunicationThreadKey = (communication: CRMCommunication) =>
  communication.gmailThreadId ||
  communication.microsoftConversationId ||
  communication.gmailMessageId ||
  communication.microsoftMessageId ||
  communication.id;

export const groupCommunicationThreads = (communications: CRMCommunication[]): CommunicationThread[] => {
  const grouped = new Map<string, CRMCommunication[]>();

  communications.forEach(communication => {
    const key = getCommunicationThreadKey(communication);
    grouped.set(key, [...(grouped.get(key) || []), communication]);
  });

  return Array.from(grouped.entries())
    .map(([key, messages]) => {
      const sortedMessages = [...messages].sort((a, b) => new Date(getCommunicationDate(a)).getTime() - new Date(getCommunicationDate(b)).getTime());
      const lastMessage = sortedMessages[sortedMessages.length - 1];
      const participantSet = new Set<string>();

      sortedMessages.forEach(message => {
        if (message.fromEmail) participantSet.add(message.fromEmail);
        message.toEmails.forEach(email => participantSet.add(email));
        message.ccEmails.forEach(email => participantSet.add(email));
      });

      return {
        key,
        provider: lastMessage.provider,
        subject: lastMessage.subject || sortedMessages[0]?.subject || '(sem assunto)',
        messages: sortedMessages,
        lastMessage,
        inboundCount: sortedMessages.filter(message => message.direction === 'inbound').length,
        outboundCount: sortedMessages.filter(message => message.direction === 'outbound').length,
        participants: Array.from(participantSet).filter(Boolean)
      };
    })
    .sort((a, b) => new Date(getCommunicationDate(b.lastMessage)).getTime() - new Date(getCommunicationDate(a.lastMessage)).getTime());
};

export const buildCommercialTimeline = (input: {
  communications?: CRMCommunication[];
  externalEvents?: CRMExternalEvent[];
  tasks?: CRMTask[];
  timeline?: TimelineEvent[];
}): CommercialTimelineItem[] => [
  ...(input.communications || []).map(communication => ({
    id: `communication-${communication.id}`,
    kind: 'communication' as const,
    date: getCommunicationDate(communication),
    communication
  })),
  ...(input.externalEvents || []).map(event => ({
    id: `external-event-${event.id}`,
    kind: 'external_event' as const,
    date: event.startsAt,
    event
  })),
  ...(input.tasks || []).map(task => ({
    id: `task-${task.id}`,
    kind: 'task' as const,
    date: task.dueDate,
    task
  })),
  ...(input.timeline || []).map(event => ({
    id: `timeline-${event.id}`,
    kind: 'timeline' as const,
    date: event.date,
    event
  }))
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const groupTimelineByDay = (items: CommercialTimelineItem[]) =>
  items.reduce<Record<string, CommercialTimelineItem[]>>((acc, item) => {
    const label = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    acc[label] = [...(acc[label] || []), item];
    return acc;
  }, {});
