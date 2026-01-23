export interface Message {
  id: number;
  senderId: string | null;
  receiverId: string | null;
  content: string | null;
  createdDate: string;
  isRead: boolean;

  // --- YENİ EKLENEN ALANLAR ---
  messageType: 'Text' | 'Image' | 'File';
  attachmentUrl?: string;
  attachmentName?: string;
}
