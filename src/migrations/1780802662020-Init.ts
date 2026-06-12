import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1780802662020 implements MigrationInterface {
  name = "Init1780802662020";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pedals" DROP COLUMN "image"`);
    await queryRunner.query(`ALTER TABLE "pedals" ADD "image_file_id" text`);
    await queryRunner.query(`ALTER TABLE "pedals" ADD "image_path" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "pedals" DROP COLUMN "image_path"`);
    await queryRunner.query(`ALTER TABLE "pedals" DROP COLUMN "image_file_id"`);
    await queryRunner.query(`ALTER TABLE "pedals" ADD "image" character varying`);
  }
}
