import { AttachmentAudit, EmailAttachment, GoogleEmailDraft, MicrosoftEmailDraft } from '../types';

const PDF_BASE64_MAGIC = 'JVBERi0';

const normalizeBase64 = (value?: string) => {
  const raw = String(value || '').trim();
  const withoutDataUrl = raw.includes(',') ? raw.split(',').pop() || '' : raw;
  return withoutDataUrl.replace(/\s+/g, '');
};

const isPdfAttachment = (attachment?: EmailAttachment) => {
  if (!attachment) return false;
  const base64Content = normalizeBase64(attachment.base64Content);
  return attachment.contentType === 'application/pdf'
    && attachment.fileName.toLowerCase().endsWith('.pdf')
    && base64Content.startsWith(PDF_BASE64_MAGIC)
    && base64Content.length > PDF_BASE64_MAGIC.length;
};

const raiseSentButUnverified = (message: string) => {
  const error = new Error(message);
  (error as any).emailSent = true;
  throw error;
};

export const ensureProposalPdfAttachment = (draft: GoogleEmailDraft | MicrosoftEmailDraft) => {
  if (!draft.markProposalSent) return;
  const attachment = draft.attachments?.[0];
  if (!isPdfAttachment(attachment)) {
    throw new Error('O PDF da proposta nao foi anexado corretamente. O e-mail nao foi enviado.');
  }
};

export const ensureProviderAttachmentAudit = (
  draft: GoogleEmailDraft | MicrosoftEmailDraft,
  attachmentAudit?: AttachmentAudit
) => {
  if (!draft.markProposalSent) return;
  const expected = Math.max(1, draft.attachments?.length || 0);
  if (!attachmentAudit || attachmentAudit.delivered < expected) {
    raiseSentButUnverified('O provedor nao confirmou o anexo PDF da proposta. A proposta nao foi marcada como enviada.');
  }
};

