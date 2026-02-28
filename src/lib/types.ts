// ===== Database Models =====

export interface Article {
  id: string;
  title: string;
  content: string;
  category: ArticleCategory;
  tags: string[];
  status: ArticleStatus;
  created_at: string;
  updated_at: string;
}

export type ArticleCategory = 'general' | 'policy' | 'faq' | 'procedure' | 'troubleshooting';
export type ArticleStatus = 'active' | 'archived';

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[]; // article IDs
  created_at: string;
}

// ===== API Request/Response =====

export interface CreateArticleRequest {
  title: string;
  content: string;
  category?: ArticleCategory;
  tags?: string[];
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  category?: ArticleCategory;
  tags?: string[];
  status?: ArticleStatus;
}

export interface ChatRequest {
  conversation_id?: string; // omit to create new conversation
  message: string;
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  category: ArticleCategory;
  rank: number;
  snippet: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationSummary extends Conversation {
  message_count: number;
  last_message?: string;
}

// ===== API Response Wrappers =====

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
}
