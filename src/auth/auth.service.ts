import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { MoreThan, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) return null;
    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hash = await bcrypt.hash(password, 12);
    const user = this.userRepo.create({
      name,
      email,
      passwordHash: hash,
    });
    return this.userRepo.save(user);
  }

  async setResetToken(user: User): Promise<string> {
    const token = randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_LIFETIME_MS);
    await this.userRepo.save(user);
    return token;
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOneBy({
      resetPasswordToken: token,
      resetPasswordExpires: MoreThan(new Date()),
    });
  }

  async resetPassword(user: User, newPassword: string): Promise<User> {
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null as unknown as string;
    user.resetPasswordExpires = null as unknown as Date;
    return this.userRepo.save(user);
  }

  async updateProfile(
    user: User,
    updates: { name: string; email: string },
  ): Promise<User> {
    if (updates.email !== user.email) {
      const existing = await this.findByEmail(updates.email);
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Email already in use');
      }
    }
    user.name = updates.name;
    user.email = updates.email;
    return this.userRepo.save(user);
  }
}
