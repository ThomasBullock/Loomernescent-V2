import { MigrationInterface, QueryRunner } from 'typeorm';

export class BandImagesCleanup1780900000000 implements MigrationInterface {
  name = 'BandImagesCleanup1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bands" DROP COLUMN "photo_square_lg"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bands" DROP COLUMN "photo_square_sm"`,
    );
    await queryRunner.query(`ALTER TABLE "bands" DROP COLUMN "photo_gallery"`);
    await queryRunner.query(
      `ALTER TABLE "bands" DROP COLUMN "photo_gallery_thumbs"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bands" ADD "gallery" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bands" DROP COLUMN "gallery"`);
    await queryRunner.query(
      `ALTER TABLE "bands" ADD "photo_gallery_thumbs" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bands" ADD "photo_gallery" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "bands" ADD "photo_square_sm" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "bands" ADD "photo_square_lg" character varying`,
    );
  }
}
