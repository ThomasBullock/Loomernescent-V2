import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
// passport-local, there are no configuration options, so our constructor simply calls super()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}

/*
the flow is:

Browser POSTs email + password
LocalAuthGuard triggers passport.authenticate('local')
Passport pulls req.body.email (because of usernameField: 'email') and req.body.password
LocalStrategy.validate runs AuthService.validateUser (bcrypt compare)
If bad: strategy throws UnauthorizedException → caught by LoginExceptionFilter → flash + redirect /auth/login
If good: strategy returns user → Passport assigns req.user and (because session: true) calls req.login() which runs SessionSerializer.serializeUser to write userId into req.session.passport.user
Controller handler runs and redirects to /
On the next request, passport.session() middleware reads the session cookie and calls SessionSerializer.deserializeUser(userId) to load the user, populating req.user for the rest of the request

*/
