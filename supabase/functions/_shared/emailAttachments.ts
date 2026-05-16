export type EdgeEmailAttachment = {
  fileName: string;
  contentType: string;
  base64Content: string;
};

export type AttachmentAudit = {
  expected: number;
  delivered: number;
  names: string[];
};

const PDF_BASE64_MAGIC = 'JVBERi0';

export const normalizeBase64Content = (value: unknown) => {
  const raw = String(value || '').trim();
  const withoutDataUrl = raw.includes(',') ? raw.split(',').pop() || '' : raw;
  return withoutDataUrl.replace(/\s+/g, '');
};

export const sanitizeAttachmentFileName = (value: unknown) => {
  const fileName = String(value || 'anexo.pdf')
    .replace(/[\r\n"]/g, '_')
    .trim();
  return (fileName || 'anexo.pdf').slice(0, 160);
};

export const normalizeEmailAttachments = (value: unknown): EdgeEmailAttachment[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((attachment): EdgeEmailAttachment => ({
      fileName: sanitizeAttachmentFileName((attachment as any)?.fileName),
      contentType: String((attachment as any)?.contentType || 'application/octet-stream'),
      base64Content: normalizeBase64Content((attachment as any)?.base64Content)
    }))
    .filter(attachment => attachment.fileName && attachment.base64Content);
};

export const assertProposalPdfAttachment = (
  markProposalSent: boolean,
  attachments: EdgeEmailAttachment[]
) => {
  if (!markProposalSent) return;
  const attachment = attachments[0];
  const validPdf = attachment
    && attachment.contentType === 'application/pdf'
    && attachment.fileName.toLowerCase().endsWith('.pdf')
    && attachment.base64Content.startsWith(PDF_BASE64_MAGIC);
  if (!validPdf) {
    throw new Error('O PDF da proposta nao foi anexado corretamente. O e-mail nao foi enviado.');
  }
};

export const createAttachmentAudit = (
  attachments: EdgeEmailAttachment[],
  deliveredNames: string[] = []
): AttachmentAudit => {
  const normalizedDelivered = deliveredNames.map(name => name.toLowerCase());
  return {
    expected: attachments.length,
    delivered: attachments.filter(attachment => normalizedDelivered.includes(attachment.fileName.toLowerCase())).length,
    names: attachments.map(attachment => attachment.fileName)
  };
};

export const assertAttachmentAuditDelivered = (
  markProposalSent: boolean,
  audit: AttachmentAudit
) => {
  if (!markProposalSent) return;
  const expected = Math.max(1, audit.expected);
  if (audit.delivered < expected) {
    throw new Error('O provedor nao confirmou o anexo PDF da proposta. O e-mail nao foi registrado como proposta enviada.');
  }
};

