import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { AiClient } from '../ai-client.service';
import { JwtGuard } from '../auth/jwt.guard';

class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  question: string;

  @IsOptional()
  @IsArray()
  history?: { role: 'user' | 'assistant'; content: string }[];
}

@Controller('chat')
@UseGuards(JwtGuard)
export class ChatController {
  constructor(private readonly ai: AiClient) {}

  /** Streams Server-Sent Events from the AI service straight to the browser. */
  @Post()
  async chat(@Req() req: Request & { user: { id: string } }, @Body() dto: ChatDto, @Res() res: Response) {
    const upstream = await this.ai.request('/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: req.user.id,
        question: dto.question,
        history: dto.history ?? [],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ message: 'AI service error' });
      return;
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const reader = upstream.body.getReader();
    req.on('close', () => reader.cancel().catch(() => undefined));
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      res.end();
    }
  }
}
