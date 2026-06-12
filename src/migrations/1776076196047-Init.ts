import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1776076196047 implements MigrationInterface {
  name = "Init1776076196047";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "pedals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "brand" character varying NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "pedal_type" character varying, "pedal_type2" character varying, "used_by" jsonb, "associated_band_id" uuid, "years_manufactured" TIMESTAMP array NOT NULL DEFAULT '{}', "image" character varying, "comments" text, "youtube" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f780a15107818c1e2bceb0e4939" UNIQUE ("slug"), CONSTRAINT "PK_206ad1dfe1f64fa986f50aa5c65" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "favourites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "band_id" uuid, "album_id" uuid, "pedal_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c3cfab77d5e573200a7ad239ac9" UNIQUE ("user_id", "pedal_id"), CONSTRAINT "UQ_e659a5070f04784f807cec55110" UNIQUE ("user_id", "album_id"), CONSTRAINT "UQ_a94ee4b3fcdacabba623972a60b" UNIQUE ("user_id", "band_id"), CONSTRAINT "PK_173e5d5cc35490bf1de2d2d3739" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "albums" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "slug" character varying NOT NULL, "release_date" TIMESTAMP, "artist" character varying NOT NULL, "band_id" uuid NOT NULL, "cover" character varying, "producer" text array NOT NULL DEFAULT '{}', "engineer" text array NOT NULL DEFAULT '{}', "mixed_by" text array NOT NULL DEFAULT '{}', "label" character varying, "tracks" text array NOT NULL DEFAULT '{}', "spotify_url" character varying, "bandcamp_url" character varying, "comments" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_95d212fead2c16a7b517c8f55fc" UNIQUE ("slug"), CONSTRAINT "PK_838ebae24d2e12082670ffc95d7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "bands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "description" text, "labels" text array NOT NULL DEFAULT '{}', "personnel" text array NOT NULL DEFAULT '{}', "past_personnel" text array NOT NULL DEFAULT '{}', "tags" text array NOT NULL DEFAULT '{}', "years_active" TIMESTAMP array NOT NULL DEFAULT '{}', "created" TIMESTAMP NOT NULL DEFAULT now(), "location_address" character varying, "location_lng" double precision, "location_lat" double precision, "photo_square_lg" character varying, "photo_square_sm" character varying, "photo_gallery" text array NOT NULL DEFAULT '{}', "photo_gallery_thumbs" text array NOT NULL DEFAULT '{}', "youtube_pl" character varying, "vimeo_pl" character varying, "spotify_id" character varying, "spotify_url" character varying, "author_id" uuid NOT NULL, CONSTRAINT "UQ_3d28172ecc4ec80e1d376712262" UNIQUE ("slug"), CONSTRAINT "PK_9355783ed6ad7f73a4d6fe50ea1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "password_hash" character varying, "password_salt" character varying, "reset_password_token" character varying, "reset_password_expires" TIMESTAMP, "admin" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "pedals" ADD CONSTRAINT "FK_065aa747db521c33c9a68a67c6c" FOREIGN KEY ("associated_band_id") REFERENCES "bands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" ADD CONSTRAINT "FK_ffb0866c42b7ff4d6e5131f3dcc" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" ADD CONSTRAINT "FK_8cf107d5585a5010599dba5d90d" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" ADD CONSTRAINT "FK_93896b016bd1227d5053c68d8f3" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" ADD CONSTRAINT "FK_89134f20ac10a30b870d21d6441" FOREIGN KEY ("pedal_id") REFERENCES "pedals"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "albums" ADD CONSTRAINT "FK_e7f0c9810c413c6bda257317b5e" FOREIGN KEY ("band_id") REFERENCES "bands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bands" ADD CONSTRAINT "FK_2cbf614a12388fc86ed6b3623c2" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bands" DROP CONSTRAINT "FK_2cbf614a12388fc86ed6b3623c2"`);
    await queryRunner.query(
      `ALTER TABLE "albums" DROP CONSTRAINT "FK_e7f0c9810c413c6bda257317b5e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" DROP CONSTRAINT "FK_89134f20ac10a30b870d21d6441"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" DROP CONSTRAINT "FK_93896b016bd1227d5053c68d8f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" DROP CONSTRAINT "FK_8cf107d5585a5010599dba5d90d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favourites" DROP CONSTRAINT "FK_ffb0866c42b7ff4d6e5131f3dcc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pedals" DROP CONSTRAINT "FK_065aa747db521c33c9a68a67c6c"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "bands"`);
    await queryRunner.query(`DROP TABLE "albums"`);
    await queryRunner.query(`DROP TABLE "favourites"`);
    await queryRunner.query(`DROP TABLE "pedals"`);
  }
}
