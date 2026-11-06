export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/quizzino/backend/public';
const TOKEN_KEY = 'quizzino_jwt_token';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
  }

  public getToken(): string | null {
    return this.token;
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || `Errore server (${response.status})`;
      throw new Error(errorMsg);
    }

    return data?.data !== undefined ? data.data : data;
  }

  // Auth endpoints
  public async register(payload: { username: string; email: string; password: string }): Promise<{ user: AuthUser; token: string }> {
    const res = await this.request<{ user: AuthUser; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async login(payload: { login: string; password: string }): Promise<{ user: AuthUser; token: string }> {
    const res = await this.request<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<{ user: AuthUser; stats: any }> {
    return this.request<{ user: AuthUser; stats: any }>('/auth/me');
  }

  public async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    return this.request<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public logout(): void {
    this.setToken(null);
  }

  // Decks endpoints
  public async getDecks(): Promise<any[]> {
    return this.request<any[]>('/decks');
  }

  public async saveDeck(deck: any): Promise<any> {
    return this.request<any>('/decks', {
      method: 'POST',
      body: JSON.stringify(deck),
    });
  }

  public async deleteDeck(deckId: string): Promise<void> {
    return this.request<void>(`/decks/${deckId}`, {
      method: 'DELETE',
    });
  }

  public async syncDecks(decks: any[]): Promise<void> {
    return this.request<void>('/decks/sync', {
      method: 'POST',
      body: JSON.stringify({ decks }),
    });
  }

  public async recordDeckScore(deckId: string, scores: { bestBlocksScore?: number; bestMatchTimeMs?: number }): Promise<void> {
    return this.request<void>('/decks/record', {
      method: 'POST',
      body: JSON.stringify({ deckId, ...scores }),
    });
  }

  // Study & SM-2 endpoints
  public async updateCardGrade(deckId: string, cardId: string, sm2: any): Promise<void> {
    return this.request<void>('/study/grade', {
      method: 'POST',
      body: JSON.stringify({ deckId, cardId, sm2 }),
    });
  }

  public async toggleCardStar(deckId: string, cardId: string): Promise<void> {
    return this.request<void>('/study/star', {
      method: 'POST',
      body: JSON.stringify({ deckId, cardId }),
    });
  }

  public async recordActivity(params: { cardsStudied?: number; quizCompleted?: boolean; matchPlayed?: boolean }): Promise<void> {
    return this.request<void>('/study/activity', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }
}

export const api = new ApiService();
