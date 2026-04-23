import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User, Band, Album, Pedal, Favourite } from './entities';
import { BandsModule } from './bands/bands.module';
import { AlbumsModule } from './albums/albums.module';
import { PedalsModule } from './pedals/pedals.module';
import { TemplateLocalsMiddleware } from './common/middleware/template-locals.middleware';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL'),
        ssl: { rejectUnauthorized: false },
        entities: [User, Band, Album, Pedal, Favourite],
        synchronize: false,
      }),
    }),
    BandsModule,
    AlbumsModule,
    PedalsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TemplateLocalsMiddleware).forRoutes('*');
  }
}
