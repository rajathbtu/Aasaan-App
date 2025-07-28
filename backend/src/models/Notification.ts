/**
 * An in‑app notification.  Notifications can be generated for many
 * events: new work opportunities, accepted requests, rating prompts,
 * subscription reminders, etc.  Each notification contains a type so
 * clients can handle it appropriately, a title and message for display
 * and a payload with additional context (e.g. request ID).
 */
export interface Notification {
  id: string;
  userId: string;
  type:
    | 'newRequest'
    | 'requestAccepted'
    | 'ratingPrompt'
    | 'boostPromotion'
    | 'autoClosed'
    | 'planPromotion';
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  data?: Record<string, any>;
}