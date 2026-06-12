import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./user.entity";
import { Band } from "./band.entity";
import { Album } from "./album.entity";
import { Pedal } from "./pedal.entity";

@Entity("favourites")
@Unique(["user", "band"])
@Unique(["user", "album"])
@Unique(["user", "pedal"])
export class Favourite {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.favourites, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => Band, (band) => band.favourites, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "band_id" })
  band: Band;

  @Column({ name: "band_id", nullable: true })
  bandId: string;

  @ManyToOne(() => Album, (album) => album.favourites, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "album_id" })
  album: Album;

  @Column({ name: "album_id", nullable: true })
  albumId: string;

  @ManyToOne(() => Pedal, (pedal) => pedal.favourites, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "pedal_id" })
  pedal: Pedal;

  @Column({ name: "pedal_id", nullable: true })
  pedalId: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;
}
