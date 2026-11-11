export interface User {
  id: string;
  username: string;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  bio?: string;
  status_message?: string;
  is_verified?: boolean;
  is_2fa_enabled?: boolean;
  is_staff?: boolean;
  is_online?: boolean;
  last_seen?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  bio: string;
  avatar?: string | null;
  cover_image?: string | null;
  status_message: string;
  hide_last_seen: boolean;
  hide_online_status: boolean;
  profile_photo_privacy: 'everyone' | 'contacts' | 'nobody';
  read_receipt_privacy: boolean;
  group_add_privacy: 'everyone' | 'contacts' | 'nobody';
  is_online: boolean;
  last_seen?: string;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  user: User;
  created_at: string;
}

export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  media_type: 'image' | 'video' | 'audio' | 'voice' | 'document' | 'other';
  thumbnail_url?: string | null;
  duration?: number | null;
  waveform_data?: number[];
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: User | null;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'voice' | 'document' | 'location' | 'contact' | 'poll' | 'system';
  content: string;
  reply_to?: {
    id: string;
    sender: User | null;
    content: string;
    message_type: string;
  } | null;
  forward_from_id?: string | null;
  is_edited: boolean;
  edited_at?: string | null;
  is_deleted_for_everyone: boolean;
  is_pinned: boolean;
  pinned_at?: string | null;
  is_starred: boolean;
  delivery_status?: 'sent' | 'delivered' | 'read';
  reactions: MessageReaction[];
  attachments: Attachment[];
  metadata?: Record<string, any>;
  disappears_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  user: User;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joined_at: string;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  unread_count: number;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'channel';
  display_title: string;
  display_avatar?: string | null;
  last_message?: {
    id: string;
    content: string;
    message_type: string;
    sender_username: string;
    created_at: string;
  } | null;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  other_participant?: User | null;
  updated_at: string;
  members?: ConversationMember[];
  pinned_messages?: Message[];
}

export interface StoryItem {
  id: string;
  user: User;
  media_type: 'text' | 'image' | 'video';
  media_url?: string | null;
  text_content?: string;
  background_color: string;
  font_style: string;
  caption?: string;
  expires_at: string;
  created_at: string;
  views_count: number;
  viewers?: { id: string; viewer: User; viewed_at: string }[];
  reactions: { id: string; user: User; emoji: string }[];
  has_viewed: boolean;
}

export interface StoryFeedGroup {
  user: User;
  is_me: boolean;
  statuses: StoryItem[];
  has_unviewed: boolean;
  last_updated: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes_count: number;
  has_voted: boolean;
}

export interface Poll {
  id: string;
  conversation_id: string;
  creator: User;
  question: string;
  is_multiple_choice: boolean;
  is_closed: boolean;
  options: PollOption[];
  total_votes: number;
  created_at: string;
}

export interface CallSession {
  id: string;
  caller: User;
  conversation_id?: string | null;
  call_type: 'audio' | 'video' | 'group';
  status: 'ringing' | 'active' | 'ended' | 'rejected' | 'missed' | 'busy';
  room_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  is_outgoing: boolean;
  participants: {
    id: string;
    user: User;
    role: 'caller' | 'receiver';
    status: 'invited' | 'joined' | 'declined' | 'left';
    is_muted: boolean;
    is_camera_off: boolean;
    is_screen_sharing: boolean;
  }[];
}
