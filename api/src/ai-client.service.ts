import { Injectable } from '@nestjs/common';

/** Thin typed client for the internal FastAPI service. */
@Injectable()
export class AiClient {
  private readonly base = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';
  private readonly headers = {
    'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
  };

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.base}${path}`, {
      ...init,
      headers: { ...this.headers, ...(init.headers as Record<string, string>) },
    });
  }
}
