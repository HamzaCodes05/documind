import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
    const normalized = email.toLowerCase();
    if (await this.users.findOne({ where: { email: normalized } })) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.users.save(
      this.users.create({ email: normalized, passwordHash: await bcrypt.hash(password, 10) }),
    );
    return this.token(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.token(user);
  }

  private async token(user: User) {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email }),
      user: { id: user.id, email: user.email },
    };
  }
}
