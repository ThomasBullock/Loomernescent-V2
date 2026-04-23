import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1776918592183 implements MigrationInterface {
    name = 'Init1776918592183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_salt"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "password_salt" character varying`);
    }

}
