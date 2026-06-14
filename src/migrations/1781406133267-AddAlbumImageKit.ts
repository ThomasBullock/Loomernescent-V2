import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlbumImageKit1781406133267 implements MigrationInterface {
    name = 'AddAlbumImageKit1781406133267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "albums" DROP COLUMN "cover"`);
        await queryRunner.query(`ALTER TABLE "albums" ADD "image_file_id" text`);
        await queryRunner.query(`ALTER TABLE "albums" ADD "image_path" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "albums" DROP COLUMN "image_path"`);
        await queryRunner.query(`ALTER TABLE "albums" DROP COLUMN "image_file_id"`);
        await queryRunner.query(`ALTER TABLE "albums" ADD "cover" character varying`);
    }

}
