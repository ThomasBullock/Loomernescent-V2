import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';

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
}

// async login();
