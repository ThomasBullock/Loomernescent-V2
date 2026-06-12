import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Album } from "./album.entity";
import { Pedal } from "./pedal.entity";
import { Favourite } from "./favourite.entity";

@Entity("bands")
export class Band {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column("text", { array: true, default: "{}" })
  labels: string[];

  @Column("text", { array: true, default: "{}" })
  personnel: string[];

  @Column("text", { array: true, default: "{}", name: "past_personnel" })
  pastPersonnel: string[];

  @Column("text", { array: true, default: "{}" })
  tags: string[];

  @Column("timestamp", { array: true, default: "{}", name: "years_active" })
  yearsActive: Date[];

  @CreateDateColumn()
  created: Date;

  @Column({ name: "location_address", nullable: true })
  locationAddress: string;

  @Column({ type: "float", name: "location_lng", nullable: true })
  locationLng: number;

  @Column({ type: "float", name: "location_lat", nullable: true })
  locationLat: number;

  @Column({ name: "image_file_id", type: "text", nullable: true })
  imageFileId: string | null;

  @Column({ name: "image_path", type: "text", nullable: true })
  imagePath: string | null;

  @Column({ type: "jsonb", default: () => "'[]'" })
  gallery: { fileId: string; filePath: string }[];

  @Column({ name: "youtube_pl", nullable: true })
  youtubePl: string;

  @Column({ name: "vimeo_pl", nullable: true })
  vimeoPl: string;

  @Column({ name: "spotify_id", nullable: true })
  spotifyId: string;

  @Column({ name: "spotify_url", nullable: true })
  spotifyUrl: string;

  @ManyToOne(() => User, (user) => user.authoredBands)
  @JoinColumn({ name: "author_id" })
  author: User;

  @Column({ name: "author_id" })
  authorId: string;

  @OneToMany(() => Album, (album) => album.band)
  albums: Album[];

  @OneToMany(() => Pedal, (pedal) => pedal.associatedBand)
  pedals: Pedal[];

  @OneToMany(() => Favourite, (fav) => fav.band)
  favourites: Favourite[];
}
