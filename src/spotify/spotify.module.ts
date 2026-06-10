import { Global, Module } from '@nestjs/common';
import { SpotifyService } from './spotify.service';

@Global()
@Module({
  providers: [SpotifyService],
  exports: [SpotifyService],
})
export class SpotifyModule {}
