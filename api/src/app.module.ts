import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/user.entity';
import { ChatController } from './chat/chat.controller';
import { DocumentsController } from './documents/documents.controller';
import { AiClient } from './ai-client.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User],
      // Fine for a demo; use migrations in production.
      synchronize: true,
      retryAttempts: 10,
      retryDelay: 3000,
    }),
    AuthModule,
  ],
  controllers: [DocumentsController, ChatController],
  providers: [AiClient],
})
export class AppModule {}
