import {
  BadGatewayException,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiClient } from '../ai-client.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('documents')
@UseGuards(JwtGuard)
export class DocumentsController {
  constructor(private readonly ai: AiClient) {}

  private async unwrap(res: Response) {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new HttpException(body.detail ?? 'AI service error', res.status);
    }
    return body;
  }

  @Get()
  async list(@Req() req: { user: { id: string } }) {
    const res = await this.ai
      .request(`/documents?user_id=${encodeURIComponent(req.user.id)}`)
      .catch(() => {
        throw new BadGatewayException('AI service unreachable');
      });
    return this.unwrap(res);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@Req() req: { user: { id: string } }, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new HttpException('file is required', 400);
    const form = new FormData();
    form.append('user_id', req.user.id);
    form.append('file', new Blob([new Uint8Array(file.buffer)]), file.originalname);
    const res = await this.ai.request('/ingest', { method: 'POST', body: form }).catch(() => {
      throw new BadGatewayException('AI service unreachable');
    });
    return this.unwrap(res);
  }

  @Delete(':id')
  async remove(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    const res = await this.ai
      .request(`/documents/${encodeURIComponent(id)}?user_id=${encodeURIComponent(req.user.id)}`, {
        method: 'DELETE',
      })
      .catch(() => {
        throw new BadGatewayException('AI service unreachable');
      });
    return this.unwrap(res);
  }
}
