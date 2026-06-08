import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBandImageKit1780828464348 implements MigrationInterface {
  name = 'AddBandImageKit1780828464348';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bands" ADD "image_file_id" text`);
    await queryRunner.query(`ALTER TABLE "bands" ADD "image_path" text`);
    await queryRunner.query(
      `ALTER TABLE "pedals" ALTER COLUMN "used_by" SET DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pedals" ALTER COLUMN "used_by" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "bands" DROP COLUMN "image_path"`);
    await queryRunner.query(`ALTER TABLE "bands" DROP COLUMN "image_file_id"`);
  }
}
