import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Band } from "./band.entity";
import { Favourite } from "./favourite.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: "password_hash", nullable: true, select: false })
  passwordHash: string;

  @Column({ name: "reset_password_token", nullable: true, select: false })
  resetPasswordToken: string;

  @Column({ type: "timestamp", name: "reset_password_expires", nullable: true })
  resetPasswordExpires: Date;

  @Column({ default: false })
  admin: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => Band, (band) => band.author)
  authoredBands: Band[];

  @OneToMany(() => Favourite, (fav) => fav.user)
  favourites: Favourite[];
}
