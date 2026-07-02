import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { User, Band, Album, Pedal, Favourite } from "./entities";
import { BandsModule } from "./bands/bands.module";
import { AlbumsModule } from "./albums/albums.module";
import { PedalsModule } from "./pedals/pedals.module";
import { FavouritesModule } from "./favourites/favourites.module";
import { TagsModule } from "./tags/tags.module";
import { TemplateLocalsMiddleware } from "./common/middleware/template-locals.middleware";
import { ImagesModule } from "./common/images/images.module";
import { AuthModule } from "./auth/auth.module";
import { MailModule } from "./mail/mail.module";
import { SpotifyModule } from "./spotify/spotify.module";
import { shouldUseSsl } from "./configure-app";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres" as const,
        url: config.get("DATABASE_URL"),
        ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
        entities: [User, Band, Album, Pedal, Favourite],
        synchronize: false,
      }),
    }),
    ImagesModule,
    BandsModule,
    AlbumsModule,
    PedalsModule,
    FavouritesModule,
    TagsModule,
    AuthModule,
    MailModule,
    SpotifyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TemplateLocalsMiddleware).forRoutes("*");
  }
}
