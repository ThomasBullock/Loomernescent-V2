import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { PassportModule } from '@nestjs/passport';
import { SessionSerializer } from './session.serializer';

@Module({
  //  every module that injects a repository must declare the entity in TypeOrmModule.forFeature([...]) in its own imports
  imports: [
    TypeOrmModule.forFeature([User]),
    // 1. Makes AuthGuard available @UseGuards(AuthGuard('local'))
    // The guard that triggers your LocalStrategy on POST /login — only works if PassportModule is imported in the same module.
    // Without it you get a runtime error when the guard tries to resolve.

    // 2. Configures Passport's session mode When you call PassportModule.register({ session: true })
    // it tells Passport to use serializeUser/deserializeUser (your SessionSerializer) rather than stateless mode.
    // Without this, sessions don't persist between requests.
    PassportModule.register({ session: true }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, SessionSerializer],
})
export class AuthModule {}
